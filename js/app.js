const slides = Array.from(document.querySelectorAll(".slide"));
let currentIndex = 0;
let currentStepIndex = 0;

// Seleciona steps respeitando a ordem DOM, sem misturar coisas estáticas
function getSlideSteps(slide) {
  // Pega apenas descendentes diretos que realmente serão animados
  const stepSelectors = [
    ".step",
    ".step-timeline",
    ".step-flow",
    ".step-table",
    ".step-case"
  ];
  const nodeList = slide.querySelectorAll(stepSelectors.join(","));
  const steps = Array.from(nodeList);

  // Garante ordem pela posição no DOM (fallback mais seguro)
  steps.sort((a, b) => {
    // compara a posição relativa no DOM
    if (a === b) return 0;
    if (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    return 1;
  });

  return steps;
}

function activateSlide(index) {
  if (index < 0 || index >= slides.length) return;

  const prev = slides[currentIndex];
  if (prev) {
    prev.classList.remove("is-active");
    const prevSteps = getSlideSteps(prev);
    prevSteps.forEach((el) => el.classList.remove("is-visible"));
  }

  const slide = slides[index];
  slide.classList.add("is-active");
  currentIndex = index;
  currentStepIndex = 0;

  // Se você quiser que NENHUM step apareça até apertar →, comente a próxima linha:
  revealNextStep();
}

function revealNextStep() {
  const slide = slides[currentIndex];
  const steps = getSlideSteps(slide);

  if (currentStepIndex < steps.length) {
    steps[currentStepIndex].classList.add("is-visible");
    currentStepIndex += 1;
    return true;
  }
  return false;
}

function hideLastStep() {
  const slide = slides[currentIndex];
  const steps = getSlideSteps(slide);

  if (currentStepIndex > 0) {
    currentStepIndex -= 1;
    steps[currentStepIndex].classList.remove("is-visible");
    return true;
  }
  return false;
}

// Highlight (tecla D) — igual ao anterior, só reaproveitado
const highlightOverlay = document.getElementById("highlight-overlay");
const highlightTextEl = document.getElementById("highlight-text");

function toggleHighlight() {
  if (highlightOverlay.classList.contains("is-visible")) {
    highlightOverlay.classList.remove("is-visible");
    return;
  }

  const slide = slides[currentIndex];
  const highlightTarget =
    slide.querySelector('[data-highlight="true"].is-visible') ||
    slide.querySelector('[data-highlight="true"]');

  if (highlightTarget) {
    let text = "";
    if (highlightTarget.classList.contains("data-pill")) {
      const valueEl = highlightTarget.querySelector(".data-value");
      const labelEl = highlightTarget.querySelector(".data-label");
      text = valueEl ? valueEl.textContent.trim() : highlightTarget.textContent.trim();
      if (labelEl) {
        text = `${labelEl.textContent.trim()} · ${text}`;
      }
    } else if (highlightTarget.classList.contains("intro-stat-number")) {
      text = highlightTarget.textContent.trim() + " das restaurações são digitais";
    } else {
      text = highlightTarget.textContent.trim();
    }
    highlightTextEl.textContent = text;
  }

  highlightOverlay.classList.add("is-visible");
}

highlightOverlay.addEventListener("click", () => {
  highlightOverlay.classList.remove("is-visible");
});

function handleKeyDown(event) {
  const key = event.key;

  if (highlightOverlay.classList.contains("is-visible") && key === "Escape") {
    highlightOverlay.classList.remove("is-visible");
    return;
  }

  switch (key) {
    case "ArrowRight":
    case " ":
    case "Enter": {
      const progressed = revealNextStep();
      if (!progressed) {
        const nextIndex = Math.min(currentIndex + 1, slides.length - 1);
        if (nextIndex !== currentIndex) activateSlide(nextIndex);
      }
      break;
    }
    case "ArrowLeft": {
      const reverted = hideLastStep();
      if (!reverted) {
        const prevIndex = Math.max(currentIndex - 1, 0);
        if (prevIndex !== currentIndex) activateSlide(prevIndex);
      }
      break;
    }
    case "ArrowUp": {
      const prevIndex = Math.max(currentIndex - 1, 0);
      if (prevIndex !== currentIndex) activateSlide(prevIndex);
      break;
    }
    case "ArrowDown": {
      const nextIndex = Math.min(currentIndex + 1, slides.length - 1);
      if (nextIndex !== currentIndex) activateSlide(nextIndex);
      break;
    }
    case "d":
    case "D": {
      toggleHighlight();
      break;
    }
    default:
      break;
  }
}

document.addEventListener("keydown", handleKeyDown);
activateSlide(0);