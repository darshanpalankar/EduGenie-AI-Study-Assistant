import json
import logging
import os
import re
import threading
import time
import uuid
import socket

import httpx
from flask import Flask, render_template, request, jsonify, session
from google import genai

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("edugenie")

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

_IDENTITY_INSTRUCTION = (
    "You are EduGenie - AI Study Assistant. "

    "Developers: 1. Darshan Palankar, 2. Priyesh Kondvilkar. "
    "Are the Computer Science students at Patkar-Varde College , Goregaon, Mumbai. "

    "When the user asks about yourself, such as 'explain yourself', "
    "'who are you?', 'tell me about yourself', 'what is EduGenie?', "
    "or similar questions about your identity, explain that you are "
    "EduGenie - AI Study Assistant "

    "When the user asks specifically about the developers, creators, "
    "or development team, provide the developer names. "

    "Do not mention the developer names during normal conversation, "
    "greetings, casual questions, study questions, explanations, or "
    "other responses unless the user asks about yourself/identity or "
    "explicitly asks about the developers. "

    "Do not make up, infer, or invent any information about the developers. "

    "Do not tell the user that you are Gemini or Google Gemini. "
    "You are EduGenie - AI Study Assistant. "
)

# Used by the AI Chat page (/api/chat). Conversational, markdown allowed.
AI_CHAT_SYSTEM_INSTRUCTION = (
    _IDENTITY_INSTRUCTION +
    "You are EduGenie's AI Chat assistant, a general-purpose study and conversation helper. "
    "You may use markdown formatting such as **bold**, bullet points (-), "
    "and numbered lists to make responses clear and easy to read. "
    "Keep lists tight with no blank lines between list items. "
    "If the user asks for code as part of the conversation, you may include "
    "it in a fenced code block along with explanation, since this is a "
    "chat context, not the dedicated Code Generator."
)

# Used by the Code Generator page (/api/generate). Code-only, no prose.
CODE_GEN_SYSTEM_INSTRUCTION = (
    _IDENTITY_INSTRUCTION +
    "EduGenie - Code Generator: When the user requests code, generate clean, "
    "correct, readable, and complete code that directly addresses the "
    "user's request. "
    "Respond with only the code. Do not include markdown code fences, "
    "explanations, introductions, conclusions, or any additional text. "
    "Do not add explanations unless the user explicitly asks for an "
    "explanation."
)

# Used by the Math Solver page (/api/math-solve). Strict JSON, step-by-step.
MATH_SOLVER_SYSTEM_INSTRUCTION = (
    _IDENTITY_INSTRUCTION +
    "You are EduGenie's Math Solver. Given a math problem and, optionally, "
    "a topic (algebra, calculus, geometry, trigonometry, statistics, or "
    "auto), solve it and show your work as a sequence of clear steps. "
    "Respond with strict JSON only, no markdown, no code fences, no text "
    "outside the JSON object, in exactly this shape: "
    '{"steps": [{"title": string, "body": string, "math": string}], '
    '"answer": {"text": string, "math": string}}. '
    "Keep each step's body to one or two sentences explaining the "
    "reasoning in plain English. Put every mathematical expression in the "
    "'math' field as raw LaTeX (no $ or \\( \\) delimiters) - the frontend "
    "renders it with KaTeX. Leave 'math' as an empty string on a step that "
    "has no expression to show. The 'answer.math' field must contain the "
    "final simplified result in LaTeX, and 'answer.text' a short plain-"
    "English restatement of it."
)

gemini_models = [
    'gemini-3.5-flash-lite',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-2.5-flash'
    ]

_ai_chats_ = {}
_ai_chats_lock = threading.Lock()

_code_chats_ = {}
_code_chats_lock = threading.Lock()


def clean_text(text):
    """
    
    Strips an outer markdown code-fence wrapper (```lang ... ```) if the
    model added one despite being told not to. Only touches the fence
    markers themselves - it no longer blanket-removes every '*' and '`'
    character, since that was corrupting real code (e.g. *args, **kwargs,
    pointer syntax, multiplication, JS template literals).
    
    """
    text = (text or "").strip()
    text = re.sub(r"^```[a-zA-Z0-9]*\n?", "", text)
    text = re.sub(r"\n?```$", "", text)
    return text.strip()

RETRYABLE_EXCEPTIONS = (
    httpx.ConnectError,
    httpx.RemoteProtocolError,
    httpx.ReadError,
    httpx.ReadTimeout,
    httpx.ConnectTimeout,
    httpx.WriteError,
)


def call_with_retry(func, *args, max_attempts=3, base_delay=1.0, **kwargs):
    """
    Runs func(*args, **kwargs), retrying with exponential backoff if a
    transient network/SSL error is hit. Non-transient errors (bad API key,
    quota exhausted, invalid request) are raised immediately, no retry.

    """
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
    """
    Shared error translator so every /api/* route reports the same
    user-facing messages for the same underlying failures.
    
    """
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


_genai_client = None
_genai_client_lock = threading.Lock()


def get_genai_client():
    """
    Returns a single shared genai.Client, created once and reused across
    every request. Building a new client per call (as this used to do for
    Quiz/Notes/MCQs) adds avoidable setup overhead - and loses HTTP
    keep-alive - on every single generation, which is part of why response
    times could feel randomly slow. Lock guards against two concurrent
    requests both racing to create it on first use.
    
    """
    global _genai_client
    if _genai_client is None:
        with _genai_client_lock:
            if _genai_client is None:
                api_key = os.getenv("GENAI_API_KEY")
                if not api_key:
                    raise RuntimeError("GENAI_API_KEY environment variable not set.")
                _genai_client = genai.Client(api_key=api_key)
    return _genai_client


def parse_json_response(raw_text):
    """
    Gemini is asked to return raw JSON, but if it wraps the payload in
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
    """
    Rough token budget so longer quizzes/MCQ sets don't get cut off
    mid-response, which is the usual cause of 'Expecting X delimiter' JSON
    errors (the payload is truncated, not actually malformed).
    
    """
    return base + (per_question_tokens * max(1, int(num_questions or 1)))

# Class -> Powers the AI Chat page
class AI_Chat:
    """
    Wraps the Gemini chat session lifecycle for the AI Chat page
    (create/reuse/reset per Flask session). Uses its own session_id key
    and its own _ai_chats_ store so it never shares conversation history
    or system instruction with the Code Generator.
    """

    MODEL = "gemini-3.5-flash-lite"

    def __init__(self):
        self.name = "EduGenie - AI Chat"

    def get_client(self):
        return get_genai_client()

    def _session_key(self):
        if "ai_chat_session_id" not in session:
            session["ai_chat_session_id"] = str(uuid.uuid4())
        return session["ai_chat_session_id"]

    def get_chat(self):
        session_id = self._session_key()

        if session_id not in _ai_chats_:
            with _ai_chats_lock:
                if session_id not in _ai_chats_:
                    client = self.get_client()
                    chat_obj = client.chats.create(
                        model=self.MODEL,
                        config={"system_instruction": AI_CHAT_SYSTEM_INSTRUCTION},
                    )
                    _ai_chats_[session_id] = {"client": client, "chat": chat_obj}

        return _ai_chats_[session_id]["chat"]

    def reset_chat(self):
        session_id = session.get("ai_chat_session_id")
        if session_id and session_id in _ai_chats_:
            with _ai_chats_lock:
                _ai_chats_.pop(session_id, None)

    def send_message(self, message):
        """
        Returns Gemini's raw markdown text (bold, bullets, fenced code
        blocks, etc. all survive) so the frontend's marked.js + DOMPurify
        pipeline can render it.
        """
        chat = self.get_chat()
        response = call_with_retry(chat.send_message, message)
        return clean_text(response.text)


# Class -> Generates code
class CodeGenerator:
    """
    Wraps the Gemini chat session lifecycle for the Code Generator page
    (create/reuse/reset per Flask session). Uses its own session_id key
    and its own _code_chats_ store so it never shares conversation history
    or system instruction with AI Chat.
    """

    MODEL = "gemini-2.5-flash"

    def __init__(self):
        self.name = "EduGenie - Code Generator"

    def get_client(self):
        return get_genai_client()

    def _session_key(self):
        if "code_session_id" not in session:
            session["code_session_id"] = str(uuid.uuid4())
        return session["code_session_id"]

    def get_chat(self):
        session_id = self._session_key()

        if session_id not in _code_chats_:
            with _code_chats_lock:
                if session_id not in _code_chats_:
                    client = self.get_client()
                    chat_obj = client.chats.create(
                        model=self.MODEL,
                        config={"system_instruction": CODE_GEN_SYSTEM_INSTRUCTION},
                    )
                    _code_chats_[session_id] = {"client": client, "chat": chat_obj}

        return _code_chats_[session_id]["chat"]

    def reset_chat(self):
        session_id = session.get("code_session_id")
        if session_id and session_id in _code_chats_:
            with _code_chats_lock:
                _code_chats_.pop(session_id, None)

    def send_message(self, message):
        """
        Strips markdown/code-fence characters via clean_text() so raw
        code comes back clean, with no prose around it.
        """
        chat = self.get_chat()
        response = call_with_retry(chat.send_message, message)
        return clean_text(response.text)


# Class -> Generates The Quizz
class QuizzGenerator:
    """
    Generates a short, open-ended-answer quiz on a topic using Gemini.
    
    """

    MODEL = "gemini-3.6-flash"

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
    """
    Generates structured plain-text study notes on a topic using Gemini.
    
    """

    MODEL = "gemini-3.6-flash"

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
    """
    Generates multiple-choice questions (with options + correct answer) using Gemini.
    
    """

    MODEL = "gemini-3.6-flash"

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

# Class -> Solves math problems step by step
class MathSolver:
    """
    Solves a single math problem and returns a step-by-step breakdown plus
    a final answer, both as strict JSON. Stateless like QuizzGenerator/
    MCQsGenerator - each call is independent, there's no running chat
    session to isolate or reset.
    """

    MODEL = "gemini-3.6-flash"

    SYSTEM_INSTRUCTION = MATH_SOLVER_SYSTEM_INSTRUCTION

    def __init__(self):
        self.name = "EduGenie - Math Solver"

    def get_client(self):
        return get_genai_client()

    def solve(self, problem, topic="auto"):
        client = self.get_client()
        prompt = (
            f"Topic: {topic}\n"
            f"Problem: {problem}\n"
            "Solve this now."
        )
        config = {
            "system_instruction": self.SYSTEM_INSTRUCTION,
            "response_mime_type": "application/json",
            "max_output_tokens": estimate_max_output_tokens(1, per_question_tokens=600, base=300),
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
                logger.warning("Math Solver JSON parse attempt %s/2 failed, retrying.", attempt)
        raise last_error


ai_chat_generator = AI_Chat()
generator = CodeGenerator()
quiz_generator = QuizzGenerator()
notes_generator = NotesGenerator()
mcqs_generator = MCQsGenerator()
math_solver_generator = MathSolver()


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
def quiz_generator_page():
    return render_template("quiz_generator.html")


@app.route("/math-solver")
def math_solver_page():
    return render_template("maths-solver.html")


@app.route("/api/chat", methods=["POST"])
def chat():
    """
    AI Chat page. Backed by AI_Chat - its own Gemini session, its own
    system instruction.
    """
    data = request.get_json(silent=True) or {}
    user_message = (data.get("message") or "").strip()

    if not user_message:
        return jsonify({"error": "Message cannot be empty."}), 400

    try:
        reply = ai_chat_generator.send_message(user_message)
        return jsonify({"reply": reply})
    except Exception as e:
        logger.exception("Error while generating a chat response")
        return jsonify({"error": friendly_error_message(e)}), 500


@app.route("/api/generate", methods=["POST"])
def generate_code():
    """
    Code Generator page. Backed by CodeGenerator - its own Gemini
    session, its own system instruction, completely isolated from AI Chat.
    """

    data = request.get_json(silent=True) or {}
    user_message = (data.get("message") or "").strip()

    if not user_message:
        return jsonify({"error": "Message cannot be empty."}), 400

    try:
        reply = generator.send_message(user_message)
        return jsonify({"reply": reply})
    except Exception as e:
        logger.exception("Error while generating code")
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


@app.route("/api/math-solve", methods=["POST"])
def solve_math():
    data = request.get_json(silent=True) or {}
    problem = (data.get("problem") or "").strip()

    if not problem:
        return jsonify({"error": "Please enter a problem to solve."}), 400

    topic = (data.get("topic") or "auto").strip() or "auto"

    try:
        solution = math_solver_generator.solve(problem, topic=topic)
        return jsonify(solution)
    except Exception as e:
        logger.exception("Error while solving a math problem")
        return jsonify({"error": friendly_error_message(e)}), 500


@app.route("/api/reset", methods=["POST"])
def reset():
    """
    Resets chat history. Accepts an optional {"type": "chat" | "code"}
    body to reset just one page's session; with no body (or an unknown
    type) both are reset, since AI Chat and Code Generator now keep
    fully separate sessions and won't affect each other either way.
    """
    data = request.get_json(silent=True) or {}
    reset_type = (data.get("type") or "").strip().lower()

    if reset_type == "chat":
        ai_chat_generator.reset_chat()
        session.pop("ai_chat_session_id", None)
    elif reset_type == "code":
        generator.reset_chat()
        session.pop("code_session_id", None)
    else:
        ai_chat_generator.reset_chat()
        generator.reset_chat()
        session.pop("ai_chat_session_id", None)
        session.pop("code_session_id", None)

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

    app.run(host="0.0.0.0", port=port, debug=debug, threaded=True)