(function () {
  "use strict";

  var form = document.getElementById("notesForm");

  var topicInput = document.getElementById("topicInput");
  var topicCount = document.getElementById("topicCount");

  var classLevelSelect = document.getElementById("classLevel");
  var noteStyleSelect = document.getElementById("noteStyle");

  var pagesValueEl = document.getElementById("pagesValue");
  var pagesInput = document.getElementById("pagesInput");
  var pagesDecrement = document.getElementById("pagesDecrement");
  var pagesIncrement = document.getElementById("pagesIncrement");

  var generateBtn = document.getElementById("generateBtn");

  var outputActions = document.getElementById("outputActions");
  var copyBtn = document.getElementById("copyBtn");
  var downloadBtn = document.getElementById("downloadBtn");
  var clearBtn = document.getElementById("clearBtn");

  var emptyState = document.getElementById("emptyState");
  var loadingState = document.getElementById("loadingState");
  var errorState = document.getElementById("errorState");
  var errorMessage = document.getElementById("errorMessage");
  var retryBtn = document.getElementById("retryBtn");

  var notesResult = document.getElementById("notesResult");
  var notesTopic = document.getElementById("notesTopic");
  var notesSections = document.getElementById("notesSections");

  var outputFooter = document.getElementById("outputFooter");
  var statWords = document.getElementById("statWords");
  var statPages = document.getElementById("statPages");
  var statTime = document.getElementById("statTime");

  var MIN_PAGES = 1;
  var MAX_PAGES = 10;
  var WORDS_PER_PAGE = 275;

  var lastTopic = "";
  var lastRawNotes = "";
  var isGenerating = false;
  var generatedAt = null;
  var timeUpdateTimer = null;

  // ---------------------------------------------------------------------
  // Topic / key points textareas: char counter + auto-grow
  // ---------------------------------------------------------------------

  function wireCounter(textarea, counterEl) {
    textarea.addEventListener("input", function () {
      counterEl.textContent = String(textarea.value.length);
    });
  }

  wireCounter(topicInput, topicCount);

  // Ctrl+Enter / Cmd+Enter submits from the topic textarea
  [topicInput].forEach(function (el) {
    el.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        form.requestSubmit ? form.requestSubmit() : handleSubmit(e);
      }
    });
  });

  // ---------------------------------------------------------------------
  // Number-of-pages stepper
  // ---------------------------------------------------------------------

  function setPages(value) {
    var clamped = Math.max(MIN_PAGES, Math.min(MAX_PAGES, value));
    pagesValueEl.textContent = String(clamped);
    pagesInput.value = String(clamped);
    pagesDecrement.disabled = clamped <= MIN_PAGES;
    pagesIncrement.disabled = clamped >= MAX_PAGES;
  }

  pagesDecrement.addEventListener("click", function () {
    setPages(parseInt(pagesInput.value, 10) - 1);
  });

  pagesIncrement.addEventListener("click", function () {
    setPages(parseInt(pagesInput.value, 10) + 1);
  });

  setPages(1);

  // ---------------------------------------------------------------------
  // State switching
  // ---------------------------------------------------------------------

  function showState(name) {
    emptyState.hidden = name !== "empty";
    loadingState.hidden = name !== "loading";
    errorState.hidden = name !== "error";
    notesResult.hidden = name !== "notes";
    outputActions.hidden = name !== "notes";
    outputFooter.hidden = name !== "notes";

    if (name !== "notes" && timeUpdateTimer) {
      clearInterval(timeUpdateTimer);
      timeUpdateTimer = null;
    }
  }

  function setGenerating(loading) {
    isGenerating = loading;
    generateBtn.disabled = loading;
    generateBtn.classList.toggle("is-loading", loading);
    generateBtn.querySelector("span").textContent = loading ? "Generating\u2026" : "Generate Notes";
  }

  // ---------------------------------------------------------------------
  // Parsing: the generator returns plain text -
  //   "Heading:" lines start a section, "- point" lines are bullets under
  //   the current section, and any other non-empty line is treated as
  //   flowing paragraph text under the current (or a default) section.
  //   Points are tagged so rendering can tell bullets, prose, and
  //   equation-style lines (containing "\u2192") apart.
  // ---------------------------------------------------------------------

  function classifyPoint(text) {
    if (text.indexOf("\u2192") !== -1) return "equation";
    return "bullet";
  }

  function parseNotes(raw) {
    var lines = (raw || "").split("\n");
    var sections = [];
    var current = null;

    function ensureSection() {
      if (!current) {
        current = { heading: "Notes", points: [] };
        sections.push(current);
      }
      return current;
    }

    lines.forEach(function (line) {
      var trimmed = line.trim();
      if (!trimmed) return;

      var isBulletLine = /^[-*\u2022]\s*/.test(trimmed);
      var isHeading = !isBulletLine && /:\s*$/.test(trimmed) && trimmed.length < 90;

      if (isHeading) {
        current = { heading: trimmed.replace(/:\s*$/, "").replace(/^\d+[.)]\s*/, ""), points: [] };
        sections.push(current);
      } else if (isBulletLine) {
        var point = trimmed.replace(/^[-*\u2022]\s*/, "");
        ensureSection().points.push({ text: point, type: classifyPoint(point) });
      } else {
        ensureSection().points.push({ text: trimmed, type: classifyPoint(trimmed) === "equation" ? "equation" : "text" });
      }
    });

    return sections;
  }

  // Groups a flat list of typed points into render blocks, preserving
  // order: consecutive "text" points merge into one paragraph, consecutive
  // "bullet" points merge into one list, each "equation" point stands alone.
  function groupPoints(points) {
    var blocks = [];
    points.forEach(function (point) {
      var last = blocks[blocks.length - 1];
      if (point.type === "equation") {
        blocks.push({ type: "equation", text: point.text });
      } else if (point.type === "text") {
        if (last && last.type === "paragraph") {
          last.lines.push(point.text);
        } else {
          blocks.push({ type: "paragraph", lines: [point.text] });
        }
      } else {
        if (last && last.type === "list") {
          last.items.push(point.text);
        } else {
          blocks.push({ type: "list", items: [point.text] });
        }
      }
    });
    return blocks;
  }

  function renderNotes(raw, topic) {
    var sections = parseNotes(raw);
    notesTopic.textContent = topic;
    notesSections.innerHTML = "";

    if (!sections.length) {
      notesSections.innerHTML = '<p style="color:var(--ink-dim);font-size:13.5px;">No notes came back for this topic. Try rephrasing it.</p>';
      return;
    }

    sections.forEach(function (section, index) {
      var card = document.createElement("div");
      card.className = "ng-note-section";

      var heading = document.createElement("h3");
      heading.className = "ng-note-heading";
      heading.setAttribute("data-index", String(index + 1));
      heading.textContent = section.heading;
      card.appendChild(heading);

      groupPoints(section.points).forEach(function (block) {
        if (block.type === "paragraph") {
          var p = document.createElement("p");
          p.className = "ng-note-paragraph";
          p.textContent = block.lines.join(" ");
          card.appendChild(p);
        } else if (block.type === "list") {
          var list = document.createElement("ul");
          list.className = "ng-note-points";
          block.items.forEach(function (item) {
            var li = document.createElement("li");
            li.textContent = item;
            list.appendChild(li);
          });
          card.appendChild(list);
        } else if (block.type === "equation") {
          var box = document.createElement("div");
          box.className = "ng-equation-box";
          var formula = document.createElement("div");
          formula.className = "ng-equation-formula";
          formula.textContent = block.text;
          box.appendChild(formula);
          card.appendChild(box);
        }
      });

      notesSections.appendChild(card);
    });
  }

  // ---------------------------------------------------------------------
  // Stats footer: word/page counts + relative "generated" timestamp
  // ---------------------------------------------------------------------

  function countWords(text) {
    var matches = (text || "").trim().match(/\S+/g);
    return matches ? matches.length : 0;
  }

  function formatRelativeTime(from) {
    var seconds = Math.floor((Date.now() - from) / 1000);
    if (seconds < 45) return "Generated just now";
    var minutes = Math.floor(seconds / 60);
    if (minutes < 60) return "Generated " + minutes + "m ago";
    var hours = Math.floor(minutes / 60);
    if (hours < 24) return "Generated " + hours + "h ago";
    var days = Math.floor(hours / 24);
    return "Generated " + days + "d ago";
  }

  function updateStats(raw) {
    var words = countWords(raw);
    var pages = Math.max(1, Math.ceil(words / WORDS_PER_PAGE));
    statWords.textContent = String(words);
    statPages.textContent = String(pages);

    generatedAt = Date.now();
    statTime.textContent = "Generated just now";

    if (timeUpdateTimer) clearInterval(timeUpdateTimer);
    timeUpdateTimer = setInterval(function () {
      statTime.textContent = formatRelativeTime(generatedAt);
    }, 30000);
  }

  // ---------------------------------------------------------------------
  // Submit / fetch
  // ---------------------------------------------------------------------

  function handleSubmit(e) {
    if (e) e.preventDefault();
    if (isGenerating) return;

    var topic = topicInput.value.trim();
    if (!topic) {
      topicInput.focus();
      return;
    }

    lastTopic = topic;

    generate({
      topic: topic,
      key_points: "",
      class_level: classLevelSelect.value,
      note_style: noteStyleSelect.value,
      pages: parseInt(pagesInput.value, 10) || 1
    });
  }

  function generate(payload) {
    setGenerating(true);
    showState("loading");

    fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res
          .json()
          .catch(function () {
            // Response wasn't JSON at all (proxy error page, server down, etc.)
            throw new Error("EduGenie couldn't reach the server right now. Please try again.");
          })
          .then(function (data) {
            if (!res.ok) {
              throw new Error(data && data.error ? data.error : "Something went wrong. Please try again.");
            }
            return data;
          });
      })
      .then(function (data) {
        lastRawNotes = data.notes || "";
        renderNotes(lastRawNotes, lastTopic);
        updateStats(lastRawNotes);
        showState("notes");
      })
      .catch(function (err) {
        errorMessage.textContent = err.message || "Something went wrong. Please try again.";
        showState("error");
      })
      .finally(function () {
        setGenerating(false);
      });
  }

  form.addEventListener("submit", handleSubmit);
  retryBtn.addEventListener("click", function () {
    if (lastTopic) {
      generate({
        topic: lastTopic,
        key_points: "",
        class_level: classLevelSelect.value,
        note_style: noteStyleSelect.value,
        pages: parseInt(pagesInput.value, 10) || 1
      });
    }
  });

  // ---------------------------------------------------------------------
  // Toolbar actions: copy / download / clear
  // ---------------------------------------------------------------------

  function flashConfirm(btn, iconClass) {
    var icon = btn.querySelector("i");
    var original = icon.className;
    icon.className = iconClass;
    btn.classList.add("is-confirmed");
    setTimeout(function () {
      icon.className = original;
      btn.classList.remove("is-confirmed");
    }, 1400);
  }

  copyBtn.addEventListener("click", function () {
    if (!lastRawNotes) return;
    // copyToClipboard is defined in base.js (loaded before this file) and
    // already handles the HTTPS-only navigator.clipboard fallback.
    copyToClipboard(lastRawNotes)
      .then(function () {
        flashConfirm(copyBtn, "ri-check-line");
      })
      .catch(function () {
        errorMessage.textContent = "Couldn't copy to clipboard. Try selecting and copying manually.";
      });
  });

  downloadBtn.addEventListener("click", function () {
    if (!lastRawNotes) return;
    var filename = (lastTopic || "notes").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    var blob = new Blob([lastRawNotes], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = (filename || "notes") + ".txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flashConfirm(downloadBtn, "ri-check-line");
  });

  clearBtn.addEventListener("click", function () {
    lastRawNotes = "";
    notesSections.innerHTML = "";
    notesTopic.textContent = "";
    showState("empty");
  });
})();