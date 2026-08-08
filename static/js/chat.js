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

    const label = document.createElement("div");
    label.className = "role-label";
    label.textContent = role === "bot" ? "EduGenie" : "You";
    msg.appendChild(label);

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
      <div class="role-label">EduGenie</div>
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

  let greetMsg = document.getElementById("greetMsg");
  const greetHTML = greetMsg ? greetMsg.outerHTML : "";

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
      messagesEl.innerHTML = greetHTML;
      greetMsg = document.getElementById("greetMsg");
      if (greetMsg) greetMsg.style.display = "";
      inputEl.value = "";
      inputEl.focus();
    });
  }

  // Delegated so suggestion chips keep working after the greeting
  // screen is restored (e.g. after "New chat" re-renders it).
  messagesEl.addEventListener("click", (e) => {
    const chip = e.target.closest(".suggestion-chip");
    if (!chip) return;
    const prompt = chip.dataset.prompt;
    if (prompt) sendMessage(prompt);
  });

  inputEl.focus();
}