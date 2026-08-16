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

/* ---------- Features wheel carousel ---------- */
/* Cards sit in 3D space around a shallow "wheel": the active card faces
   forward at full size, and cards fall away to either side, rotated and
   scaled down, like spokes on a wheel. Each card's position is driven by
   CSS custom properties (--wx/--wz/--wr/--ws/--wo/--wzi) that get
   recalculated whenever the active index or viewport width changes. */

const featureWheelEl = document.getElementById("featureWheel");
const featureWheelStageEl = document.getElementById("featureWheelStage");

if (featureWheelEl && featureWheelStageEl) {
  const wheelCards = Array.from(featureWheelStageEl.children);
  const cardCount = wheelCards.length;

  const wheelPrevBtn = document.getElementById("featureWheelPrev");
  const wheelNextBtn = document.getElementById("featureWheelNext");
  const wheelDotsEl = document.getElementById("featureWheelDots");

  const AUTOPLAY_DELAY_MS = 1200;
  const TRANSITION_LOCK_MS = 750;

  const prefersReducedMotionForWheel = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  let currentIndex = 0;
  let autoplayTimerId = null;
  let isTransitioning = false;

  // Build one dot indicator per card.
  const dotEls = wheelCards.map((_, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "wheel-dot";
    dot.setAttribute("aria-label", `Go to feature ${i + 1}`);
    dot.addEventListener("click", () => {
      goToIndex(i);
      restartAutoplay();
    });
    wheelDotsEl?.appendChild(dot);
    return dot;
  });

  // Returns the CSS offsets to apply for a card at `offset` steps away
  // from the active card (0 = front and center, ±1/±2 = spoke positions
  // to either side). Sized down for narrower viewports.
  function getOffsetStyle(offset) {
    const width = window.innerWidth;

    const FRONT = { x: 0, z: 0, r: 0, s: 1, o: 1, zi: 5 };

    if (offset === 0) return FRONT;

    if (width <= 480) {
      // Only the active card is visible; neighbors wait just off-frame.
      const side = offset > 0 ? 1 : -1;
      return { x: side * 140, z: -160, r: side * -30, s: 0.7, o: 0, zi: 1 };
    }

    if (width <= 768) {
      if (Math.abs(offset) === 1) {
        const side = offset > 0 ? 1 : -1;
        return { x: side * 190, z: -150, r: side * -34, s: 0.76, o: 0.5, zi: 4 };
      }
      const side = offset > 0 ? 1 : -1;
      return { x: side * 190, z: -260, r: side * -34, s: 0.5, o: 0, zi: 1 };
    }

    if (Math.abs(offset) === 1) {
      const side = offset > 0 ? 1 : -1;
      return { x: side * 270, z: -170, r: side * -38, s: 0.82, o: 0.65, zi: 4 };
    }
    if (Math.abs(offset) === 2) {
      const side = offset > 0 ? 1 : -1;
      return { x: side * 480, z: -330, r: side * -50, s: 0.62, o: 0.28, zi: 3 };
    }
    const side = offset > 0 ? 1 : -1;
    return { x: side * 640, z: -460, r: side * -55, s: 0.5, o: 0, zi: 1 };
  }

  // Shortest signed distance from the active card, so cards take the
  // nearer path around the wheel when wrapping past the last/first card.
  function relativeOffset(index) {
    let diff = index - currentIndex;
    if (diff > cardCount / 2) diff -= cardCount;
    if (diff < -cardCount / 2) diff += cardCount;
    return diff;
  }

  function render() {
    wheelCards.forEach((card, i) => {
      const offset = relativeOffset(i);
      const style = getOffsetStyle(offset);

      card.style.setProperty("--wx", `${style.x}px`);
      card.style.setProperty("--wz", `${style.z}px`);
      card.style.setProperty("--wr", `${style.r}deg`);
      card.style.setProperty("--ws", style.s);
      card.style.setProperty("--wo", style.o);
      card.style.setProperty("--wzi", style.zi);

      const isActive = offset === 0;
      card.classList.toggle("is-active", isActive);
      card.setAttribute("aria-hidden", isActive ? "false" : "true");
      card.tabIndex = isActive ? 0 : -1;
      card.style.pointerEvents = style.o > 0 || isActive ? "auto" : "none";
    });

    dotEls.forEach((dot, i) => dot.classList.toggle("active", i === currentIndex));
  }

  function goToIndex(index) {
    currentIndex = ((index % cardCount) + cardCount) % cardCount;
    isTransitioning = true;
    render();
    window.clearTimeout(goToIndex._lockTimer);
    goToIndex._lockTimer = window.setTimeout(() => {
      isTransitioning = false;
    }, TRANSITION_LOCK_MS);
  }

  function goToNext() {
    goToIndex(currentIndex + 1);
  }

  function goToPrev() {
    goToIndex(currentIndex - 1);
  }

  function startAutoplay() {
    if (prefersReducedMotionForWheel) return;
    stopAutoplay();
    autoplayTimerId = window.setInterval(goToNext, AUTOPLAY_DELAY_MS);
  }

  function stopAutoplay() {
    if (autoplayTimerId) {
      window.clearInterval(autoplayTimerId);
      autoplayTimerId = null;
    }
  }

  function restartAutoplay() {
    stopAutoplay();
    startAutoplay();
  }

  // Clicking a side card brings it to the front instead of following its
  // link; clicking the already-active card follows the link as normal.
  wheelCards.forEach((card, i) => {
    card.addEventListener("click", (e) => {
      if (relativeOffset(i) !== 0) {
        e.preventDefault();
        if (!isTransitioning) {
          goToIndex(i);
          restartAutoplay();
        }
      }
    });
  });

  wheelPrevBtn?.addEventListener("click", () => {
    if (isTransitioning) return;
    goToPrev();
    restartAutoplay();
  });

  wheelNextBtn?.addEventListener("click", () => {
    if (isTransitioning) return;
    goToNext();
    restartAutoplay();
  });

  // Keyboard support when the wheel (or a card inside it) has focus.
  featureWheelEl.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goToNext();
      restartAutoplay();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goToPrev();
      restartAutoplay();
    }
  });

  // Pause on hover/focus so people can read the front card in peace.
  featureWheelEl.addEventListener("mouseenter", stopAutoplay);
  featureWheelEl.addEventListener("mouseleave", startAutoplay);
  featureWheelEl.addEventListener("focusin", stopAutoplay);
  featureWheelEl.addEventListener("focusout", startAutoplay);

  // Touch swipe support.
  let touchStartX = 0;
  let isSwiping = false;

  featureWheelEl.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.touches[0].clientX;
      isSwiping = true;
      stopAutoplay();
    },
    { passive: true }
  );

  featureWheelEl.addEventListener(
    "touchend",
    (e) => {
      if (!isSwiping) return;
      isSwiping = false;
      const deltaX = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(deltaX) > 40) {
        if (deltaX < 0) goToNext();
        else goToPrev();
      }
      startAutoplay();
    },
    { passive: true }
  );

  // Re-run the offset math on resize (debounced) so breakpoint changes
  // reposition the spokes instead of leaving stale desktop offsets.
  let resizeTimerId = null;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimerId);
    resizeTimerId = window.setTimeout(render, 150);
  });

  render();
  startAutoplay();
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