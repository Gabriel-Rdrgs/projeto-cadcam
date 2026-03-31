(() => {
  "use strict";

  /* ==========================================================================
     CONFIG
     ========================================================================== */

  const SELECTORS = {
    slides: ".slide",
    currentSlide: "#current-slide",
    totalSlides: "#total-slides",
    progressBar: "#hud-progress-bar",
    highlightOverlay: "#highlight-overlay",
    highlightText: "#highlight-text",
    themeToggle: "[data-theme-toggle]",
    navPrev: "[data-nav-prev]",
    navNext: "[data-nav-next]",
    particlesCanvas: "#intro-particles-canvas",
    slidesContainer: "#slides-container",
  };

  const STEP_SELECTOR = "[data-animate]";
  const COUNTER_SELECTOR = "[data-counter-target]";
  const HIGHLIGHT_TRIGGER_SELECTOR = "[data-highlight-trigger]";
  const TRANSITION_IN_CLASS = "slide-transition-in";
  const TRANSITION_OUT_CLASS = "slide-transition-out";

  const GROUP_MAP = {
    0: 0,
    1: 0,
    2: 0,
    3: 1,
    4: 1,
    5: 1,
    6: 2,
    7: 2,
    8: 2,
    9: 3,
    10: 3,
    11: 4,
    12: 4,
    13: 4,
    14: 5,
    15: 5,
  };

  const HIGHLIGHT_DEFAULTS = {
    0: ">50% das restaurações fixas já envolvem fluxo digital",
    3: "Precisão marginal < 50 μm em fluxos digitais bem calibrados",
    5: "Coroas monolíticas em zircônia podem atingir 95–100% de sobrevida em 5 anos",
    8: "Redução de 50–70% no tempo total de tratamento",
    10: "CAD/CAM combina menor número de visitas com alta satisfação do paciente",
  };

  /* ==========================================================================
     STATE
     ========================================================================== */

  const dom = {
    slides: Array.from(document.querySelectorAll(SELECTORS.slides)),
    currentSlideEl: document.querySelector(SELECTORS.currentSlide),
    totalSlidesEl: document.querySelector(SELECTORS.totalSlides),
    progressBarEl: document.querySelector(SELECTORS.progressBar),
    highlightOverlay: document.querySelector(SELECTORS.highlightOverlay),
    highlightTextEl: document.querySelector(SELECTORS.highlightText),
    themeToggle: document.querySelector(SELECTORS.themeToggle),
    navPrev: document.querySelector(SELECTORS.navPrev),
    navNext: document.querySelector(SELECTORS.navNext),
    particlesCanvas: document.querySelector(SELECTORS.particlesCanvas),
    slidesContainer: document.querySelector(SELECTORS.slidesContainer),
  };

  const state = {
    currentIndex: 0,
    currentStepIndex: 0,
    touchStartX: 0,
    touchStartY: 0,
    isAnimatingSlide: false,
    currentTheme: "dark",
    particles: [],
    particleCtx: null,
    particleAnimationFrame: null,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };

  /* ==========================================================================
     UTIL
     ========================================================================== */

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function padNumber(num) {
    return String(num).padStart(2, "0");
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function isGsapAvailable() {
    return typeof window.gsap !== "undefined";
  }

  function getSlideByIndex(index) {
    return dom.slides[index] || null;
  }

  function getSlideTransitionType(slide) {
    return slide?.dataset?.transition || "default";
  }

  function getSlideSteps(slide) {
    if (!slide) return [];
    return Array.from(slide.querySelectorAll(STEP_SELECTOR)).sort((a, b) => {
      if (a === b) return 0;
      if (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      return 1;
    });
  }

  function getVisibleSteps(slide) {
    return getSlideSteps(slide).filter((step) => step.classList.contains("is-visible"));
  }

  function updateHud() {
    if (dom.currentSlideEl) {
      dom.currentSlideEl.textContent = padNumber(state.currentIndex);
    }

    if (dom.totalSlidesEl) {
      dom.totalSlidesEl.textContent = padNumber(dom.slides.length - 1);
    }

    if (dom.progressBarEl) {
      const progress = (state.currentIndex / (dom.slides.length - 1)) * 100;
      dom.progressBarEl.style.width = `${progress}%`;
    }
  }

  function getCurrentGroup(index) {
    return GROUP_MAP[index] ?? index;
  }

  function getNextGroupIndex(currentIndex, direction = 1) {
    const currentGroup = getCurrentGroup(currentIndex);

    if (direction > 0) {
      for (let i = currentIndex + 1; i < dom.slides.length; i += 1) {
        if (getCurrentGroup(i) !== currentGroup) return i;
      }
      return currentIndex;
    }

    for (let i = currentIndex - 1; i >= 0; i -= 1) {
      if (getCurrentGroup(i) !== currentGroup) return i;
    }

    return currentIndex;
  }

  function clearStepVisibility(slide) {
    const steps = getSlideSteps(slide);
    steps.forEach((step) => step.classList.remove("is-visible"));
  }

  function resetSlideState(slide) {
    if (!slide) return;

    clearStepVisibility(slide);

    slide.querySelectorAll(".check-list li").forEach((item) => {
      item.classList.remove("check-visible");
    });

    slide.querySelectorAll(".timeline-point").forEach((point) => {
      point.style.transform = "";
    });

    const timelineAxisLine = slide.querySelector(".timeline-axis-line");
    if (timelineAxisLine) {
      timelineAxisLine.style.transform = "scaleY(0)";
    }

    const flowLine = slide.querySelector(".flow-line");
    if (flowLine) {
      flowLine.style.strokeDashoffset = "600";
    }

    slide.querySelectorAll(COUNTER_SELECTOR).forEach((counter) => {
      counter.dataset.counterAnimated = "false";

      const prefix = counter.dataset.counterPrefix || "";
      const suffix = counter.dataset.counterSuffix || "";
      const target = Number(counter.dataset.counterTarget || 0);

      if (prefix || suffix) {
        if (prefix.includes("<")) {
          counter.innerHTML = `${prefix}0${suffix}`;
        } else {
          counter.textContent = `${prefix}0${suffix}`;
        }
      } else {
        counter.textContent = String(target);
      }
    });

    const introStatCounter = slide.querySelector("#intro-stat-counter");
    if (introStatCounter) {
      introStatCounter.dataset.counterAnimated = "false";
      introStatCounter.textContent = "0%";
    }
  }

  function animateCounter(element) {
    if (!element || element.dataset.counterAnimated === "true") return;

    const target = Number(element.dataset.counterTarget || 0);
    const prefix = element.dataset.counterPrefix || "";
    const suffix = element.dataset.counterSuffix || "";
    const duration = state.reducedMotion ? 0 : 1000;
    const start = performance.now();

    element.dataset.counterAnimated = "true";

    if (duration === 0) {
      if (prefix.includes("<")) {
        element.innerHTML = `${prefix}${target}${suffix}`;
      } else {
        element.textContent = `${prefix}${target}${suffix}`;
      }
      return;
    }

    function update(now) {
      const elapsed = now - start;
      const progress = clamp(elapsed / duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(target * eased);

      if (prefix.includes("<")) {
        element.innerHTML = `${prefix}${currentValue}${suffix}`;
      } else {
        element.textContent = `${prefix}${currentValue}${suffix}`;
      }

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        if (prefix.includes("<")) {
          element.innerHTML = `${prefix}${target}${suffix}`;
        } else {
          element.textContent = `${prefix}${target}${suffix}`;
        }
      }
    }

    requestAnimationFrame(update);
  }

  function animateCountersInElement(container) {
    if (!container) return;
    container.querySelectorAll(COUNTER_SELECTOR).forEach(animateCounter);
  }

  function animateIntroStat(slide) {
    const introStatCounter = slide?.querySelector("#intro-stat-counter");
    if (!introStatCounter || introStatCounter.dataset.counterAnimated === "true") return;

    introStatCounter.dataset.counterAnimated = "true";

    const target = Number(introStatCounter.dataset.counterTarget || 50);
    const suffix = introStatCounter.dataset.counterSuffix || "%";
    const duration = state.reducedMotion ? 0 : 1200;
    const start = performance.now();

    if (duration === 0) {
      introStatCounter.textContent = `${target}${suffix}`;
      return;
    }

    function step(now) {
      const elapsed = now - start;
      const progress = clamp(elapsed / duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const value = Math.round(target * eased);

      introStatCounter.textContent = `${value}${suffix}`;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        introStatCounter.textContent = `${target}${suffix}`;
      }
    }

    requestAnimationFrame(step);
  }

  function animateCheckItem(item) {
    if (!item) return;
    item.classList.add("check-visible");
  }

  function animateTimelineProgress(slide) {
    if (!slide) return;

    const timelineItems = Array.from(slide.querySelectorAll(".timeline-item"));
    const timelineAxisLine = slide.querySelector(".timeline-axis-line");

    if (timelineAxisLine && timelineItems.length > 0) {
      const visibleCount = timelineItems.filter((item) =>
        item.classList.contains("is-visible")
      ).length;
      const progress = clamp(visibleCount / timelineItems.length, 0, 1);
      timelineAxisLine.style.transform = `scaleY(${progress})`;
    }

    timelineItems.forEach((item) => {
      if (item.classList.contains("is-visible")) {
        const point = item.querySelector(".timeline-point");
        if (point) {
          point.style.transform = "scale(1)";
        }
      }
    });
  }

  function animateFlowConnections(slide) {
    if (!slide) return;

    const flowLine = slide.querySelector(".flow-line");
    const flowSteps = slide.querySelectorAll('.flow-step.is-visible');
    const visibleCount = flowSteps.length;

    if (!flowLine) return;

    const maxDash = 600;
    const totalSteps = slide.querySelectorAll(".flow-step").length || 1;
    const ratio = clamp(visibleCount / totalSteps, 0, 1);
    flowLine.style.strokeDashoffset = String(maxDash - maxDash * ratio);
  }

  async function revealNextStep() {
    const slide = getSlideByIndex(state.currentIndex);
    const steps = getSlideSteps(slide);

    if (state.currentStepIndex >= steps.length) return false;

    const step = steps[state.currentStepIndex];
    if (!step) return false;

    const customDelay = Number(step.dataset.delay || 0);
    if (customDelay > 0 && !state.reducedMotion) {
      await sleep(customDelay * 1000);
    }

    step.classList.add("is-visible");
    state.currentStepIndex += 1;

    if (step.matches(COUNTER_SELECTOR)) {
      animateCounter(step);
    } else {
      animateCountersInElement(step);
    }

    if (step.matches(".timeline-item") || step.closest(".timeline-item")) {
      animateTimelineProgress(slide);
    }

    if (step.matches(".flow-step, .flow-arrow") || step.closest(".flow-container")) {
      animateFlowConnections(slide);
    }

    if (step.matches(".check-list li")) {
      animateCheckItem(step);
    }

    return true;
  }

  function hideLastStep() {
    const slide = getSlideByIndex(state.currentIndex);
    const steps = getSlideSteps(slide);

    if (state.currentStepIndex <= 0) return false;

    state.currentStepIndex -= 1;
    const step = steps[state.currentStepIndex];

    if (step) {
      step.classList.remove("is-visible");
    }

    animateTimelineProgress(slide);
    animateFlowConnections(slide);
    return true;
  }

  async function revealInitialStepSequence(slide) {
    if (!slide) return;

    if (slide.dataset.slide === "0") {
      animateIntroStat(slide);
    }

    const steps = getSlideSteps(slide);
    if (steps.length === 0) {
      animateCountersInElement(slide);
      return;
    }

    await revealNextStep();
  }

  function getDirectionClass(fromIndex, toIndex) {
    return toIndex >= fromIndex ? "forward" : "backward";
  }

  function applyTransitionStyles(slide, type, direction, phase) {
    if (!slide) return;

    slide.dataset.transitionPhase = phase;
    slide.dataset.transitionType = type;
    slide.dataset.transitionDirection = direction;
  }

  async function animateSlideTransition(prevSlide, nextSlide, nextIndex) {
    if (!nextSlide || state.isAnimatingSlide) return;
    state.isAnimatingSlide = true;

    const direction = getDirectionClass(state.currentIndex, nextIndex);
    const transitionType = getSlideTransitionType(nextSlide);

    if (prevSlide) {
      prevSlide.classList.remove(TRANSITION_IN_CLASS);
      prevSlide.classList.add(TRANSITION_OUT_CLASS);
      applyTransitionStyles(prevSlide, transitionType, direction, "out");
    }

    nextSlide.classList.add("is-active");
    nextSlide.classList.remove(TRANSITION_OUT_CLASS);
    nextSlide.classList.add(TRANSITION_IN_CLASS);
    applyTransitionStyles(nextSlide, transitionType, direction, "in");

    if (state.reducedMotion) {
      if (prevSlide) prevSlide.classList.remove("is-active", TRANSITION_OUT_CLASS);
      nextSlide.classList.remove(TRANSITION_IN_CLASS);
      state.isAnimatingSlide = false;
      return;
    }

    await sleep(420);

    if (prevSlide) {
      prevSlide.classList.remove("is-active", TRANSITION_OUT_CLASS);
    }

    nextSlide.classList.remove(TRANSITION_IN_CLASS);
    state.isAnimatingSlide = false;
  }

  async function activateSlide(index, options = {}) {
    const {
      skipInitialReveal = false,
      preserveDirection = false,
    } = options;

    if (index < 0 || index >= dom.slides.length) return;
    if (index === state.currentIndex && getSlideByIndex(index)?.classList.contains("is-active")) {
      return;
    }

    const prevSlide = getSlideByIndex(state.currentIndex);
    const nextSlide = getSlideByIndex(index);

    if (!nextSlide) return;

    if (prevSlide) {
      resetSlideState(prevSlide);
    }

    resetSlideState(nextSlide);

    await animateSlideTransition(prevSlide, nextSlide, index);

    state.currentIndex = index;
    state.currentStepIndex = 0;

    updateHud();

    if (!preserveDirection) {
      dom.slidesContainer?.focus?.();
    }

    if (!skipInitialReveal) {
      await revealInitialStepSequence(nextSlide);
    } else {
      animateCountersInElement(nextSlide);
    }
  }

  function getCurrentHighlightText() {
    const slide = getSlideByIndex(state.currentIndex);
    if (!slide) return HIGHLIGHT_DEFAULTS[state.currentIndex] || "Dado em destaque";

    const visibleHighlight =
      slide.querySelector(`${HIGHLIGHT_TRIGGER_SELECTOR}.is-visible`) ||
      slide.querySelector(HIGHLIGHT_TRIGGER_SELECTOR);

    if (visibleHighlight) {
      const label = visibleHighlight.querySelector(".data-label")?.textContent?.trim();
      const value = visibleHighlight.querySelector(".data-value")?.textContent?.trim();

      if (label && value) return `${label} · ${value}`;

      return visibleHighlight.textContent.trim();
    }

    const introCounter = slide.querySelector("#intro-stat-counter");
    if (introCounter && slide.dataset.slide === "0") {
      return `${introCounter.textContent.trim()} das restaurações fixas já envolvem fluxo digital`;
    }

    const fallback = HIGHLIGHT_DEFAULTS[state.currentIndex];
    return fallback || "CAD/CAM como ferramenta de precisão, previsibilidade e integração clínica";
  }

  function openHighlight() {
    if (!dom.highlightOverlay || !dom.highlightTextEl) return;
    dom.highlightTextEl.textContent = getCurrentHighlightText();
    dom.highlightOverlay.classList.add("is-visible");
    dom.highlightOverlay.setAttribute("aria-hidden", "false");
  }

  function closeHighlight() {
    if (!dom.highlightOverlay) return;
    dom.highlightOverlay.classList.remove("is-visible");
    dom.highlightOverlay.setAttribute("aria-hidden", "true");
  }

  function toggleHighlight() {
    if (!dom.highlightOverlay) return;

    if (dom.highlightOverlay.classList.contains("is-visible")) {
      closeHighlight();
      return;
    }

    openHighlight();
  }

  /* ==========================================================================
     THEME
     ========================================================================== */

  function getSystemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function renderThemeIcon(theme) {
    if (!dom.themeToggle) return;

    dom.themeToggle.innerHTML =
      theme === "dark"
        ? `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3A7 7 0 0 0 21 12.79z"></path>
          </svg>
        `
        : `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="4.5"></circle>
            <path d="M12 2v2.2M12 19.8V22M4.22 4.22l1.6 1.6M18.18 18.18l1.6 1.6M2 12h2.2M19.8 12H22M4.22 19.78l1.6-1.6M18.18 5.82l1.6-1.6"></path>
          </svg>
        `;
  }

  function applyTheme(theme) {
    state.currentTheme = theme;
    document.documentElement.setAttribute("data-theme", theme);
    renderThemeIcon(theme);

    if (dom.themeToggle) {
      dom.themeToggle.setAttribute(
        "aria-label",
        theme === "dark" ? "Alternar para tema claro" : "Alternar para tema escuro"
      );
    }
  }

  function toggleTheme() {
    const nextTheme = state.currentTheme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  }

  /* ==========================================================================
     PARTICLES · SLIDE 0
     ========================================================================== */

  function resizeParticlesCanvas() {
    if (!dom.particlesCanvas) return;

    const rect = dom.particlesCanvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;

    dom.particlesCanvas.width = rect.width * ratio;
    dom.particlesCanvas.height = rect.height * ratio;

    if (state.particleCtx) {
      state.particleCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
  }

  function createParticles() {
    if (!dom.particlesCanvas) return;

    const rect = dom.particlesCanvas.getBoundingClientRect();
    const amount = window.innerWidth < 768 ? 36 : 58;

    state.particles = Array.from({ length: amount }, () => ({
      x: Math.random() * rect.width,
      y: Math.random() * rect.height,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      radius: Math.random() * 1.8 + 1,
    }));
  }

  function drawParticles() {
    if (!state.particleCtx || !dom.particlesCanvas) return;

    const canvas = dom.particlesCanvas;
    const ctx = state.particleCtx;
    const width = canvas.getBoundingClientRect().width;
    const height = canvas.getBoundingClientRect().height;

    ctx.clearRect(0, 0, width, height);

    const introSlide = getSlideByIndex(0);
    const isIntroActive = introSlide?.classList.contains("is-active");

    if (!isIntroActive) {
      state.particleAnimationFrame = requestAnimationFrame(drawParticles);
      return;
    }

    state.particles.forEach((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;

      if (particle.x <= 0 || particle.x >= width) particle.vx *= -1;
      if (particle.y <= 0 || particle.y >= height) particle.vy *= -1;

      ctx.beginPath();
      ctx.fillStyle = "rgba(90, 220, 255, 0.9)";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "rgba(65, 225, 255, 0.8)";
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.closePath();
    });

    ctx.shadowBlur = 0;

    for (let i = 0; i < state.particles.length; i += 1) {
      for (let j = i + 1; j < state.particles.length; j += 1) {
        const a = state.particles[i];
        const b = state.particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 120) {
          const alpha = 1 - distance / 120;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(65, 225, 255, ${alpha * 0.18})`;
          ctx.lineWidth = 1;
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          ctx.closePath();
        }
      }
    }

    state.particleAnimationFrame = requestAnimationFrame(drawParticles);
  }

  function initParticles() {
    if (!dom.particlesCanvas) return;
    state.particleCtx = dom.particlesCanvas.getContext("2d");
    resizeParticlesCanvas();
    createParticles();
    drawParticles();
  }

  /* ==========================================================================
     GSAP MICRO-ANIMATIONS
     ========================================================================== */

  function runGsapEnhancements(slide) {
    if (!slide || !isGsapAvailable() || state.reducedMotion) return;

    const transitionType = getSlideTransitionType(slide);

    if (transitionType === "particles" || transitionType === "particles-out") {
      const title = slide.querySelector(".intro-title");
      const chips = slide.querySelectorAll(".chip");

      if (title) {
        window.gsap.fromTo(
          title,
          { clipPath: "inset(0 100% 0 0)", opacity: 0.3 },
          {
            clipPath: "inset(0 0% 0 0)",
            opacity: 1,
            duration: 1,
            ease: "power3.out",
          }
        );
      }

      if (chips.length) {
        window.gsap.fromTo(
          chips,
          { y: 10, opacity: 0, scale: 0.96 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.6,
            stagger: 0.06,
            ease: "back.out(1.5)",
          }
        );
      }
    }

    if (transitionType === "future") {
      const futureCards = slide.querySelectorAll(".future-card");
      if (futureCards.length) {
        window.gsap.fromTo(
          futureCards,
          { boxShadow: "0 0 0 rgba(0,0,0,0)" },
          {
            boxShadow: "0 0 22px rgba(246,198,106,0.35)",
            duration: 0.9,
            stagger: 0.08,
            repeat: 0,
          }
        );
      }
    }
  }

  /* ==========================================================================
     EVENT HANDLERS
     ========================================================================== */

  async function goNext() {
    const progressed = await revealNextStep();
    if (progressed) return;

    const nextIndex = Math.min(state.currentIndex + 1, dom.slides.length - 1);
    if (nextIndex !== state.currentIndex) {
      await activateSlide(nextIndex);
      runGsapEnhancements(getSlideByIndex(nextIndex));
    }
  }

  async function goPrev() {
    const reverted = hideLastStep();
    if (reverted) return;

    const prevIndex = Math.max(state.currentIndex - 1, 0);
    if (prevIndex !== state.currentIndex) {
      await activateSlide(prevIndex);
      runGsapEnhancements(getSlideByIndex(prevIndex));
    }
  }

  async function goNextGroup() {
    const nextIndex = getNextGroupIndex(state.currentIndex, 1);
    if (nextIndex !== state.currentIndex) {
      await activateSlide(nextIndex);
      runGsapEnhancements(getSlideByIndex(nextIndex));
    }
  }

  async function goPrevGroup() {
    const prevIndex = getNextGroupIndex(state.currentIndex, -1);
    if (prevIndex !== state.currentIndex) {
      await activateSlide(prevIndex);
      runGsapEnhancements(getSlideByIndex(prevIndex));
    }
  }

  async function handleKeyDown(event) {
    const key = event.key;

    if (dom.highlightOverlay?.classList.contains("is-visible")) {
      if (key === "Escape" || key === "d" || key === "D") {
        closeHighlight();
      }
      return;
    }

    switch (key) {
      case "ArrowRight":
      case " ":
      case "Enter":
        event.preventDefault();
        await goNext();
        break;

      case "ArrowLeft":
        event.preventDefault();
        await goPrev();
        break;

      case "ArrowDown":
        event.preventDefault();
        await goNextGroup();
        break;

      case "ArrowUp":
        event.preventDefault();
        await goPrevGroup();
        break;

      case "d":
      case "D":
        event.preventDefault();
        toggleHighlight();
        break;

      case "Escape":
        closeHighlight();
        break;

      default:
        break;
    }
  }

  function handleTouchStart(event) {
    const touch = event.changedTouches[0];
    state.touchStartX = touch.clientX;
    state.touchStartY = touch.clientY;
  }

  async function handleTouchEnd(event) {
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - state.touchStartX;
    const deltaY = touch.clientY - state.touchStartY;

    const horizontalSwipe = Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY);
    const verticalSwipe = Math.abs(deltaY) > 60 && Math.abs(deltaY) > Math.abs(deltaX);

    if (horizontalSwipe) {
      if (deltaX < 0) {
        await goNext();
      } else {
        await goPrev();
      }
      return;
    }

    if (verticalSwipe) {
      if (deltaY < 0) {
        await goNextGroup();
      } else {
        await goPrevGroup();
      }
    }
  }

  function bindEvents() {
    document.addEventListener("keydown", handleKeyDown);

    dom.highlightOverlay?.addEventListener("click", closeHighlight);
    dom.themeToggle?.addEventListener("click", toggleTheme);

    dom.navPrev?.addEventListener("click", goPrev);
    dom.navNext?.addEventListener("click", goNext);

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    window.addEventListener("resize", () => {
      resizeParticlesCanvas();
      createParticles();
    });

    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
      if (!document.documentElement.hasAttribute("data-theme-user")) {
        applyTheme(event.matches ? "dark" : "light");
      }
    });

    dom.themeToggle?.addEventListener("click", () => {
      document.documentElement.setAttribute("data-theme-user", "true");
    });
  }

  /* ==========================================================================
     LUCIDE
     ========================================================================== */

  function initIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  /* ==========================================================================
     INIT
     ========================================================================== */

  async function init() {
    if (!dom.slides.length) return;

    initIcons();
    applyTheme(getSystemTheme());
    updateHud();
    bindEvents();
    initParticles();

    dom.slides.forEach((slide, index) => {
      if (index !== 0) {
        slide.classList.remove("is-active");
      } else {
        slide.classList.add("is-active");
      }
      resetSlideState(slide);
    });

    state.currentIndex = 0;
    state.currentStepIndex = 0;

    await revealInitialStepSequence(getSlideByIndex(0));
    runGsapEnhancements(getSlideByIndex(0));
  }

  init();
})();