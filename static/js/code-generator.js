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

  const LANGUAGE_HLJS = {
    Python: "python",
    JavaScript: "javascript",
    Java: "java",
    "C++": "cpp",
    Go: "go",
    Rust: "rust",
  };

  const highlightCode = (language) => {
    if (!window.hljs) return;
    // Reset any highlighting state from a previous generation so
    // hljs doesn't skip re-highlighting or stack classes.
    delete codeEl.dataset.highlighted;
    codeEl.className = `language-${LANGUAGE_HLJS[language] || "plaintext"}`;
    hljs.highlightElement(codeEl);
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

  const lineNumbersEl = codeBox.querySelector(".line-numbers");

  const renderLineNumbers = () => {
    if (!lineNumbersEl) return;
    const text = codeEl.textContent;
    if (!text) {
      lineNumbersEl.innerHTML = "";
      return;
    }
    const lineCount = text.split("\n").length;
    let html = "";
    for (let i = 1; i <= lineCount; i++) {
      html += `<span>${i}</span>`;
    }
    lineNumbersEl.innerHTML = html;
  };

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
    codeEl.className = "";
    delete codeEl.dataset.highlighted;
    codeEl.textContent = "Generating...";
    renderLineNumbers();
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
        renderLineNumbers();
        return;
      }

      codeEl.textContent = data.reply;
      highlightCode(language);
      renderLineNumbers();
    } catch (err) {
      codeEl.textContent = "Could not reach EduGenie. Check your connection and try again.";
      renderLineNumbers();
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
        a.download = `main.${ext}`;
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