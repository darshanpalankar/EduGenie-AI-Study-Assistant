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

/* ---------- Hero heading typewriter ---------- */

const heroTypewriterEl = document.getElementById("heroTypewriter");

if (heroTypewriterEl) {
  // Edit this list to change what the hero heading cycles through.
  const TYPEWRITER_PHRASES = [
    "Smarter Learning",
    "Faster Answers",
    "Better Grades",
    "Effortless Notes",
  ];

  const TYPE_SPEED_MS = 65;
  const DELETE_SPEED_MS = 35;
  const PAUSE_AFTER_TYPE_MS = 1600;
  const PAUSE_AFTER_DELETE_MS = 300;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (prefersReducedMotion) {
    heroTypewriterEl.textContent = TYPEWRITER_PHRASES[0];
  } else {
    let phraseIndex = 0;
    let charIndex = 0;
    let deleting = false;

    const tick = () => {
      const phrase = TYPEWRITER_PHRASES[phraseIndex];

      if (!deleting) {
        charIndex++;
        heroTypewriterEl.textContent = phrase.slice(0, charIndex);

        if (charIndex === phrase.length) {
          deleting = true;
          setTimeout(tick, PAUSE_AFTER_TYPE_MS);
          return;
        }
        setTimeout(tick, TYPE_SPEED_MS);
      } else {
        charIndex--;
        heroTypewriterEl.textContent = phrase.slice(0, charIndex);

        if (charIndex === 0) {
          deleting = false;
          phraseIndex = (phraseIndex + 1) % TYPEWRITER_PHRASES.length;
          setTimeout(tick, PAUSE_AFTER_DELETE_MS);
          return;
        }
        setTimeout(tick, DELETE_SPEED_MS);
      }
    };

    heroTypewriterEl.textContent = "";
    setTimeout(tick, TYPE_SPEED_MS);
  }
}