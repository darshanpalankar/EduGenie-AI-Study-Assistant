/* =========================================================
   Math Solver — page-guarded, loads safely on any template.
   ========================================================= */
(function () {
  const input = document.getElementById('msProblemInput');
  if (!input) return; // not on this page

  const solveBtn      = document.getElementById('msSolveBtn');
  const clearBtn       = document.getElementById('msClearBtn');
  const copyBtn        = document.getElementById('msCopyBtn');
  const chipRow         = document.getElementById('msCategoryRow');
  const livePreview     = document.getElementById('msLivePreview');
  const emptyState      = document.getElementById('msEmptyState');
  const stepsList        = document.getElementById('msSteps');
  const answerCard       = document.getElementById('msAnswerCard');
  const answerValue      = document.getElementById('msAnswerValue');
  const solutionScroll   = document.getElementById('msSolutionScroll');

  let activeTopic = 'auto';
  let lastStepsForCopy = [];

  /* ---------- topic chips ---------- */
  chipRow.addEventListener('click', (e) => {
    const btn = e.target.closest('.ms-chip');
    if (!btn) return;
    chipRow.querySelectorAll('.ms-chip').forEach(c => c.classList.remove('is-active'));
    btn.classList.add('is-active');
    activeTopic = btn.dataset.topic;
  });

  /* ---------- example chips ---------- */
  document.querySelectorAll('.ms-example-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      input.value = chip.dataset.example;
      input.dispatchEvent(new Event('input'));
      input.focus();
    });
  });

  /* ---------- live preview (best-effort LaTeX render of the raw input) ---------- */
  input.addEventListener('input', () => {
    const val = input.value.trim();
    if (!val) { livePreview.innerHTML = ''; return; }

    // If the text is mostly English words (e.g. "Solve 567 * 54 using Vedic
    // Mathematics"), rendering it as LaTeX mashes every word together with
    // no spaces and italicizes each letter — show it as plain text instead.
    if (looksLikePlainText(val)) {
      livePreview.textContent = 'Preview: ' + val;
      return;
    }

    try {
      livePreview.innerHTML = 'Preview: ' + katex.renderToString(toLatexGuess(val), { throwOnError: false });
    } catch (err) {
      livePreview.textContent = 'Preview: ' + val;
    }
  });

  // A handful of common function names are fine inside real math notation;
  // anything else with 4+ letters in a row signals prose, not an expression.
  function looksLikePlainText(str) {
    const stripped = str.replace(/\b(sin|cos|tan|log|ln|sqrt|lim|max|min|mod)\b/gi, '');
    return /[a-zA-Z]{4,}/.test(stripped);
  }

  clearBtn.addEventListener('click', () => {
    input.value = '';
    livePreview.innerHTML = '';
    resetSolution();
    input.focus();
  });

  solveBtn.addEventListener('click', solve);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) solve();
  });

  copyBtn.addEventListener('click', copySteps);

  /* ---------- main solve flow ---------- */
  async function solve() {
    const problem = input.value.trim();
    if (!problem) { input.focus(); return; }

    setLoading(true);
    resetSolution();

    let result;
    try {
      result = await solveViaBackend(problem, activeTopic);
    } catch (err) {
      // Backend not available in this standalone preview — fall back to the
      // local demo solver so the page stays usable. Remove this fallback
      // once /api/math-solve is wired up in app.py.
      result = solveLocally(problem);
    }

    setLoading(false);

    if (!result) {
      showError("I couldn't parse that problem. Try rephrasing it, or pick a topic chip above and use one of the examples.");
      return;
    }
    renderSolution(result);
  }

  /* ---------- backend hook ----------
     Mirrors the existing /api/chat, /api/quiz, /api/mcqs pattern.
     Expected JSON shape from a MathSolver class + /api/math-solve route:
     { steps: [{ title, body, math }], answer: { text, math } }
  */
  async function solveViaBackend(problem, topic) {
    const res = await fetch('/api/math-solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ problem, topic })
    });
    if (!res.ok) throw new Error('backend unavailable: ' + res.status);
    return await res.json();
  }

  /* ---------- rendering ---------- */
  function renderSolution(result) {
    solutionScroll.scrollTop = 0;
    emptyState.hidden = true;
    stepsList.hidden = false;
    stepsList.innerHTML = '';
    lastStepsForCopy = [];

    result.steps.forEach((step, i) => {
      const li = document.createElement('li');
      li.className = 'ms-step';
      li.style.animationDelay = (i * 0.12) + 's';

      const mathHtml = step.math ? safeKatex(step.math, true) : '';

      li.innerHTML =
        '<span class="ms-step-number">' + (i + 1) + '</span>' +
        '<p class="ms-step-title">' + escapeHtml(step.title || 'Step ' + (i + 1)) + '</p>' +
        '<p class="ms-step-body">' + escapeHtml(step.body || '') + '</p>' +
        (mathHtml ? '<div class="ms-step-math">' + mathHtml + '</div>' : '');

      stepsList.appendChild(li);
      lastStepsForCopy.push(
        (i + 1) + '. ' + (step.title || '') + ' — ' + (step.body || '') + (step.math ? '  [' + step.math + ']' : '')
      );
    });

    if (result.answer) {
      answerCard.hidden = false;
      answerCard.style.animationDelay = (result.steps.length * 0.12) + 's';
      answerValue.innerHTML =
        (result.answer.math ? safeKatex(result.answer.math, true) : '') +
        (result.answer.text ? ' <span style="opacity:.85;font-family:var(--body-font);font-size:.85rem;font-weight:400;">' + escapeHtml(result.answer.text) + '</span>' : '');
      lastStepsForCopy.push('Final answer: ' + (result.answer.math || result.answer.text || ''));
    }

    copyBtn.hidden = false;
  }

  function resetSolution() {
    emptyState.hidden = false;
    stepsList.hidden = true;
    stepsList.innerHTML = '';
    answerCard.hidden = true;
    copyBtn.hidden = true;
    copyBtn.classList.remove('is-copied');
    copyBtn.textContent = 'Copy steps';
    const err = solutionScroll.querySelector('.ms-error');
    if (err) err.remove();
  }

  function showError(message) {
    solutionScroll.scrollTop = 0;
    emptyState.hidden = true;
    const div = document.createElement('div');
    div.className = 'ms-error';
    div.textContent = message;
    solutionScroll.appendChild(div);
  }

  function setLoading(isLoading) {
    solveBtn.disabled = isLoading;
    solveBtn.classList.toggle('is-loading', isLoading);
  }

  function safeKatex(latex, displayMode = false) {
    const expression = unwrapMathDelimiters(latex);
    if (!expression) return '';
    try {
      return katex.renderToString(expression, { throwOnError: false, displayMode });
    } catch (err) {
      return escapeHtml(expression);
    }
  }

  function unwrapMathDelimiters(latex) {
    let expression = String(latex || '').trim();
    const delimiterPairs = [
      ['$$', '$$'],
      ['\\[', '\\]'],
      ['\\(', '\\)'],
      ['$', '$'],
    ];

    for (const [opening, closing] of delimiterPairs) {
      if (expression.startsWith(opening) && expression.endsWith(closing) && expression.length > opening.length + closing.length) {
        expression = expression.slice(opening.length, -closing.length).trim();
        break;
      }
    }
    return expression;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---------- copy to clipboard (LAN-safe fallback) ---------- */
  function copySteps() {
    const text = lastStepsForCopy.join('\n');
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(markCopied);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (err) { /* no-op */ }
      document.body.removeChild(ta);
      markCopied();
    }
  }
  function markCopied() {
    copyBtn.textContent = 'Copied ✓';
    copyBtn.classList.add('is-copied');
    setTimeout(() => {
      copyBtn.textContent = 'Copy steps';
      copyBtn.classList.remove('is-copied');
    }, 1800);
  }

  /* =========================================================
     Local demo solver — handles a handful of common problem
     shapes so the page is interactive without a live backend.
     Swap this out once Gemini is wired up server-side.
     ========================================================= */
  function solveLocally(raw) {
    const problem = raw.trim();

    return (
      solveLinear(problem) ||
      solveQuadratic(problem) ||
      solvePercentage(problem) ||
      solveDerivative(problem) ||
      solveArithmetic(problem)
    );
  }

  // ax + b = c
  function solveLinear(problem) {
    const m = problem.match(/([+-]?\s*\d*\.?\d*)\s*x\s*([+-]\s*\d+\.?\d*)?\s*=\s*([+-]?\s*\d+\.?\d*)\s*$/i);
    if (!m || /x\s*\^?\s*2/i.test(problem)) return null;

    const a = parseCoef(m[1]);
    const b = m[2] ? parseFloat(m[2].replace(/\s/g, '')) : 0;
    const c = parseFloat(m[3]);
    if (!isFinite(a) || a === 0 || !isFinite(c)) return null;

    const x = (c - b) / a;
    const steps = [
      { title: 'Identify the equation', body: 'A linear equation in one variable.', math: fmtLinear(a, b) + ' = ' + c },
      { title: 'Isolate the variable term', body: `Subtract ${b} from both sides.`, math: fmtTerm(a) + 'x = ' + (c - b) },
      { title: 'Divide both sides by the coefficient', body: `Divide by ${a} to solve for x.`, math: 'x = \\frac{' + (c - b) + '}{' + a + '}' }
    ];
    return { steps, answer: { math: 'x = ' + roundClean(x) } };
  }

  // ax^2 + bx + c = 0
  function solveQuadratic(problem) {
    const m = problem.match(/([+-]?\s*\d*\.?\d*)\s*x\s*\^?\s*2\s*([+-]\s*\d*\.?\d*\s*x)?\s*([+-]\s*\d+\.?\d*)?\s*=\s*0/i);
    if (!m) return null;

    const a = parseCoef(m[1]);
    const b = m[2] ? parseCoef(m[2].replace(/x/i, '')) : 0;
    const c = m[3] ? parseFloat(m[3].replace(/\s/g, '')) : 0;
    if (!isFinite(a) || a === 0) return null;

    const disc = b * b - 4 * a * c;
    const eq = `${fmtTerm(a)}x^2 ${fmtSigned(b)}x ${fmtSigned(c)} = 0`;

    const steps = [
      { title: 'Identify a, b, c', body: `a = ${a}, b = ${b}, c = ${c}`, math: eq },
      { title: 'Compute the discriminant', body: 'Δ = b² − 4ac tells us how many real roots exist.', math: `\\Delta = (${b})^2 - 4(${a})(${c}) = ${roundClean(disc)}` },
    ];

    if (disc < 0) {
      steps.push({ title: 'Interpret the discriminant', body: 'Δ is negative, so there are no real roots — only complex ones.', math: '' });
      return { steps, answer: { text: 'No real solutions (complex roots only)' } };
    }

    const sqrtDisc = Math.sqrt(disc);
    const x1 = (-b + sqrtDisc) / (2 * a);
    const x2 = (-b - sqrtDisc) / (2 * a);

    steps.push({
      title: 'Apply the quadratic formula',
      body: 'x = (−b ± √Δ) / 2a',
      math: `x = \\frac{-(${b}) \\pm \\sqrt{${roundClean(disc)}}}{2(${a})}`
    });

    const answerMath = Math.abs(x1 - x2) < 1e-9
      ? `x = ${roundClean(x1)}`
      : `x_1 = ${roundClean(x1)}, \\ x_2 = ${roundClean(x2)}`;

    return { steps, answer: { math: answerMath } };
  }

  // "what is X% of Y"
  function solvePercentage(problem) {
    const m = problem.match(/([\d.]+)\s*%\s*of\s*([\d.]+)/i);
    if (!m) return null;
    const pct = parseFloat(m[1]);
    const of = parseFloat(m[2]);
    const result = (pct / 100) * of;
    const steps = [
      { title: 'Convert the percentage to a decimal', body: `${pct}% becomes ${pct}/100.`, math: `${pct}\\% = \\frac{${pct}}{100} = ${roundClean(pct / 100)}` },
      { title: 'Multiply by the base value', body: `Multiply the decimal by ${of}.`, math: `${roundClean(pct / 100)} \\times ${of} = ${roundClean(result)}` }
    ];
    return { steps, answer: { math: roundClean(result) + '' } };
  }

  // derivative of a polynomial: "derivative ... f(x) = 3x^3 - 2x^2 + 5"
  function solveDerivative(problem) {
    if (!/derivative|differentiate|d\/dx/i.test(problem)) return null;
    const m = problem.match(/=\s*(.+)$/);
    if (!m) return null;

    const terms = parsePolynomial(m[1]);
    if (!terms.length) return null;

    const derived = terms
      .filter(t => t.power > 0)
      .map(t => ({ coef: t.coef * t.power, power: t.power - 1 }))
      .filter(t => t.coef !== 0);

    const steps = [
      { title: 'Start with the original function', body: 'Apply the power rule to each term: d/dx[xⁿ] = n·xⁿ⁻¹.', math: 'f(x) = ' + fmtPolynomial(terms) },
      { title: 'Differentiate term by term', body: 'Multiply each coefficient by its exponent, then reduce the exponent by 1.', math: "f'(x) = " + (derived.length ? fmtPolynomial(derived) : '0') }
    ];
    return { steps, answer: { math: "f'(x) = " + (derived.length ? fmtPolynomial(derived) : '0') } };
  }

  // plain arithmetic fallback, e.g. "12 * (4 + 3) - 5"
  function solveArithmetic(problem) {
    const cleaned = problem.replace(/[^0-9+\-*/().\s]/g, '');
    if (!cleaned.trim() || !/\d/.test(cleaned)) return null;
    let value;
    try {
      // eslint-disable-next-line no-new-func
      value = Function('"use strict"; return (' + cleaned + ')')();
    } catch (err) {
      return null;
    }
    if (typeof value !== 'number' || !isFinite(value)) return null;
    return {
      steps: [{ title: 'Evaluate the expression', body: 'Follow order of operations (PEMDAS).', math: cleaned + ' = ' + roundClean(value) }],
      answer: { math: roundClean(value) + '' }
    };
  }

  /* ---------- small parsing / formatting helpers ---------- */
  function parseCoef(str) {
    if (str === undefined) return NaN;
    const s = str.replace(/\s/g, '');
    if (s === '' || s === '+') return 1;
    if (s === '-') return -1;
    return parseFloat(s);
  }
  function fmtTerm(a) { return a === 1 ? '' : a === -1 ? '-' : roundClean(a) + ''; }
  function fmtLinear(a, b) { return fmtTerm(a) + 'x' + fmtSigned(b); }
  function fmtSigned(n) { return n === 0 ? '' : (n > 0 ? ' + ' + roundClean(n) : ' - ' + roundClean(-n)); }
  function roundClean(n) {
    const r = Math.round(n * 1000) / 1000;
    return Object.is(r, -0) ? 0 : r;
  }

  function parsePolynomial(str) {
    const normalized = str.replace(/\s/g, '').replace(/-/g, '+-');
    return normalized.split('+').filter(Boolean).map(term => {
      const xm = term.match(/x(?:\^(\d+))?/i);
      if (xm) {
        const power = xm[1] ? parseInt(xm[1], 10) : 1;
        const coefStr = term.replace(xm[0], '');
        const coef = coefStr === '' ? 1 : coefStr === '-' ? -1 : parseFloat(coefStr);
        return { coef, power };
      }
      return { coef: parseFloat(term), power: 0 };
    }).filter(t => isFinite(t.coef));
  }
  function fmtPolynomial(terms) {
    return terms.map((t, i) => {
      const abs = Math.abs(t.coef);
      const sign = t.coef < 0 ? '-' : (i === 0 ? '' : '+');
      const coefPart = (abs === 1 && t.power > 0) ? '' : roundClean(abs) + '';
      const xPart = t.power === 0 ? '' : t.power === 1 ? 'x' : 'x^' + t.power;
      return `${sign}${coefPart}${xPart}`;
    }).join(' ').replace(/\s?\+/g, ' + ').replace(/\s?-/g, ' - ').trim();
  }

  // rough LaTeX-ifier for the live preview only (best-effort, not used for solving)
  function toLatexGuess(str) {
    return str
      .replace(/\^(\d+)/g, '^{$1}')
      .replace(/sqrt\(([^)]+)\)/gi, '\\sqrt{$1}')
      .replace(/\*/g, '\\times ');
  }
})();
