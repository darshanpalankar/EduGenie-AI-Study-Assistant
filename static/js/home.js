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

/* ---------- Features marquee (continuous horizontal auto-scroll) ---------- */

const featureTrackEl = document.getElementById("featureTrack");

if (featureTrackEl) {
  const MARQUEE_SPEED_PX_PER_SEC = 45;

  const prefersReducedMotionForMarquee = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (!prefersReducedMotionForMarquee) {
    // Clone the original cards once so the track holds two identical
    // sets back-to-back; animating from translateX(0) to translateX(-50%)
    // then loops seamlessly, since the second set picks up exactly
    // where the first one started.
    const originalCards = Array.from(featureTrackEl.children);
    originalCards.forEach((card) => {
      const clone = card.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      clone.setAttribute("tabindex", "-1");
      featureTrackEl.appendChild(clone);
    });

    // Base the animation duration on the actual rendered width of one
    // set of cards, so the drift speed stays consistent even if cards
    // are added/removed or resize at a breakpoint, rather than a fixed
    // duration that would speed up or slow down as content changes.
    const setWidth = featureTrackEl.scrollWidth / 2;
    const duration = setWidth / MARQUEE_SPEED_PX_PER_SEC;
    featureTrackEl.style.animationDuration = `${duration}s`;
  } else {
    featureTrackEl.dataset.static = "true";
  }
}

/* ---------- Smooth-scroll to in-page sections (e.g. #features) ---------- */
/* Computed in JS (rather than relying on CSS scroll-margin-top) so the
   fixed header offset stays correct regardless of the page's zoom:80%
   rule, which can make pure-CSS anchor scrolling land inconsistently. */

const homeReducedMotionQuery = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
);
const HEADER_SCROLL_PADDING = 20;

document.querySelectorAll('.home-page a[href^="#"]').forEach((link) => {
  const targetId = link.getAttribute("href").slice(1);
  if (!targetId) return;

  link.addEventListener("click", (e) => {
    const targetEl = document.getElementById(targetId);
    if (!targetEl) return;

    e.preventDefault();

    const headerEl = document.querySelector(".home-page .header");
    const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 0;
    const targetTop = targetEl.getBoundingClientRect().top + window.scrollY;

    window.scrollTo({
      top: Math.max(targetTop - headerHeight - HEADER_SCROLL_PADDING, 0),
      behavior: homeReducedMotionQuery.matches ? "auto" : "smooth",
    });

    if (homeNavbar) homeNavbar.classList.remove("active");
    history.pushState(null, "", `#${targetId}`);
  });
});

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