/**
 * CAD/CAM Presentation Engine
 * Navegação + animações + gráficos + partículas
 */

class PresentationEngine {
  constructor() {
    this.slides = Array.from(document.querySelectorAll('.slide'));
    this.currentIndex = 0;
    this.isTransitioning = false;
    this.stepIndex = 0;

    this.progressEl = document.getElementById('progress');

    this.init();
  }

  /* ===========================
     INIT
  ============================ */
  init() {
    if (!this.slides.length) return;

    this.showSlide(0, false);
    this.bindKeyboard();
    this.initParticles();
    this.initCharts();
    this.initResize();
  }

  /* ===========================
     SLIDES & STEPS
  ============================ */

  showSlide(index, animate = true) {
    if (index < 0 || index >= this.slides.length) return;

    const prevSlide = this.slides[this.currentIndex];
    const nextSlide = this.slides[index];

    if (prevSlide === nextSlide) {
      // mesma página: avança step interno
      this.playNextStep(nextSlide);
      return;
    }

    // troca de slide
    this.isTransitioning = true;

    // esconder slide anterior
    prevSlide.classList.remove('active');
    prevSlide.style.display = 'none';

    // reset de steps
    this.resetSteps(nextSlide);

    // mostrar novo slide
    nextSlide.style.display = 'flex';
    requestAnimationFrame(() => {
      nextSlide.classList.add('active');
    });

    this.currentIndex = index;
    this.updateProgress();

    // anima primeiro step do slide
    if (animate) {
      setTimeout(() => {
        this.playNextStep(nextSlide);
        this.isTransitioning = false;
      }, 50);
    } else {
      this.playNextStep(nextSlide);
      this.isTransitioning = false;
    }
  }

  playNextStep(slideEl) {
    const stepElements = Array.from(slideEl.querySelectorAll('[data-step]'));
    if (!stepElements.length) return;

    if (this.stepIndex < stepElements.length) {
      const el = stepElements[this.stepIndex];
      el.classList.add('animate');
      this.stepIndex += 1;
    } else {
      // todos os steps já apareceram, próximo slide
      this.showSlide(this.currentIndex + 1);
    }
  }

  resetSteps(slideEl) {
    this.stepIndex = 0;
    this.slides.forEach(slide => {
      slide.querySelectorAll('[data-step]').forEach(el => {
        el.classList.remove('animate');
      });
    });
  }

  updateProgress() {
    if (!this.progressEl) return;
    const percent = (this.currentIndex / (this.slides.length - 1)) * 100;
    this.progressEl.style.width = `${percent}%`;
  }

  /* ===========================
     KEYBOARD
  ============================ */

  bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (this.isTransitioning) return;

      if (['ArrowRight', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
        this.next();
      } else if (['ArrowLeft', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        this.prev();
      } else if (e.key === 'd' || e.key === 'D') {
        this.toggleHighlightMode();
      }
    });
  }

  next() {
    const currentSlideEl = this.slides[this.currentIndex];
    const stepElements = Array.from(currentSlideEl.querySelectorAll('[data-step]'));

    // se ainda há steps internos, toca próximo
    if (this.stepIndex < stepElements.length) {
      this.playNextStep(currentSlideEl);
    } else {
      // senão, vai pro próximo slide
      if (this.currentIndex < this.slides.length - 1) {
        this.showSlide(this.currentIndex + 1);
      }
    }
  }

  prev() {
    if (this.currentIndex === 0) return;
    this.showSlide(this.currentIndex - 1);
  }

  toggleHighlightMode() {
    document.body.classList.toggle('highlight-mode');
  }

  /* ===========================
     PARTICLE BACKGROUND
  ============================ */

  initParticles() {
    const canvas = document.getElementById('particles');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const PARTICLE_COUNT = 70;
    const particles = [];

    // criar partículas
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(this.createParticle(width, height));
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.save();
        ctx.beginPath();
        const color = Math.random() < 0.7 ? '#0ea5e9' : '#a855f7';
        ctx.fillStyle = color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowColor = color;
        ctx.shadowBlur = 18;
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      requestAnimationFrame(animate);
    };

    animate();

    // guardar função pra resize
    this.particlesCanvas = canvas;
    this.particlesCtx = ctx;
  }

  createParticle(width, height) {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 2.4 + 0.6,
      alpha: Math.random() * 0.5 + 0.2,
    };
  }

  /* ===========================
     CHARTS (Chart.js)
  ============================ */

  initCharts() {
    if (typeof Chart === 'undefined') return;

    // Precisão marginal (bar)
    const precisionCanvas = document.getElementById('chart-precision');
    if (precisionCanvas) {
      const ctx1 = precisionCanvas.getContext('2d');
      new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: ['CAD/CAM', 'Tradicional'],
          datasets: [
            {
              label: 'Precisão marginal (μm)',
              data: [45, 150],
              backgroundColor: [
                'rgba(14,165,233,0.9)',
                'rgba(148,163,184,0.4)'
              ],
              borderRadius: 10,
              borderSkipped: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                color: '#9ca3af',
                font: { size: 11 }
              },
              grid: {
                color: 'rgba(30,64,175,0.6)'
              }
            },
            x: {
              ticks: {
                color: '#e5e7eb',
                font: { size: 11 }
              },
              grid: { display: false }
            }
          }
        }
      });
    }

    // Satisfação (doughnut)
    const satCanvas = document.getElementById('chart-satisfaction');
    if (satCanvas) {
      const ctx2 = satCanvas.getContext('2d');
      new Chart(ctx2, {
        type: 'doughnut',
        data: {
          labels: ['CAD/CAM', 'Tradicional'],
          datasets: [
            {
              label: 'Satisfação do paciente (%)',
              data: [95, 82],
              backgroundColor: [
                'rgba(34,197,94,0.9)',
                'rgba(148,163,184,0.4)'
              ],
              borderWidth: 0,
              cutout: '70%'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          }
        }
      });
    }
  }

  /* ===========================
     RESIZE
  ============================ */

  initResize() {
    window.addEventListener('resize', () => {
      const canvas = document.getElementById('particles');
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    });
  }
}

/* ===========================
   BOOTSTRAP
=========================== */

document.addEventListener('DOMContentLoaded', () => {
  // Garante que todos os slides não ativos comecem escondidos
  const slides = document.querySelectorAll('.slide');
  slides.forEach((slide, index) => {
    if (index !== 0) {
      slide.style.display = 'none';
    } else {
      slide.style.display = 'flex';
    }
  });

  new PresentationEngine();
});