/* ==========================================
   Home Page (index.html)
========================================== */

const homeMenuBtn = document.querySelector(".home-page .menu-btn");
const homeNavbar = document.querySelector(".home-page .navbar");

if (homeMenuBtn && homeNavbar) {
  homeMenuBtn.addEventListener("click", () => {
    homeNavbar.classList.toggle("active");
  });
}

const copyToClipboard = async (text) => {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  const succeeded = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!succeeded) throw new Error("execCommand copy failed");
};

/* ==========================================
   Chat Page (index.html)
========================================== */

const messagesEl = document.getElementById("messages");
const composerEl = document.getElementById("composer");
const inputEl = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const resetBtn = document.getElementById("resetBtn");

if (messagesEl && composerEl && inputEl && sendBtn) {
  if (window.marked) {
    marked.setOptions({ breaks: true, gfm: true });
  }

  const scrollToBottom = () => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  const addMessage = (role, text) => {
    const msg = document.createElement("div");
    msg.className = `msg ${role}`;

    if (role === "bot") {
      const orb = document.createElement("span");
      orb.className = "msg-orb";
      msg.appendChild(orb);
    }

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    if (role === "bot" && window.marked && window.DOMPurify) {
      bubble.innerHTML = DOMPurify.sanitize(marked.parse(text || ""));
    } else {
      bubble.textContent = text;
    }

    msg.appendChild(bubble);
    messagesEl.appendChild(msg);
    scrollToBottom();
    return msg;
  };

  const addThinkingIndicator = () => {
    const msg = document.createElement("div");
    msg.className = "msg bot thinking";
    msg.innerHTML = `
      <span class="msg-orb"></span>
      <div class="bubble">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      </div>
    `;
    messagesEl.appendChild(msg);
    scrollToBottom();
    return msg;
  };

  const addError = (text) => {
    const el = document.createElement("div");
    el.className = "error-text";
    el.textContent = text;
    messagesEl.appendChild(el);
    scrollToBottom();
  };

  const greetMsg = document.getElementById("greetMsg");

  const sendMessage = async (text) => {
    if (greetMsg) greetMsg.style.display = "none";

    addMessage("user", text);
    inputEl.value = "";
    sendBtn.disabled = true;

    const thinkingEl = addThinkingIndicator();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, markdown: true }),
      });

      const data = await res.json();
      thinkingEl.remove();

      if (!res.ok) {
        addError(data.error || "Something went wrong. Please try again.");
        return;
      }

      addMessage("bot", data.reply);
    } catch (err) {
      thinkingEl.remove();
      addError("Could not reach EduGenie. Check your connection and try again.");
    } finally {
      sendBtn.disabled = false;
      inputEl.focus();
    }
  };

  composerEl.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = inputEl.value.trim();
    if (!text) return;
    sendMessage(text);
  });

  if (resetBtn) {
    resetBtn.addEventListener("click", async () => {
      try {
        await fetch("/api/reset", { method: "POST" });
      } catch (err) {
        // ignore network errors on reset
      }
      messagesEl.innerHTML = "";
      addMessage("bot", "Fresh start. What are you studying today?");
      inputEl.focus();
    });
  }

  document.querySelectorAll(".suggestion-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const prompt = chip.dataset.prompt;
      if (prompt) sendMessage(prompt);
    });
  });

  inputEl.focus();
}

/* ==========================================
   Code Generator Page (code_generator.html)
========================================== */

const promptEl = document.querySelector(".prompt textarea");
const generateBtn = document.querySelector(".generate-btn");
const codeBox = document.querySelector(".code-box");

if (promptEl && generateBtn && codeBox) {

  const MAX_CHARS = 500;
  const counterEl = document.querySelector(".prompt .counter");
  const languageTagEl = document.querySelector(".language-tag");
  const actionButtons = document.querySelectorAll(".actions button");

  const LANGUAGE_EXTENSIONS = {
    Python: "py",
    JavaScript: "js",
    Java: "java",
    "C++": "cpp",
    Go: "go",
    Rust: "rs",
  };

  document.querySelectorAll(".dropdown").forEach((dropdown) => {
    const selectBox = dropdown.querySelector(".select-box");
    const menu = dropdown.querySelector(".dropdown-menu");
    if (!selectBox || !menu) return;

    selectBox.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.contains("open");
      document.querySelectorAll(".dropdown.open").forEach((d) => d.classList.remove("open"));
      if (!isOpen) dropdown.classList.add("open");
    });

    menu.querySelectorAll("li").forEach((item) => {
      item.addEventListener("click", () => {
        selectBox.dataset.value = item.dataset.value;
        const selectLeft = selectBox.querySelector(".select-left");
        if (selectLeft) selectLeft.innerHTML = item.innerHTML;
        dropdown.classList.remove("open");
      });
    });
  });

  document.addEventListener("click", () => {
    document.querySelectorAll(".dropdown.open").forEach((d) => d.classList.remove("open"));
  });

  const getSelectedValue = (name) => {
    const box = document.querySelector(`[data-dropdown="${name}"] .select-box`);
    return box ? box.dataset.value : "";
  };

  // Character counter
  promptEl.setAttribute("maxlength", String(MAX_CHARS));
  const updateCounter = () => {
    if (counterEl) counterEl.textContent = `${promptEl.value.length}/${MAX_CHARS}`;
  };
  promptEl.addEventListener("input", updateCounter);
  updateCounter();

  // Ensure there's a <pre><code> to write generated output into
  let codeEl = codeBox.querySelector("code");
  if (!codeEl) {
    const pre = document.createElement("pre");
    codeEl = document.createElement("code");
    pre.appendChild(codeEl);
    codeBox.appendChild(pre);
  }

  let lastDescription = "";

  const generateCode = async () => {
    const description = promptEl.value.trim();
    if (!description) {
      promptEl.focus();
      return;
    }

    const language = getSelectedValue("language") || "Python";
    const difficulty = getSelectedValue("difficulty");

    lastDescription = description;
    if (languageTagEl) languageTagEl.textContent = language;
    codeEl.textContent = "Generating...";
    generateBtn.disabled = true;

    const instructions = [
      `Write ${language} code for the following request:`,
      description,
      difficulty ? `Target difficulty: ${difficulty}.` : "",
      "Respond with only the code, no explanation, no markdown fences.",
    ].filter(Boolean).join(" ");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: instructions }),
      });

      const data = await res.json();

      if (!res.ok) {
        codeEl.textContent = data.error || "Something went wrong. Please try again.";
        return;
      }

      codeEl.textContent = data.reply;
    } catch (err) {
      codeEl.textContent = "Could not reach EduGenie. Check your connection and try again.";
    } finally {
      generateBtn.disabled = false;
    }
  };

  generateBtn.addEventListener("click", generateCode);

  actionButtons.forEach((btn) => {
    const label = btn.textContent.trim().toLowerCase();

    if (label.includes("copy")) {
      btn.addEventListener("click", async () => {
        if (!codeEl.textContent) return;
        try {
          await copyToClipboard(codeEl.textContent);
          const original = btn.innerHTML;
          btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied';
          setTimeout(() => {
            btn.innerHTML = original;
          }, 1500);
        } catch (err) {
          const original = btn.innerHTML;
          btn.innerHTML = '<i class="fa-solid fa-xmark"></i> Failed';
          setTimeout(() => {
            btn.innerHTML = original;
          }, 1500);
        }
      });
    }

    if (label.includes("download")) {
      btn.addEventListener("click", () => {
        if (!codeEl.textContent) return;
        const language = getSelectedValue("language") || "Python";
        const ext = LANGUAGE_EXTENSIONS[language] || "txt";
        const blob = new Blob([codeEl.textContent], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `generated-code.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    if (label.includes("regenerate")) {
      btn.addEventListener("click", () => {
        if (lastDescription) generateCode();
      });
    }
  });
}

/* ==========================================
   Quiz Generator Page (quizz_generator.html)
========================================== */

const topicInput = document.getElementById("topic-input");
const difficultySelect = document.getElementById("difficulty-select");
const numQuestionsSelect = document.getElementById("num-questions-select");
const quizGenerateBtn = document.getElementById("generate-btn");
const questionsContainer = document.getElementById("questions-container");
const questionCountLabel = document.getElementById("question-count-label");
const scoreLabel = document.getElementById("score-label");
const progressFill = document.getElementById("progress-fill");
const nextBtn = document.getElementById("next-btn");
const copyBtn = document.getElementById("copy-btn");
const downloadBtn = document.getElementById("download-btn");

if (
  topicInput &&
  difficultySelect &&
  numQuestionsSelect &&
  quizGenerateBtn &&
  questionsContainer &&
  questionCountLabel &&
  scoreLabel &&
  progressFill &&
  nextBtn &&
  copyBtn &&
  downloadBtn
) {

  const defaultQuiz = [
    {
      question: "What is the primary function of an Operating System?",
      options: [
        "To manage hardware and software resources",
        "To only browse the internet",
        "To design websites",
        "To compile source code only",
      ],
      correctIndex: 0,
    },
    {
      question: "Which of these is NOT a type of Operating System?",
      options: ["Batch OS", "Real-Time OS", "Distributed OS", "Spreadsheet OS"],
      correctIndex: 3,
    },
    {
      question: "What does Process Management primarily handle?",
      options: [
        "Creation, scheduling, and termination of processes",
        "Formatting hard drives",
        "Installing device drivers",
        "Rendering graphics",
      ],
      correctIndex: 0,
    },
    {
      question: "What is the key difference between multithreading and multiprocessing?",
      options: [
        "Multithreading uses multiple processes; multiprocessing uses threads",
        "Multithreading runs multiple threads within one process; multiprocessing uses multiple processes/CPUs",
        "They are exactly the same thing",
        "Multiprocessing only works on single-core CPUs",
      ],
      correctIndex: 1,
    },
    {
      question: "What is the main role of Memory Management in an OS?",
      options: [
        "Allocating and tracking memory usage among processes",
        "Managing user passwords",
        "Rendering the desktop wallpaper",
        "Formatting text documents",
      ],
      correctIndex: 0,
    },
  ];

  let currentQuiz = defaultQuiz;
  let currentIndex = 0;
  let correctCount = 0;

  const updateProgress = () => {
    const total = currentQuiz.length;
    const pct = (Math.min(currentIndex, total) / total) * 100;
    progressFill.style.width = `${pct}%`;
  };

  const updateScoreLabel = () => {
    scoreLabel.textContent = `Score: ${correctCount}/${currentQuiz.length}`;
  };

  const renderCurrentQuestion = () => {
    updateProgress();
    updateScoreLabel();

    if (currentIndex >= currentQuiz.length) {
      renderSummary();
      return;
    }

    const q = currentQuiz[currentIndex];
    questionCountLabel.textContent = `Question ${currentIndex + 1} of ${currentQuiz.length}`;

    questionsContainer.innerHTML = "";

    const qDiv = document.createElement("div");
    qDiv.className = "question";
    qDiv.dataset.correct = q.correctIndex;

    const numberDiv = document.createElement("div");
    numberDiv.className = "number";
    numberDiv.textContent = currentIndex + 1;

    const bodyDiv = document.createElement("div");
    bodyDiv.className = "question-body";

    const p = document.createElement("p");
    p.textContent = q.question;

    const optionsDiv = document.createElement("div");
    optionsDiv.className = "options";

    const letters = ["A", "B", "C", "D"];
    q.options.forEach((optText, idx) => {
      const optDiv = document.createElement("div");
      optDiv.className = "option";
      optDiv.dataset.index = idx;

      const letterSpan = document.createElement("span");
      letterSpan.className = "letter";
      letterSpan.textContent = letters[idx] || idx + 1;

      const textSpan = document.createElement("span");
      textSpan.className = "option-text";
      textSpan.textContent = optText;

      optDiv.appendChild(letterSpan);
      optDiv.appendChild(textSpan);
      optionsDiv.appendChild(optDiv);
    });

    bodyDiv.appendChild(p);
    bodyDiv.appendChild(optionsDiv);
    qDiv.appendChild(numberDiv);
    qDiv.appendChild(bodyDiv);
    questionsContainer.appendChild(qDiv);

    nextBtn.disabled = true;
    nextBtn.textContent = currentIndex === currentQuiz.length - 1 ? "Finish Quiz" : "Next Question";
  };

  const renderSummary = () => {
    questionsContainer.innerHTML = "";

    const summaryDiv = document.createElement("div");
    summaryDiv.className = "quiz-summary";

    const title = document.createElement("h3");
    title.textContent = "Quiz complete";

    const scoreP = document.createElement("p");
    scoreP.textContent = `You scored ${correctCount} out of ${currentQuiz.length}`;

    summaryDiv.appendChild(title);
    summaryDiv.appendChild(scoreP);
    questionsContainer.appendChild(summaryDiv);

    questionCountLabel.textContent = "Quiz complete";
    nextBtn.disabled = false;
    nextBtn.textContent = "Retake Quiz";
  };

  questionsContainer.addEventListener("click", (e) => {
    const optionEl = e.target.closest(".option");
    if (!optionEl) return;

    const questionEl = optionEl.closest(".question");
    if (questionEl.classList.contains("answered")) return;

    const correctIndex = parseInt(questionEl.dataset.correct, 10);
    const chosenIndex = parseInt(optionEl.dataset.index, 10);

    questionEl.classList.add("answered");

    const allOptions = questionEl.querySelectorAll(".option");
    allOptions[correctIndex].classList.add("correct");

    if (chosenIndex !== correctIndex) {
      optionEl.classList.add("incorrect");
    } else {
      correctCount++;
    }

    updateScoreLabel();
    nextBtn.disabled = false;
  });

  nextBtn.addEventListener("click", () => {
    if (currentIndex < currentQuiz.length) {
      currentIndex++;
      renderCurrentQuestion();
    } else {
      currentIndex = 0;
      correctCount = 0;
      renderCurrentQuestion();
    }
  });

  const normalizeQuestions = (rawQuestions) => {
    return (rawQuestions || []).map((q) => {
      const options = q.options || [];
      let correctIndex = options.findIndex(
        (opt) => opt.trim().toLowerCase() === (q.correct_answer || "").trim().toLowerCase()
      );
      if (correctIndex === -1) correctIndex = 0;
      return { question: q.question, options, correctIndex };
    });
  };

  const generateQuiz = async () => {
    const topic = topicInput.value.trim() || topicInput.placeholder;
    const difficulty = difficultySelect.value;
    const numQuestions = numQuestionsSelect.value;

    const originalLabel = quizGenerateBtn.innerHTML;
    quizGenerateBtn.disabled = true;
    quizGenerateBtn.innerHTML = "Generating...";

    try {
      const res = await fetch("/api/mcqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          difficulty,
          num_questions: numQuestions,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Something went wrong generating the quiz. Please try again.");
        return;
      }

      const questions = normalizeQuestions(data.questions);
      if (!questions.length) {
        alert("EduGenie didn't return any questions. Please try again.");
        return;
      }

      currentQuiz = questions;
      currentIndex = 0;
      correctCount = 0;
      renderCurrentQuestion();
    } catch (err) {
      alert("Could not reach EduGenie. Check your connection and try again.");
    } finally {
      quizGenerateBtn.disabled = false;
      quizGenerateBtn.innerHTML = originalLabel;
    }
  };

  const quizAsText = () => {
    const letters = ["A", "B", "C", "D"];
    return currentQuiz
      .map((q, i) => {
        const optionsText = q.options
          .map((opt, idx) => `   ${letters[idx] || idx + 1}. ${opt}`)
          .join("\n");
        const correctLetter = letters[q.correctIndex] || q.correctIndex + 1;
        return `${i + 1}. ${q.question}\n${optionsText}\n   Correct answer: ${correctLetter}`;
      })
      .join("\n\n");
  };

  const copyQuiz = async () => {
    try {
      await copyToClipboard(quizAsText());
      const original = copyBtn.innerHTML;
      copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
      setTimeout(() => {
        copyBtn.innerHTML = original;
      }, 1800);
    } catch (err) {
      alert("Could not copy to clipboard.");
    }
  };

  const downloadQuiz = () => {
    const topic = (topicInput.value.trim() || topicInput.placeholder || "quiz")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    const blob = new Blob([quizAsText()], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${topic}-quiz.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  quizGenerateBtn.addEventListener("click", generateQuiz);
  copyBtn.addEventListener("click", copyQuiz);
  downloadBtn.addEventListener("click", downloadQuiz);

  renderCurrentQuestion();
}