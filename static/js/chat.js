/* ==========================================
   Chat Page (index.html)
========================================== */

const messagesEl = document.getElementById("messages");
const composerEl = document.getElementById("composer");
const inputEl = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const resetBtn = document.getElementById("resetBtn");
const attachBtn = document.getElementById("attachBtn");
const attachMenu = document.getElementById("attachMenu");
const attachFilesBtn = document.getElementById("attachFilesBtn");
const fileInput = document.getElementById("fileInput");
const attachmentsEl = document.getElementById("attachments");

if (messagesEl && composerEl && inputEl && sendBtn) {
  if (window.marked) {
    marked.setOptions({ breaks: true, gfm: true });
  }

  const scrollToBottom = () => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  // ---------- Auto-growing composer textarea ----------
  // Reads the max-height from CSS so it can be tuned per breakpoint there
  // instead of being locked to a single value in JS.
  const getComposerMaxHeight = () => {
    const parsed = parseFloat(getComputedStyle(inputEl).maxHeight);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 240;
  };

  const autoResizeInput = () => {
    const maxHeight = getComposerMaxHeight();
    inputEl.style.height = "auto";
    const next = Math.min(inputEl.scrollHeight, maxHeight);
    inputEl.style.height = `${next}px`;
    inputEl.style.overflowY = inputEl.scrollHeight > maxHeight ? "auto" : "hidden";
  };

  const resetInputHeight = () => {
    inputEl.style.height = "auto";
    inputEl.style.overflowY = "hidden";
  };

  inputEl.addEventListener("input", autoResizeInput);

  // Enter sends the message, Shift+Enter inserts a newline
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      composerEl.requestSubmit();
    }
  });

  const copyIconSVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`;
  const checkIconSVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12.5L9.5 18L20 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const expandIconSVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 3H3v6M15 3h6v6M9 21H3v-6M15 21h6v-6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const closeIconSVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 5L19 19M19 5L5 19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  const pdfIconSVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M15 2v5h5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  const fileIconSVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M15 2v5h5M9 13h6M9 17h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;

  // ==========================================
  // File attachments (mirrors app.py's _decode_uploaded_files limits)
  // ==========================================
  const MAX_FILES_PER_MESSAGE = 4;
  const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB per file
  // Files travel as base64 JSON (~33% larger than raw bytes) and the whole
  // request body is capped server-side at 15MB, so keep raw bytes comfortably
  // under that after encoding overhead.
  const MAX_TOTAL_RAW_BYTES = 10.5 * 1024 * 1024;

  const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
  const ALLOWED_TEXT_MIME_TYPES = new Set(["text/plain", "text/markdown", "text/csv", "application/json"]);
  const TEXT_FILE_EXTENSIONS = new Set([
    ".txt", ".md", ".csv", ".json", ".py", ".js", ".jsx", ".ts", ".tsx",
    ".java", ".c", ".cpp", ".h", ".cs", ".go", ".rs", ".rb", ".php",
    ".html", ".css", ".sql", ".yml", ".yaml", ".log",
  ]);

  let attachedFiles = []; // { id, name, mimeType, kind, sizeBytes, dataB64, error? }

  const getExt = (name) => {
    const i = name.lastIndexOf(".");
    return i === -1 ? "" : name.slice(i).toLowerCase();
  };

  const classifyFile = (file) => {
    const mimeType = (file.type || "").toLowerCase();
    const ext = getExt(file.name || "");

    if (mimeType === "application/pdf" || ext === ".pdf") return "pdf";
    if (ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) return "image";
    if (ALLOWED_TEXT_MIME_TYPES.has(mimeType) || TEXT_FILE_EXTENSIONS.has(ext)) return "text";
    return null;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const readFileAsBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Strip the "data:<mime>;base64," prefix - the backend expects raw base64.
        const result = reader.result || "";
        const comma = result.indexOf(",");
        resolve(comma === -1 ? result : result.slice(comma + 1));
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const renderAttachments = () => {
    if (!attachmentsEl) return;
    attachmentsEl.innerHTML = "";

    if (!attachedFiles.length) {
      attachmentsEl.hidden = true;
      return;
    }
    attachmentsEl.hidden = false;

    attachedFiles.forEach((entry) => {
      const chip = document.createElement("div");
      chip.className = "attachment-chip" + (entry.error ? " chip-error" : "");

      if (entry.kind === "image" && entry.dataB64) {
        const img = document.createElement("img");
        img.className = "attachment-chip-thumb";
        img.src = `data:${entry.mimeType};base64,${entry.dataB64}`;
        img.alt = entry.name;
        chip.appendChild(img);
      } else {
        const iconWrap = document.createElement("div");
        iconWrap.className = "attachment-chip-icon";
        iconWrap.innerHTML = entry.kind === "pdf" ? pdfIconSVG : fileIconSVG;
        chip.appendChild(iconWrap);
      }

      const info = document.createElement("div");
      info.className = "attachment-chip-info";

      const nameEl = document.createElement("span");
      nameEl.className = "attachment-chip-name";
      nameEl.textContent = entry.name;
      nameEl.title = entry.name;
      info.appendChild(nameEl);

      const metaEl = document.createElement("span");
      metaEl.className = "attachment-chip-meta";
      metaEl.textContent = entry.error || formatFileSize(entry.sizeBytes);
      info.appendChild(metaEl);

      chip.appendChild(info);

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "attachment-chip-remove";
      removeBtn.setAttribute("aria-label", `Remove ${entry.name}`);
      removeBtn.innerHTML = closeIconSVG;
      removeBtn.addEventListener("click", () => {
        attachedFiles = attachedFiles.filter((f) => f.id !== entry.id);
        renderAttachments();
      });
      chip.appendChild(removeBtn);

      attachmentsEl.appendChild(chip);
    });
  };

  const currentTotalRawBytes = () => attachedFiles.reduce((sum, f) => sum + (f.sizeBytes || 0), 0);

  const addFiles = async (fileList) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    let slotsLeft = MAX_FILES_PER_MESSAGE - attachedFiles.length;
    if (slotsLeft <= 0) {
      addError(`You can attach up to ${MAX_FILES_PER_MESSAGE} files per message.`);
      return;
    }

    for (const file of incoming) {
      if (slotsLeft <= 0) {
        addError(`Only the first ${MAX_FILES_PER_MESSAGE} files were added - that's the limit per message.`);
        break;
      }

      const kind = classifyFile(file);
      if (!kind) {
        addError(`'${file.name}' isn't a supported file type.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        addError(`'${file.name}' is too large. Please attach files under ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`);
        continue;
      }
      if (currentTotalRawBytes() + file.size > MAX_TOTAL_RAW_BYTES) {
        addError(`Adding '${file.name}' would exceed the total attachment size limit for one message.`);
        continue;
      }

      const id = `f_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const entry = { id, name: file.name, mimeType: file.type || "", kind, sizeBytes: file.size, dataB64: null };
      attachedFiles.push(entry);
      slotsLeft -= 1;
      renderAttachments();

      try {
        entry.dataB64 = await readFileAsBase64(file);
      } catch (err) {
        entry.error = "Couldn't read this file.";
      }
      renderAttachments();
    }
  };

  const clearAttachments = () => {
    attachedFiles = [];
    renderAttachments();
  };

  const closeAttachMenu = () => {
    if (!attachMenu) return;
    attachMenu.hidden = true;
    attachBtn.classList.remove("open");
    attachBtn.setAttribute("aria-expanded", "false");
  };

  if (attachBtn && attachMenu && attachFilesBtn && fileInput) {
    attachBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = !attachMenu.hidden;
      if (isOpen) {
        closeAttachMenu();
      } else {
        attachMenu.hidden = false;
        attachBtn.classList.add("open");
        attachBtn.setAttribute("aria-expanded", "true");
      }
    });

    attachFilesBtn.addEventListener("click", () => {
      closeAttachMenu();
      fileInput.click();
    });

    fileInput.addEventListener("change", async () => {
      await addFiles(fileInput.files);
      fileInput.value = ""; // allow re-selecting the same file later
    });

    document.addEventListener("click", (e) => {
      if (!attachMenu.hidden && !attachMenu.contains(e.target) && e.target !== attachBtn) {
        closeAttachMenu();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAttachMenu();
    });
  }

  // ---------- Drag and drop onto the composer ----------
  ["dragenter", "dragover"].forEach((evt) => {
    composerEl.addEventListener(evt, (e) => {
      if (!e.dataTransfer || !Array.from(e.dataTransfer.types || []).includes("Files")) return;
      e.preventDefault();
      composerEl.classList.add("drag-over");
    });
  });

  ["dragleave", "dragend"].forEach((evt) => {
    composerEl.addEventListener(evt, (e) => {
      if (e.target === composerEl) composerEl.classList.remove("drag-over");
    });
  });

  composerEl.addEventListener("drop", async (e) => {
    if (!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) return;
    e.preventDefault();
    composerEl.classList.remove("drag-over");
    await addFiles(e.dataTransfer.files);
  });

  // ---------- Paste a screenshot/image straight into the input ----------
  inputEl.addEventListener("paste", async (e) => {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items || !items.length) return;

    const imageFiles = [];
    for (const item of items) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          // Clipboard images often come in as "image.png" with no useful
          // name - give it a readable, unique one.
          const ext = (file.type.split("/")[1] || "png").split("+")[0];
          const named = file.name && file.name !== "image.png"
            ? file
            : new File([file], `pasted-image-${Date.now()}.${ext}`, { type: file.type });
          imageFiles.push(named);
        }
      }
    }

    if (imageFiles.length) {
      // Only intercept the paste when it actually contains image data -
      // plain-text pastes should behave normally and aren't touched.
      e.preventDefault();
      await addFiles(imageFiles);
    }
  });

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

  const addMessage = (role, text, files) => {
    const msg = document.createElement("div");
    msg.className = `msg ${role}`;

    const label = document.createElement("div");
    label.className = "role-label";
    label.textContent = role === "bot" ? "" : "";
    msg.appendChild(label);

    if (files && files.length) {
      const filesWrap = document.createElement("div");
      filesWrap.className = "msg-files";
      files.forEach((f) => {
        if (f.kind === "image" && f.dataB64) {
          const img = document.createElement("img");
          img.className = "msg-file-img";
          img.src = `data:${f.mimeType};base64,${f.dataB64}`;
          img.alt = f.name;
          img.addEventListener("click", () => window.open(img.src, "_blank"));
          filesWrap.appendChild(img);
        } else {
          const card = document.createElement("div");
          card.className = "msg-file-card";
          card.innerHTML = `${f.kind === "pdf" ? pdfIconSVG : fileIconSVG}<span></span>`;
          card.querySelector("span").textContent = f.name;
          filesWrap.appendChild(card);
        }
      });
      msg.appendChild(filesWrap);
    }

    if (text && text.trim()) {
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
    }

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

  const sendMessage = async (text, files) => {
    if (greetMsg) greetMsg.style.display = "none";

    const filesToSend = files || [];
    addMessage("user", text, filesToSend);
    inputEl.value = "";
    resetInputHeight();
    clearAttachments();
    sendBtn.disabled = true;

    const thinkingEl = addThinkingIndicator();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          markdown: true,
          files: filesToSend.map((f) => ({
            name: f.name,
            mime_type: f.mimeType,
            data: f.dataB64,
          })),
        }),
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
    const readyFiles = attachedFiles.filter((f) => f.dataB64 && !f.error);

    if (!text && !readyFiles.length) return;

    if (attachedFiles.some((f) => !f.dataB64 && !f.error)) {
      addError("Still reading your files - hang on a second and try sending again.");
      return;
    }

    sendMessage(text, readyFiles);
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
      resetInputHeight();
      clearAttachments();
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