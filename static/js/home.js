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

/* ---------- Hero robot slideshow ---------- */

const heroRobotSlides = Array.from(
  document.querySelectorAll(".home-page .hero-robot-slide")
);

if (heroRobotSlides.length > 1) {
  const reduceRobotMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (!reduceRobotMotion) {
    const ROBOT_SLIDE_INTERVAL_MS = 4000;
    let activeRobotSlide = 0;

    window.setInterval(() => {
      heroRobotSlides[activeRobotSlide].classList.remove("is-active");
      activeRobotSlide = (activeRobotSlide + 1) % heroRobotSlides.length;
      heroRobotSlides[activeRobotSlide].classList.add("is-active");
    }, ROBOT_SLIDE_INTERVAL_MS);
  }
}

/* ---------- Features: auto-scroll marquee + pointer tilt ---------- */

const featureMarqueeEl = document.getElementById("featureMarquee");
const featureTrackEl = document.getElementById("featureMarqueeTrack");

if (featureMarqueeEl && featureTrackEl) {
  const prefersReducedMotionForMarquee = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const MAX_TILT_DEG = 8;

  function attachTilt(card) {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;

      const tiltX = (px - 0.5) * 2 * MAX_TILT_DEG;
      const tiltY = (0.5 - py) * 2 * MAX_TILT_DEG;

      card.style.setProperty("--tx", `${tiltX}deg`);
      card.style.setProperty("--ty", `${tiltY}deg`);
    });

    card.addEventListener("mouseleave", () => {
      card.style.setProperty("--tx", "0deg");
      card.style.setProperty("--ty", "0deg");
    });
  }

  const originalCards = Array.from(featureTrackEl.children);
  originalCards.forEach(attachTilt);

  if (prefersReducedMotionForMarquee) {
    featureTrackEl.classList.add("is-static");
  } else {
    // Duplicate the cards for a seamless loop. Scrolling the container (rather
    // than translating the track) keeps native finger swiping available.
    originalCards.forEach((card) => {
      const clone = card.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      clone.tabIndex = -1;
      attachTilt(clone);
      featureTrackEl.appendChild(clone);
    });

    const AUTO_SCROLL_SPEED = 0.8;
    const loopWidth =
      featureTrackEl.children[originalCards.length].offsetLeft -
      featureTrackEl.children[0].offsetLeft;
    let isFeatureScrollPaused = false;
    let lastFrameTime = null;

    const animateFeatures = (timestamp) => {
      if (lastFrameTime !== null && !isFeatureScrollPaused) {
        const elapsed = timestamp - lastFrameTime;
        featureMarqueeEl.scrollLeft += AUTO_SCROLL_SPEED * (elapsed / 16.67);

        if (featureMarqueeEl.scrollLeft >= loopWidth) {
          featureMarqueeEl.scrollLeft -= loopWidth;
        }
      }
      lastFrameTime = timestamp;
      animationFrameId = window.requestAnimationFrame(animateFeatures);
    };

    const pause = () => {
      isFeatureScrollPaused = true;
    };
    const resume = () => {
      isFeatureScrollPaused = false;
      lastFrameTime = null;
    };

    featureMarqueeEl.addEventListener("mouseenter", pause);
    featureMarqueeEl.addEventListener("mouseleave", resume);
    featureMarqueeEl.addEventListener("focusin", pause);
    featureMarqueeEl.addEventListener("focusout", resume);
    featureMarqueeEl.addEventListener("touchstart", pause, { passive: true });
    featureMarqueeEl.addEventListener("touchend", resume, { passive: true });
    featureMarqueeEl.addEventListener("touchcancel", resume, { passive: true });

  featureMarqueeEl.addEventListener("keydown", (event) => {
    const scrollAmount = Math.min(320, featureMarqueeEl.clientWidth * 0.8);

    if (event.key === "ArrowRight") {
      event.preventDefault();
      featureMarqueeEl.scrollBy({ left: scrollAmount, behavior: "smooth" });
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      featureMarqueeEl.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    }
  });

    window.requestAnimationFrame(animateFeatures);
  }
}

/* ---------- Testimonial stack (auto-cycling cards) ---------- */
/* A handful of testimonial cards sit stacked on top of one another. The
   front card is fully visible; the next couple peek out behind it, offset
   downward and scaled slightly smaller. Every few seconds the front card
   is retired to the back of the stack and the next one animates forward,
   mirroring the same offset-driven approach used for the features wheel. */

const testimonialStackEl = document.getElementById("testimonialStack");
const testimonialDotsEl = document.getElementById("testimonialDots");

if (testimonialStackEl) {
  const testimonialCards = Array.from(
    testimonialStackEl.querySelectorAll(".testimonial-card")
  );
  const testimonialCount = testimonialCards.length;

  const TESTIMONIAL_AUTOPLAY_MS = 4000;

  const prefersReducedMotionForTestimonials = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  let activeTestimonialIndex = 0;
  let testimonialTimerId = null;

  // Only the first three stack positions get a distinct look; anything
  // further back stays fully hidden until its turn comes around.
  const STACK_POSITIONS = [
    { y: 0, s: 1, o: 1, z: 4 },
    { y: 16, s: 0.95, o: 0.55, z: 3 },
    { y: 30, s: 0.9, o: 0.28, z: 2 },
  ];
  const HIDDEN_POSITION = { y: 42, s: 0.86, o: 0, z: 1 };

  const testimonialDotEls = testimonialCards.map((_, i) => {
    if (!testimonialDotsEl) return null;
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "wheel-dot";
    dot.setAttribute("aria-label", `Show testimonial ${i + 1}`);
    dot.addEventListener("click", () => {
      goToTestimonial(i);
      restartTestimonialAutoplay();
    });
    testimonialDotsEl.appendChild(dot);
    return dot;
  });

  function testimonialOffset(index) {
    let diff = index - activeTestimonialIndex;
    if (diff < 0) diff += testimonialCount;
    return diff;
  }

  function renderTestimonials() {
    testimonialCards.forEach((card, i) => {
      const offset = testimonialOffset(i);
      const pos = STACK_POSITIONS[offset] || HIDDEN_POSITION;

      card.style.setProperty("--sy", `${pos.y}px`);
      card.style.setProperty("--ss", pos.s);
      card.style.setProperty("--so", pos.o);
      card.style.setProperty("--sz", pos.z);

      const isActive = offset === 0;
      card.classList.toggle("is-active", isActive);
      card.setAttribute("aria-hidden", isActive ? "false" : "true");
    });

    testimonialDotEls.forEach((dot, i) => {
      dot?.classList.toggle("active", i === activeTestimonialIndex);
    });
  }

  function goToTestimonial(index) {
    activeTestimonialIndex = ((index % testimonialCount) + testimonialCount) % testimonialCount;
    renderTestimonials();
  }

  function goToNextTestimonial() {
    goToTestimonial(activeTestimonialIndex + 1);
  }

  function startTestimonialAutoplay() {
    if (prefersReducedMotionForTestimonials || testimonialCount < 2) return;
    stopTestimonialAutoplay();
    testimonialTimerId = window.setInterval(goToNextTestimonial, TESTIMONIAL_AUTOPLAY_MS);
  }

  function stopTestimonialAutoplay() {
    if (testimonialTimerId) {
      window.clearInterval(testimonialTimerId);
      testimonialTimerId = null;
    }
  }

  function restartTestimonialAutoplay() {
    stopTestimonialAutoplay();
    startTestimonialAutoplay();
  }

  testimonialStackEl.addEventListener("mouseenter", stopTestimonialAutoplay);
  testimonialStackEl.addEventListener("mouseleave", startTestimonialAutoplay);

  renderTestimonials();
  startTestimonialAutoplay();
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
    "Study Smarter, Not Harder",
    "Understand Any Concept",
    "Effortless Notes",
    "Smarter Coding",
    "Sharper Quizzes",
    "Faster Math",
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

/* ---------- Scroll-reveal animations (About / How It Works) ---------- */

const revealEls = document.querySelectorAll(".home-page [data-reveal]");

if (revealEls.length) {
  if (homeReducedMotionQuery.matches) {
    revealEls.forEach((el) => el.classList.add("in-view"));
  } else {
    revealEls.forEach((el) => {
      const delay = el.dataset.revealDelay;
      if (delay) el.style.transitionDelay = `${delay}ms`;
    });

    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );

    revealEls.forEach((el) => revealObserver.observe(el));
  }
}
