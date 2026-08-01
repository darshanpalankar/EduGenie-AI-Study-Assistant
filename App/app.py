import json
import logging
import os
import time
import uuid
import socket

import httpx
from flask import Flask, render_template, request, jsonify, session
from google import genai

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("edugenie")

# Quiet the noisy request-level logs (Flask/Werkzeug per-request GET/POST lines,
# httpx's "HTTP Request: POST ..." lines, and google_genai's AFC notices) while
# keeping our own "edugenie" logger at INFO.
logging.getLogger("werkzeug").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("google_genai").setLevel(logging.WARNING)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, "templates"),
    static_folder=os.path.join(BASE_DIR, "static"),
)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev-secret-key-change-me")

# NOTE: Gemini is now allowed to use markdown for normal conversational
# answers (bold, bullet points, numbered lists) so the AI Chat page can
# render nicely formatted responses. It's still told to output plain,
# unformatted code when the user explicitly asks for code - that path
# (Code Generator page) strips formatting anyway via clean_text().

SYSTEM_INSTRUCTION = (
    "You are EduGenie - AI Study Assistant. "
    "For normal conversational answers, feel free to use markdown formatting "
    "such as **bold**, bullet points (-), and numbered lists to make responses "
    "clear and easy to read. Keep lists tight: no blank line between list items. "
    "Only respond with plain, unformatted text when the user explicitly asks "
    "for code or a code snippet - in that case, output only the code with no "
    "markdown fences or extra formatting."
    "EduGenie - Code Generator: When the user asks for code, respond with only the code snippet, "
)

gemini_models = [
    'gemini-3.5-flash-lite',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-2.5-pro',
    'gemini-2.5-flash'
    ]

_chats_ = {}


def clean_text(text):
    return (
        (text or "")
        .replace("```", "")
        .replace("**", "")
        .replace("`", "")
        .replace("*", "")
    )


# Network-level failures that are usually transient (dropped connection,
# SSL handshake interrupted mid-request, server closing the socket early).
# Worth a short automatic retry, unlike a bad API key or a genuine error
# response from Gemini.
RETRYABLE_EXCEPTIONS = (
    httpx.ConnectError,
    httpx.RemoteProtocolError,
    httpx.ReadError,
    httpx.ReadTimeout,
    httpx.ConnectTimeout,
    httpx.WriteError,
)


def call_with_retry(func, *args, max_attempts=3, base_delay=1.0, **kwargs):
    """Runs func(*args, **kwargs), retrying with exponential backoff if a
    transient network/SSL error is hit. Non-transient errors (bad API key,
    quota exhausted, invalid request) are raised immediately, no retry."""
    last_exc = None
    for attempt in range(1, max_attempts + 1):
        try:
            return func(*args, **kwargs)
        except RETRYABLE_EXCEPTIONS as exc:
            last_exc = exc
            if attempt == max_attempts:
                break
            wait = base_delay * (2 ** (attempt - 1))
            logger.warning(
                "Transient error calling Gemini (attempt %s/%s): %s. Retrying in %.1fs.",
                attempt, max_attempts, exc, wait,
            )
            time.sleep(wait)
    raise last_exc


def friendly_error_message(e):
    """Shared error translator so every /api/* route reports the same
    user-facing messages for the same underlying failures."""
    error_text = str(e)

    if isinstance(e, RETRYABLE_EXCEPTIONS) or any(
        marker in error_text for marker in ("SSL", "EOF occurred", "RemoteProtocolError", "ConnectError")
    ):
        return (
            "EduGenie couldn't reach the AI service right now. This is usually a "
            "network, VPN, antivirus, or firewall issue on this machine rather than "
            "a problem with your request - please check your connection and try again."
        )
    if "RESOURCE_EXHAUSTED" in error_text or "429" in error_text:
        return "EduGenie is out of wishes for now. Please try again in a minute."
    if "GENAI_API_KEY" in error_text:
        return "EduGenie isn't configured correctly.."
    if isinstance(e, ValueError) and "malformed JSON" in error_text:
        return (
            "EduGenie had trouble putting that quiz together, possibly because "
            "it's a large or complex request. Try fewer questions or a "
            "narrower topic, and try again."
        )
    return "Something went wrong. Please check your Internet Connection and try again."


def safe_int(value, default, min_value, max_value):
    try:
        value = int(value)
    except (TypeError, ValueError):
        return default
    return max(min_value, min(max_value, value))


def get_genai_client():
    api_key = os.getenv("GENAI_API_KEY")
    if not api_key:
        raise RuntimeError("GENAI_API_KEY environment variable not set.")
    return genai.Client(api_key=api_key)


def parse_json_response(raw_text):
    """Gemini is asked to return raw JSON, but if it wraps the payload in
    markdown fences or stray formatting anyway, clean_text() strips that
    before we parse.

    Raises ValueError (instead of the raw JSONDecodeError) on failure, with
    the offending text logged so truncated/malformed responses are
    diagnosable instead of just showing a bare traceback.
    """
    try:
        return json.loads(raw_text)
    except (TypeError, json.JSONDecodeError):
        pass

    try:
        return json.loads(clean_text(raw_text))
    except (TypeError, json.JSONDecodeError) as e:
        preview = (raw_text or "")
        logger.error(
            "Gemini returned invalid/incomplete JSON (%s). Response length: %s chars. "
            "Last 300 chars: %r",
            e, len(preview), preview[-300:],
        )
        raise ValueError("Gemini returned malformed JSON") from e


def estimate_max_output_tokens(num_questions, per_question_tokens=220, base=400):
    """Rough token budget so longer quizzes/MCQ sets don't get cut off
    mid-response, which is the usual cause of 'Expecting X delimiter' JSON
    errors (the payload is truncated, not actually malformed)."""
    return base + (per_question_tokens * max(1, int(num_questions or 1)))


# Class -> Generates code
class CodeGenerator:
    """Wraps the Gemini chat session lifecycle (create/reuse/reset per Flask session)."""

    def __init__(self):
        self.name = "EduGenie - Code Generator"

    def get_client(self):
        return get_genai_client()

    def get_chat(self):
        if "session_id" not in session:
            session["session_id"] = str(uuid.uuid4())

        session_id = session["session_id"]

        # SYSTEM_INSTRUCTION = (
        #     "You are EduGenie Code Generator."
        #     "Your task is to generate code only."
        #     "If the user's prompt is not related to programming,"
        #     "politely ask them to describe the programming problem instead of generating meaningless code."
        # )

        if session_id not in _chats_:
            client = self.get_client()
            chat_obj = client.chats.create(
                model="gemini-3.5-flash-lite",
                config={"system_instruction": SYSTEM_INSTRUCTION},
            )

            _chats_[session_id] = {"client": client, "chat": chat_obj}

        return _chats_[session_id]["chat"]

    def reset_chat(self):
        session_id = session.get("session_id")
        if session_id and session_id in _chats_:
            del _chats_[session_id]

    def send_message(self, message, markdown=False):
        """
        markdown=True  -> used by the AI Chat page. Returns Gemini's raw
                           text so bold, bullets, etc. survive and can
                           be rendered as HTML on the frontend.
        markdown=False -> used by the Code Generator page (default).
                           Strips markdown/code-fence characters via
                           clean_text() so raw code comes back clean.
        """
        chat = self.get_chat()
        response = call_with_retry(chat.send_message, message)
        return response.text if markdown else clean_text(response.text)


# Class -> Generates The Quizz
class QuizzGenerator:
    """Generates a short, open-ended-answer quiz on a topic using Gemini."""

    MODEL = "gemini-3.5-flash"

    SYSTEM_INSTRUCTION = (
        "You are EduGenie's Quiz Generator. Given a topic, a difficulty level, "
        "and a number of questions, generate a quiz. "
        "Respond with strict JSON only, no markdown, no code fences, no text "
        "outside the JSON object, in exactly this shape: "
        '{"topic": string, "difficulty": string, '
        '"questions": [{"question": string, "answer": string}]}'
    )

    def __init__(self):
        self.name = "EduGenie - Quizz Generator"

    def get_client(self):
        return get_genai_client()

    def generate(self, topic, num_questions=5, difficulty="medium"):
        client = self.get_client()
        prompt = (
            f"Topic: {topic}\n"
            f"Difficulty: {difficulty}\n"
            f"Number of questions: {num_questions}\n"
            "Generate the quiz now."
        )
        config = {
            "system_instruction": self.SYSTEM_INSTRUCTION,
            "response_mime_type": "application/json",
            "max_output_tokens": estimate_max_output_tokens(num_questions),
        }

        last_error = None
        for attempt in range(1, 3):
            response = call_with_retry(
                client.models.generate_content,
                model=self.MODEL,
                contents=prompt if attempt == 1 else prompt + (
                    "\n\nYour previous response was not valid, complete JSON. "
                    "Respond again with ONLY the complete, valid JSON object - "
                    "no truncation, no markdown, no extra text."
                ),
                config=config,
            )
            try:
                return parse_json_response(response.text)
            except ValueError as e:
                last_error = e
                logger.warning("Quiz JSON parse attempt %s/2 failed, retrying.", attempt)
        raise last_error


# Class -> Generates The Notes
class NotesGenerator:
    """Generates structured plain-text study notes on a topic using Gemini."""

    MODEL = "gemini-3.5-flash"

    SYSTEM_INSTRUCTION = (
        "You are EduGenie's Notes Generator. Given a topic and a detail level, "
        "produce clear, well-organized study notes as plain text. "
        "Structure the notes with short section headings followed by a colon, "
        "then concise lines starting with a dash for the key points under each "
        "heading. Do not use markdown symbols such as #, *, or backticks."
    )

    def __init__(self):
        self.name = "EduGenie - Notes Generator"

    def get_client(self):
        return get_genai_client()

    def generate(self, topic, detail_level="medium"):
        client = self.get_client()
        prompt = (
            f"Topic: {topic}\n"
            f"Detail level: {detail_level}\n"
            "Generate the study notes now."
        )
        response = call_with_retry(
            client.models.generate_content,
            model=self.MODEL,
            contents=prompt,
            config={"system_instruction": self.SYSTEM_INSTRUCTION},
        )
        return clean_text(response.text)


# Class -> Generates MCQs
class MCQsGenerator:
    """Generates multiple-choice questions (with options + correct answer) using Gemini."""

    MODEL = "gemini-3.5-flash"

    SYSTEM_INSTRUCTION = (
        "You are EduGenie's MCQ Generator. Given a topic, a difficulty level, "
        "and a number of questions, generate multiple-choice questions, each "
        "with exactly four options and one correct answer. "
        "Respond with strict JSON only, no markdown, no code fences, no text "
        "outside the JSON object, in exactly this shape: "
        '{"topic": string, "difficulty": string, "questions": '
        '[{"question": string, "options": [string, string, string, string], '
        '"correct_answer": string}]}. '
        "The correct_answer value must exactly match one of the strings in options."
    )

    def __init__(self):
        self.name = "EduGenie - MCQs Generator"

    def get_client(self):
        return get_genai_client()

    def generate(self, topic, num_questions=5, difficulty="medium"):
        client = self.get_client()
        prompt = (
            f"Topic: {topic}\n"
            f"Difficulty: {difficulty}\n"
            f"Number of questions: {num_questions}\n"
            "Generate the multiple-choice questions now."
        )
        # MCQs carry 4 options per question on top of the question text
        # itself, so give them a bit more headroom than the open-ended quiz.
        config = {
            "system_instruction": self.SYSTEM_INSTRUCTION,
            "response_mime_type": "application/json",
            "max_output_tokens": estimate_max_output_tokens(num_questions, per_question_tokens=280),
        }

        last_error = None
        for attempt in range(1, 3):
            response = call_with_retry(
                client.models.generate_content,
                model=self.MODEL,
                contents=prompt if attempt == 1 else prompt + (
                    "\n\nYour previous response was not valid, complete JSON. "
                    "Respond again with ONLY the complete, valid JSON object - "
                    "no truncation, no markdown, no extra text."
                ),
                config=config,
            )
            try:
                return parse_json_response(response.text)
            except ValueError as e:
                last_error = e
                logger.warning("MCQ JSON parse attempt %s/2 failed, retrying.", attempt)
        raise last_error

generator = CodeGenerator()
quiz_generator = QuizzGenerator()
notes_generator = NotesGenerator()
mcqs_generator = MCQsGenerator()


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/ai-chat")
def ai_chat():
    return render_template("ai_chat.html")


@app.route("/code-generator")
def code_generator():
    return render_template("code_generator.html")


@app.route("/notes-generator")
def note_generator():
    return render_template("notes_generator.html")


@app.route("/mcq-generator")
def mcq_generator():
    return render_template("mcq_generator.html")


@app.route("/quiz-generator")
def quiz_generator():
    return render_template("quiz_generator.html")


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    user_message = (data.get("message") or "").strip()
    use_markdown = bool(data.get("markdown"))

    if not user_message:
        return jsonify({"error": "Message cannot be empty."}), 400

    try:
        reply = generator.send_message(user_message, markdown=use_markdown)
        return jsonify({"reply": reply})
    except Exception as e:
        logger.exception("Error while generating a response")
        return jsonify({"error": friendly_error_message(e)}), 500


@app.route("/api/quiz", methods=["POST"])
def generate_quiz():
    data = request.get_json(silent=True) or {}
    topic = (data.get("topic") or "").strip()

    if not topic:
        return jsonify({"error": "Topic cannot be empty."}), 400

    num_questions = safe_int(data.get("num_questions"), default=5, min_value=1, max_value=20)
    difficulty = (data.get("difficulty") or "medium").strip() or "medium"

    try:
        quiz = quiz_generator.generate(topic, num_questions=num_questions, difficulty=difficulty)
        return jsonify(quiz)
    except Exception as e:
        logger.exception("Error while generating a quiz")
        return jsonify({"error": friendly_error_message(e)}), 500


@app.route("/api/notes", methods=["POST"])
def generate_notes():
    data = request.get_json(silent=True) or {}
    topic = (data.get("topic") or "").strip()

    if not topic:
        return jsonify({"error": "Topic cannot be empty."}), 400

    detail_level = (data.get("detail_level") or "medium").strip() or "medium"

    try:
        notes = notes_generator.generate(topic, detail_level=detail_level)
        return jsonify({"notes": notes})
    except Exception as e:
        logger.exception("Error while generating notes")
        return jsonify({"error": friendly_error_message(e)}), 500


@app.route("/api/mcqs", methods=["POST"])
def generate_mcqs():
    data = request.get_json(silent=True) or {}
    topic = (data.get("topic") or "").strip()

    if not topic:
        return jsonify({"error": "Topic cannot be empty."}), 400

    num_questions = safe_int(data.get("num_questions"), default=5, min_value=1, max_value=20)
    difficulty = (data.get("difficulty") or "medium").strip() or "medium"

    try:
        mcqs = mcqs_generator.generate(topic, num_questions=num_questions, difficulty=difficulty)
        return jsonify(mcqs)
    except Exception as e:
        logger.exception("Error while generating MCQs")
        return jsonify({"error": friendly_error_message(e)}), 500


@app.route("/api/reset", methods=["POST"])
def reset():
    generator.reset_chat()
    session.pop("session_id", None)
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"

    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        lan_ip = s.getsockname()[0]
        s.close()
    except OSError:
        lan_ip = None

    print(f" * EduGenie running at: http://127.0.0.1:{port}")
    if lan_ip:
        print(f" * View on your phone (same Wi-Fi): http://{lan_ip}:{port}")

    app.run(host="0.0.0.0", port=port, debug=debug)