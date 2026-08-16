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

  const copyIconSVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`;
  const checkIconSVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12.5L9.5 18L20 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const expandIconSVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 3H3v6M15 3h6v6M9 21H3v-6M15 21h6v-6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const closeIconSVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 5L19 19M19 5L5 19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fallback for browsers/contexts without Clipboard API access
      try {
        const helper = document.createElement("textarea");
        helper.value = text;
        helper.style.position = "fixed";
        helper.style.opacity = "0";
        document.body.appendChild(helper);
        helper.select();
        document.execCommand("copy");
        document.body.removeChild(helper);
        return true;
      } catch (fallbackErr) {
        return false;
      }
    }
  };

  // ---------- Code side panel (view a code block full-size) ----------
  let codePanelEls = null;

  const ensureCodePanel = () => {
    if (codePanelEls) return codePanelEls;

    const backdrop = document.createElement("div");
    backdrop.className = "code-panel-backdrop";

    const panel = document.createElement("div");
    panel.className = "code-side-panel";
    panel.innerHTML = `
      <div class="code-side-panel-header">
        <span class="code-side-panel-lang"></span>
        <div class="code-side-panel-actions">
          <button type="button" class="code-side-panel-btn panel-copy-btn">${copyIconSVG}<span>Copy</span></button>
          <button type="button" class="code-side-panel-btn code-side-panel-close" aria-label="Close">${closeIconSVG}</button>
        </div>
      </div>
      <div class="code-side-panel-body"><pre><code></code></pre></div>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(panel);

    const langLabel = panel.querySelector(".code-side-panel-lang");
    const panelCode = panel.querySelector("code");
    const panelCopyBtn = panel.querySelector(".panel-copy-btn");
    const closeBtn = panel.querySelector(".code-side-panel-close");

    const close = () => {
      panel.classList.remove("open");
      backdrop.classList.remove("open");
      document.body.style.overflow = "";
    };

    backdrop.addEventListener("click", close);
    closeBtn.addEventListener("click", close);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && panel.classList.contains("open")) close();
    });

    panelCopyBtn.addEventListener("click", async () => {
      const ok = await copyText(panelCode.textContent);
      panelCopyBtn.innerHTML = ok
        ? `${checkIconSVG}<span>Copied</span>`
        : `${copyIconSVG}<span>Failed</span>`;
      panelCopyBtn.classList.toggle("copied", ok);
      setTimeout(() => {
        panelCopyBtn.innerHTML = `${copyIconSVG}<span>Copy</span>`;
        panelCopyBtn.classList.remove("copied");
      }, 1500);
    });

    codePanelEls = { backdrop, panel, langLabel, panelCode, close };
    return codePanelEls;
  };

  const openCodePanel = (codeEl, lang) => {
    const { backdrop, panel, langLabel, panelCode } = ensureCodePanel();
    langLabel.textContent = lang;
    panelCode.className = codeEl.className;
    panelCode.innerHTML = codeEl.innerHTML;
    panel.classList.add("open");
    backdrop.classList.add("open");
    document.body.style.overflow = "hidden";
  };

  // Post-processes rendered markdown inside a bot bubble:
  // - wraps tables in a scrollable container so wide tables don't break layout
  // - syntax-highlights and wraps code blocks with a header, copy button, and expand button
  const enhanceBubble = (bubble) => {
    bubble.querySelectorAll("table").forEach((table) => {
      if (table.parentElement.classList.contains("table-wrap")) return;
      const wrap = document.createElement("div");
      wrap.className = "table-wrap";
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });

    bubble.querySelectorAll("pre > code").forEach((codeEl) => {
      const pre = codeEl.parentElement;
      if (pre.parentElement.classList.contains("code-block")) return;

      const langMatch = codeEl.className.match(/language-(\w+)/);
      const lang = langMatch ? langMatch[1] : "text";

      if (window.hljs) {
        try {
          window.hljs.highlightElement(codeEl);
        } catch (err) {
          // ignore highlighting failures, plain code still renders
        }
      }

      const block = document.createElement("div");
      block.className = "code-block";

      const header = document.createElement("div");
      header.className = "code-block-header";

      const langLabel = document.createElement("span");
      langLabel.className = "code-lang";
      langLabel.textContent = lang;

      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.alignItems = "center";
      actions.style.gap = "6px";

      const expandBtn = document.createElement("button");
      expandBtn.type = "button";
      expandBtn.className = "copy-btn expand-btn";
      expandBtn.title = "View full size";
      expandBtn.innerHTML = expandIconSVG;
      expandBtn.addEventListener("click", () => openCodePanel(codeEl, lang));

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "copy-btn";
      copyBtn.innerHTML = `${copyIconSVG}<span>Copy</span>`;

      copyBtn.addEventListener("click", async () => {
        const ok = await copyText(codeEl.textContent);
        copyBtn.innerHTML = ok
          ? `${checkIconSVG}<span>Copied</span>`
          : `${copyIconSVG}<span>Failed</span>`;
        copyBtn.classList.toggle("copied", ok);
        setTimeout(() => {
          copyBtn.innerHTML = `${copyIconSVG}<span>Copy</span>`;
          copyBtn.classList.remove("copied");
        }, 1500);
      });

      actions.appendChild(expandBtn);
      actions.appendChild(copyBtn);
      header.appendChild(langLabel);
      header.appendChild(actions);

      pre.parentNode.insertBefore(block, pre);
      block.appendChild(header);
      block.appendChild(pre);
    });
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
      enhanceBubble(bubble);
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