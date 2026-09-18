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
const searchToggleBtn = document.getElementById("searchToggleBtn");

if (messagesEl && composerEl && inputEl && sendBtn) {
  if (window.marked) {
    marked.setOptions({ breaks: true, gfm: true });
  }

  const scrollToBottom = () => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  // ---------- Location for the time/date card ----------
  // Resolves the user's real city via browser geolocation + a free,
  // no-key reverse-geocoding lookup, so the time card doesn't always show
  // the same fallback location for every user. Lazy: only triggers the
  // permission prompt the first time a date/time question actually needs
  // it, not on page load. Cached in sessionStorage so the prompt only
  // happens once per browser tab.
  //
  // NOTE: navigator.geolocation is blocked by browsers on any non-HTTPS
  // origin except localhost/127.0.0.1. On LAN HTTP testing
  // (http://10.x.x.x:5000) this will silently resolve to null and the
  // card will just show the backend's static fallback location instead -
  // that's expected until this is served over HTTPS.
  const LOCATION_CACHE_KEY = "edugenie_location_label";
  let locationPromise = null;

  const resolveUserLocation = () => {
    if (locationPromise) return locationPromise;

    const cached = sessionStorage.getItem(LOCATION_CACHE_KEY);
    if (cached) {
      locationPromise = Promise.resolve(cached);
      return locationPromise;
    }

    if (!("geolocation" in navigator)) {
      locationPromise = Promise.resolve(null);
      return locationPromise;
    }

    locationPromise = new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const res = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            const geo = await res.json();
            const label = [geo.city || geo.locality, geo.principalSubdivision, geo.countryCode]
              .filter(Boolean)
              .join(", ");
            if (label) sessionStorage.setItem(LOCATION_CACHE_KEY, label);
            resolve(label || null);
          } catch {
            resolve(null);
          }
        },
        () => resolve(null), // permission denied, timeout, or other geolocation error
        { timeout: 5000, maximumAge: 10 * 60 * 1000 }
      );
    });

    return locationPromise;
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
  const shareIconSVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 15V3M8 7l4-4 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const regenerateIconSVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 3v5h-5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 21v-5h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const thumbUpIconSVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 22V11M2 13v7a2 2 0 0 0 2 2h11.5a2 2 0 0 0 2-1.6l1.3-6A2 2 0 0 0 16.8 12H14V6a2 2 0 0 0-2-2c-.35 0-.68.16-.9.45L7 11H2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const thumbDownIconSVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17 2v11M22 11V4a2 2 0 0 0-2-2H8.5a2 2 0 0 0-2 1.6l-1.3 6A2 2 0 0 0 7.2 12H10v6a2 2 0 0 0 2 2c.35 0 .68-.16.9-.45L17 13h5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const alertIconSVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 8.5v4.25M12 16.25h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.6 3.75a1.6 1.6 0 0 1 2.8 0l8.4 14.8A1.6 1.6 0 0 1 20.4 21H3.6a1.6 1.6 0 0 1-1.4-2.45z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>`;

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

  // ---------- "Search the web" toggle ----------
  // A standing per-conversation mode, not a per-message flag: once turned
  // on it stays on (mirrors how the attach button works) until the user
  // turns it off or starts a new chat. When on, /api/chat always runs a
  // real web search for that message instead of guessing from wording.
  let webSearchEnabled = false;

  const setWebSearchEnabled = (enabled) => {
    webSearchEnabled = enabled;
    if (!searchToggleBtn) return;
    searchToggleBtn.classList.toggle("active", enabled);
    searchToggleBtn.setAttribute("aria-pressed", String(enabled));
  };

  if (searchToggleBtn) {
    searchToggleBtn.addEventListener("click", () => {
      setWebSearchEnabled(!webSearchEnabled);
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
    // `WITH` is SQL only when it begins a common-table expression. A bare
    // prose line such as "With all my love" must not become an SQL block.
    if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER)\b/im.test(source) ||
        /^\s*WITH\s+[A-Za-z_][\w$]*\s+AS\s*\(/im.test(source)) return "sql";
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

  // Models occasionally put ordinary prose (for example, a letter or poem)
  // inside a fenced block and may even label it as SQL. Treating every fence
  // as code makes that response hard to read and adds a misleading language
  // label. Keep genuine code fences intact, but unwrap multi-line prose.
  const unwrapProseCodeFences = (text) => (text || "").replace(
    /(^|\n)```[^\n]*\n([\s\S]*?)\n```(?=\n|$)/g,
    (match, prefix, content) => {
      const nonEmptyLines = content.split(/\r?\n/).filter((line) => line.trim());
      const wordCount = (content.match(/[A-Za-z][A-Za-z'-]*/g) || []).length;
      const hasProseShape = nonEmptyLines.length >= 2 && wordCount >= 8;

      return hasProseShape && !looksLikeCodeResponse(content)
        ? `${prefix}${content}`
        : match;
    }
  );

  const autoFenceCodeBlocks = (text) => {
    const source = unwrapProseCodeFences(text).trim();
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

  // Builds the small time/date card shown above a bot reply when the user
  // asked "what time is it" / "what's today's date" etc. `card` is the
  // time_card object sent back by /api/chat (see app.py is_date_time_query
  // handling): { time, hour, minute, date_label, full_date, location, tz }.
  const buildTimeCard = (card) => {
    const wrap = document.createElement("div");
    wrap.className = "time-card";

    const info = document.createElement("div");
    info.className = "time-card-info";
    info.innerHTML = `
      <div class="time-card-time">${card.time}</div>
      <div class="time-card-location">${card.location}</div>
      <div class="time-card-date">${card.date_label}${card.full_date ? ` &middot; ${card.full_date}` : ""}</div>
    `;

    // Analog clock face - hour/minute hand angles computed from the same
    // hour/minute the digital time above is built from, so they can never
    // disagree with each other.
    const hourAngle = (card.hour % 12) * 30 + card.minute * 0.5;
    const minuteAngle = card.minute * 6;

    const clock = document.createElement("div");
    clock.className = "time-card-clock";
    clock.innerHTML = `
      <svg viewBox="0 0 100 100" width="72" height="72" aria-hidden="true">
        <circle cx="50" cy="50" r="47"
          style="fill:var(--chat-accent-soft);stroke:var(--chat-border);stroke-width:1.5" />
        ${[...Array(12)].map((_, i) => {
          const a = i * 30;
          const x1 = 50 + 40 * Math.sin((a * Math.PI) / 180);
          const y1 = 50 - 40 * Math.cos((a * Math.PI) / 180);
          const x2 = 50 + 45 * Math.sin((a * Math.PI) / 180);
          const y2 = 50 - 45 * Math.cos((a * Math.PI) / 180);
          return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
            style="stroke:var(--chat-ink-faint);stroke-width:1.6;stroke-linecap:round" />`;
        }).join("")}
        <line x1="50" y1="50" x2="50" y2="26"
          transform="rotate(${hourAngle} 50 50)"
          style="stroke:var(--chat-ink);stroke-width:4;stroke-linecap:round" />
        <line x1="50" y1="50" x2="50" y2="16"
          transform="rotate(${minuteAngle} 50 50)"
          style="stroke:var(--chat-accent);stroke-width:3;stroke-linecap:round" />
        <circle cx="50" cy="50" r="3" style="fill:var(--chat-accent)" />
      </svg>
    `;

    wrap.appendChild(info);
    wrap.appendChild(clock);
    return wrap;
  };

  // Small pill shown above a bot reply that actually used fresh web
  // search results (see the `searched` flag in /api/chat's meta event).
  const buildSearchBadge = () => {
    const badge = document.createElement("div");
    badge.className = "search-badge";
    badge.innerHTML = `
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" />
        <path d="M21 21l-4.3-4.3" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
      <span>Searched the web</span>
    `;
    return badge;
  };


  // `sourceTurn` (the user text + files that produced this reply) is threaded
  // through so "Regenerate" can re-ask the same question.
  const buildMessageActions = (rawText, sourceTurn) => {
    const bar = document.createElement("div");
    bar.className = "msg-actions";

    const makeBtn = (action, label, icon) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "msg-action-btn";
      btn.dataset.action = action;
      btn.title = label;
      btn.setAttribute("aria-label", label);
      btn.innerHTML = icon;
      bar.appendChild(btn);
      return btn;
    };

    const flashIcon = (btn, icon, ms = 1400) => {
      const original = btn.innerHTML;
      btn.innerHTML = icon;
      setTimeout(() => {
        btn.innerHTML = original;
      }, ms);
    };

    const copyBtn = makeBtn("copy", "Copy response", copyIconSVG);
    copyBtn.addEventListener("click", async () => {
      const ok = await copyText(rawText);
      flashIcon(copyBtn, ok ? checkIconSVG : copyIconSVG);
    });

    const shareBtn = makeBtn("share", "Share response", shareIconSVG);
    shareBtn.addEventListener("click", async () => {
      if (navigator.share) {
        try {
          await navigator.share({ text: rawText, title: "EduGenie AI" });
          return;
        } catch (err) {
          // user cancelled the native share sheet, or it isn't supported here - fall through to copy
        }
      }
      const ok = await copyText(rawText);
      flashIcon(shareBtn, ok ? checkIconSVG : shareIconSVG);
    });

    const divider = document.createElement("span");
    divider.className = "msg-actions-divider";
    bar.appendChild(divider);

    const likeBtn = makeBtn("like", "Good response", thumbUpIconSVG);
    const dislikeBtn = makeBtn("dislike", "Bad response", thumbDownIconSVG);
    likeBtn.addEventListener("click", () => {
      const active = likeBtn.classList.toggle("active");
      if (active) dislikeBtn.classList.remove("active");
    });
    dislikeBtn.addEventListener("click", () => {
      const active = dislikeBtn.classList.toggle("active");
      if (active) likeBtn.classList.remove("active");
    });

    return bar;
  };

  const addMessage = (role, text, files, sourceTurn, timeCard) => {
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

    if (role === "bot" && timeCard) {
      msg.appendChild(buildTimeCard(timeCard));
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

      if (role === "bot") {
        msg.appendChild(buildMessageActions(text, sourceTurn));
      }
    }

    messagesEl.appendChild(msg);
    scrollToBottom();
    return msg;
  };

  // Streaming replies start as plain text, then receive the normal markdown
  // rendering and message actions once the server signals completion.
  const addStreamingMessage = (timeCard, searched) => {
    const msg = document.createElement("div");
    msg.className = "msg bot";
    msg.appendChild(document.createElement("div")).className = "role-label";

    if (timeCard) msg.appendChild(buildTimeCard(timeCard));
    if (searched) msg.appendChild(buildSearchBadge());

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    msg.appendChild(bubble);
    messagesEl.appendChild(msg);
    scrollToBottom();
    return { msg, bubble };
  };

  const finishStreamingMessage = (streamMessage, text, sourceTurn) => {
    const { msg, bubble } = streamMessage;
    const preparedText = autoFenceCodeBlocks(text || "");
    bubble.innerHTML = DOMPurify.sanitize(marked.parse(preparedText));
    enhanceBubble(bubble);
    msg.appendChild(buildMessageActions(text, sourceTurn));
    scrollToBottom();
  };

  const renderStreamingMarkdown = (bubble, text) => {
    if (window.marked && window.DOMPurify) {
      bubble.innerHTML = DOMPurify.sanitize(marked.parse(text || ""));
    } else {
      bubble.textContent = text;
    }
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

  // Small inline red-text notice, used for file-attachment validation issues
  // (wrong type, too large, etc.) - not for chat/network failures.
  const addError = (text) => {
    const el = document.createElement("div");
    el.className = "error-text";
    el.textContent = text;
    messagesEl.appendChild(el);
    scrollToBottom();
  };

  // Inline, retryable error row shown in the message stream (instead of a
  // standalone red line) so a failed reply can be re-sent without retyping.
  const addErrorMessage = (text, sourceTurn) => {
    const msg = document.createElement("div");
    msg.className = "msg bot error-msg";

    const card = document.createElement("div");
    card.className = "error-card";

    const icon = document.createElement("div");
    icon.className = "error-icon";
    icon.innerHTML = alertIconSVG;
    card.appendChild(icon);

    const body = document.createElement("div");
    body.className = "error-body";
    const title = document.createElement("p");
    title.className = "error-title";
    title.textContent = "Something went wrong";
    const desc = document.createElement("p");
    desc.className = "error-desc";
    desc.textContent = text;
    body.appendChild(title);
    body.appendChild(desc);
    card.appendChild(body);

    const retryBtn = document.createElement("button");
    retryBtn.type = "button";
    retryBtn.className = "error-retry-btn";
    retryBtn.innerHTML = `${regenerateIconSVG}<span>Retry</span>`;
    retryBtn.addEventListener("click", () => {
      msg.remove();
      sendBtn.disabled = true;
      const thinkingEl = addThinkingIndicator();
      performRequest(sourceTurn.text, sourceTurn.files, thinkingEl, sourceTurn.forceSearch);
    });
    card.appendChild(retryBtn);

    msg.appendChild(card);
    messagesEl.appendChild(msg);
    scrollToBottom();
    return msg;
  };

  let greetMsg = document.getElementById("greetMsg");
  const greetHTML = greetMsg ? greetMsg.outerHTML : "";

  // Sends one request to the backend and renders either the reply or a
  // retryable error row. Shared by the composer submit, the error row's
  // "Retry" button, and each bot reply's "Regenerate" button.
  const performRequest = async (text, files, thinkingEl, forceSearch) => {
    const filesToSend = files || [];
    const sourceTurn = { text, files: filesToSend, forceSearch };
    let streamMessage = null;
    let reply = "";
    let timeCard = null;
    let searchedWeb = false;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          markdown: true,
          web_search: Boolean(forceSearch),
          files: filesToSend.map((f) => ({
            name: f.name,
            mime_type: f.mimeType,
            data: f.dataB64,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        thinkingEl.remove();
        addErrorMessage(data.error || "Please check your internet connection and try again.", sourceTurn);
        return;
      }

      if (!res.body) throw new Error("Streaming is not supported by this browser.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completed = false;

      const handleEvent = (rawEvent) => {
        const event = (rawEvent.match(/^event:\s*(.+)$/m) || [])[1];
        const dataLine = (rawEvent.match(/^data:\s*(.+)$/m) || [])[1];
        if (!event || !dataLine) return;
        const data = JSON.parse(dataLine);

        if (event === "meta") {
          // Keep the animated dots visible until actual model text arrives.
          timeCard = data.time_card || null;
          searchedWeb = Boolean(data.searched);
        } else if (event === "token") {
          if (!streamMessage) {
            thinkingEl.remove();
            streamMessage = addStreamingMessage(timeCard, searchedWeb);
          }
          reply += data;
          renderStreamingMarkdown(streamMessage.bubble, reply);
          scrollToBottom();
        } else if (event === "error") {
          throw new Error(data.error || "Could not generate a response.");
        } else if (event === "done") {
          if (!streamMessage) {
            thinkingEl.remove();
            streamMessage = addStreamingMessage(timeCard, searchedWeb);
          }
          finishStreamingMessage(streamMessage, reply, sourceTurn);
          completed = true;
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done }).replace(/\r\n/g, "\n");

        let boundary;
        while ((boundary = buffer.indexOf("\n\n")) !== -1) {
          const rawEvent = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          handleEvent(rawEvent);
        }
        if (done) break;
      }

      if (!completed) throw new Error("The response stream ended unexpectedly.");
    } catch (err) {
      thinkingEl.remove();
      if (streamMessage) streamMessage.msg.remove();
      addErrorMessage(
        err.message || "Could not reach EduGenie. Check your internet connection and try again.",
        sourceTurn,
      );
    } finally {
      sendBtn.disabled = false;
    }
  };

  const sendMessage = async (text, files) => {
    if (greetMsg) greetMsg.style.display = "none";

    const filesToSend = files || [];
    const shouldSearch = webSearchEnabled;
    addMessage("user", text, filesToSend);
    inputEl.value = "";
    resetInputHeight();
    clearAttachments();
    // One-shot: search applies to this message only, then turns itself
    // off, so a follow-up like "who are you?" doesn't also trigger a
    // pointless search just because it was left on from the last message.
    setWebSearchEnabled(false);
    sendBtn.disabled = true;

    const thinkingEl = addThinkingIndicator();
    await performRequest(text, filesToSend, thinkingEl, shouldSearch);
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
      setWebSearchEnabled(false);
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
}