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
  const CODE_BLOCK_MIN_LINES = 3;
  const KNOWN_LANG_LABELS = {
    cpp: "C++",
    csharp: "C#",
    cs: "C#",
    fsharp: "F#",
    js: "JavaScript",
    jsx: "JSX",
    ts: "TypeScript",
    tsx: "TSX",
    py: "Python",
    r: "R",
    rb: "Ruby",
    php: "PHP",
    go: "Go",
    rs: "Rust",
    sh: "Shell",
    bash: "Bash",
    ps1: "PowerShell",
    sql: "SQL",
    html: "HTML",
    xml: "XML",
    css: "CSS",
    json: "JSON",
    yaml: "YAML",
    yml: "YAML",
    md: "Markdown",
  };

  const formatLanguageLabel = (lang) => {
    if (!lang || lang.toLowerCase() === "text" || lang.toLowerCase() === "plaintext") return "Code";
    return KNOWN_LANG_LABELS[lang.toLowerCase()] || lang;
  };

  const inferCodeLanguage = (text) => {
    const source = (text || "").trim();
    if (!source) return "";

    if (/^\s*</.test(source) && /<\/?[a-z][\s\S]*>/i.test(source)) {
      return /<html|<body|<div|<span|<script|<style/i.test(source) ? "html" : "xml";
    }
    if (/^\s*[{[]/.test(source) && /":\s*["{\[\d-]/.test(source)) return "json";
    if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|WITH)\b/im.test(source)) return "sql";
    if (/^\s*(def |class |import |from |if __name__ == ['"]__main__['"])/m.test(source)) return "python";
    if (/^\s*(library|require)\s*\(/m.test(source) || /<-\s*/.test(source) || /%>%/.test(source) || /\b(data\.frame|ggplot|mutate|summarise|filter|select|arrange|read\.csv)\s*\(/.test(source)) return "r";
    if (/^\s*(function |const |let |var |export |import )/m.test(source) || /=>/.test(source)) return "javascript";
    if (/^\s*(interface |type |enum )/m.test(source) || /:\s*(string|number|boolean|any|unknown)(\[\])?/.test(source)) return "typescript";
    if (/^\s*(public |private |protected )/m.test(source) || /System\.out\.println|public static void main/.test(source)) return "java";
    if (/^\s*#include\b/m.test(source) || /std::|cout\s*<</.test(source)) return "cpp";
    if (/^\s*using\s+System\b/m.test(source) || /Console\.Write(Line)?/.test(source)) return "csharp";
    if (/^\s*(package main|func main\()/m.test(source)) return "go";
    if (/^\s*(fn main\(\)|let mut )/m.test(source)) return "rust";
    if (/^\s*(body|html|:root|@media|@import)\b/m.test(source) && /[{:;]/.test(source)) return "css";
    if (/^\s*(echo |if \[|fi\b|#!)/m.test(source)) return "bash";
    if (/^\s*(Write-Host|Get-|Set-|New-|param\()/m.test(source)) return "powershell";

    return "";
  };

  const isLikelyCodeLine = (line) => {
    const trimmed = (line || "").trim();
    if (!trimmed) return false;
    if (/^[-*+]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) return false;
    if (/^\|.*\|$/.test(trimmed)) return false;
    if (/^["'][^"']+["']\s*:\s*.+,?$/.test(trimmed)) return true;
    if (/^[a-z-]+\s*:\s*[^:;]+;$/i.test(trimmed)) return true;
    if (/^[A-Za-z_][\w$]*\s*=\s*.+$/.test(trimmed)) return true;
    if (/^[A-Za-z_.][\w.]*\s*<-\s*.+$/.test(trimmed)) return true;
    if (/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)+\(.*\)\s*;?$/.test(trimmed)) return true;
    if (/%>%|\|\>/.test(trimmed)) return true;

    let score = 0;

    if (/^(def|class|function|const|let|var|import|from|export|return|if|else|elif|for|while|try|catch|finally|switch|case|break|continue|public|private|protected|static|void|package|using|namespace|interface|type|enum|SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|WITH|body|html|:root|@media|#include|library|require)\b/.test(trimmed)) {
      score += 2;
    }
    if (/[{};]/.test(trimmed) || /=>|::|<\/?[a-z][^>]*>/i.test(trimmed) || /<-\s*|%>%|\|\>/.test(trimmed)) {
      score += 2;
    }
    if (/^[.#][\w-]+\s*[{:]/.test(trimmed) || /^[\w-]+\s*:\s*[^:]+;?$/.test(trimmed)) {
      score += 1;
    }
    if (/^[A-Za-z_][\w$]*\s*\(.*\)\s*[{;]?$/.test(trimmed) || /\b\w+\(.*\)/.test(trimmed)) {
      score += 1;
    }
    if (/^(\/\/|\/\*|\*\/|\* |#|--)\s?/.test(trimmed)) {
      score += 1;
    }
    if (/^[\]\[()]+$/.test(trimmed)) {
      score += 1;
    }

    return score >= 2;
  };

  const looksLikeCodeResponse = (text) => {
    const lines = (text || "").split(/\r?\n/);
    const nonEmptyLines = lines.filter((line) => line.trim());
    if (nonEmptyLines.length < 2) return false;

    const codeLikeLines = nonEmptyLines.filter(isLikelyCodeLine);
    const inferredLanguage = inferCodeLanguage(text);

    return Boolean(
      inferredLanguage ||
      (codeLikeLines.length >= CODE_BLOCK_MIN_LINES && codeLikeLines.length / nonEmptyLines.length >= 0.6)
    );
  };

  const autoFenceCodeBlocks = (text) => {
    const source = (text || "").trim();
    if (!source || /```/.test(source)) return source;

    if (looksLikeCodeResponse(source)) {
      const lang = inferCodeLanguage(source);
      return `\`\`\`${lang}\n${source}\n\`\`\``;
    }

    const lines = source.split(/\r?\n/);
    const rebuilt = [];
    let i = 0;

    while (i < lines.length) {
      const currentLine = lines[i];
      let runStart = i;

      if (!isLikelyCodeLine(currentLine)) {
        rebuilt.push(currentLine);
        i += 1;
        continue;
      }

      let runEnd = i;
      let codeLineCount = 0;

      while (runEnd < lines.length) {
        const candidate = lines[runEnd];
        if (!candidate.trim()) {
          if (runEnd + 1 < lines.length && isLikelyCodeLine(lines[runEnd + 1])) {
            runEnd += 1;
            continue;
          }
          break;
        }

        if (!isLikelyCodeLine(candidate)) break;
        codeLineCount += 1;
        runEnd += 1;
      }

      if (codeLineCount >= CODE_BLOCK_MIN_LINES) {
        const blockLines = lines.slice(runStart, runEnd);
        const lang = inferCodeLanguage(blockLines.join("\n"));
        rebuilt.push(`\`\`\`${lang}`);
        rebuilt.push(...blockLines);
        rebuilt.push("```");
        i = runEnd;
        continue;
      }

      rebuilt.push(currentLine);
      i += 1;
    }

    return rebuilt.join("\n");
  };

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
    langLabel.textContent = formatLanguageLabel(lang);
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

      const langMatch = codeEl.className.match(/language-([a-z0-9#+-]+)/i);
      const lang = (langMatch ? langMatch[1] : inferCodeLanguage(codeEl.textContent)) || "text";

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
      langLabel.textContent = formatLanguageLabel(lang);

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
    label.textContent = role === "bot" ? "" : "";
    msg.appendChild(label);

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    if (role === "bot" && window.marked && window.DOMPurify) {
      const preparedText = autoFenceCodeBlocks(text || "");
      bubble.innerHTML = DOMPurify.sanitize(marked.parse(preparedText));
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
      <div class="role-label"></div>
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
