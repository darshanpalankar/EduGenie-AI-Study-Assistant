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