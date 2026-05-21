/* ══════════════════════════════════════════════
   COMO ADICIONAR OU TROCAR IMAGENS
   ─────────────────────────────────────────────
   1. Coloque o arquivo de imagem dentro de:
         assets/imgs/

   2. Encontre a chave correspondente ao slide
      na lista abaixo (ex.: 'scanner')

   3. Troque o nome do arquivo pelo novo:
         'scanner': 'assets/imgs/minha-foto.jpg'

   4. Salve e recarregue o index.html no navegador.

   Se o slot não tiver uma entrada aqui (ou o
   arquivo não existir), ele exibe o ícone de
   placeholder automaticamente — sem quebrar nada.
══════════════════════════════════════════════ */
const IMAGES = {

  // ── Slide 04 — Softwares CAD ──────────────────
  'scanner':        'assets/imgs/scanner-intraoral.png',

  // ── Slide 05 — Softwares CAM ──────────────────
  'fresadora':      'assets/imgs/fresadora-cadcam.png',

  // ── Slide 06 — Introdução / Timeline ──────────
  'cerec':          'assets/imgs/cerec-1985.png',

  // ── Slide 07 — Fluxo Digital vs Convencional ──
  // (sem slot de imagem nesse slide)

  // ── Slide 10 — Tipos de Sistema ───────────────
  'type-chairside': '',   // ex.: 'assets/imgs/chairside.jpg'
  'type-lab':       '',   // ex.: 'assets/imgs/laboratorial.jpg'
  'type-central':   '',   // ex.: 'assets/imgs/centralizado.jpg'

  // ── Slide 19 — Caso 1: Coroa Unitária ─────────
  'casos':          'assets/imgs/casos-before-after.png',

  // ── Slide 20 — Caso 2: Facetas ────────────────
  'alinhadores':    'assets/imgs/alinhadores-clear.png',

  // ── Slide 21 — Caso 3: Implantes ──────────────
  'fluxo-digital':  'assets/imgs/fluxo-digital-diagrama.png',

  // ── Slide 22 — Conclusão + Capa (fundo) ───────
  'ia-futuro':      'assets/imgs/ia-futuro.png',

};

document.addEventListener('DOMContentLoaded', () => {
  /* ── Carrega imagens nos slots ─────────────────── */
  applyImages();

  /* ── Navegação ─────────────────────────────────── */
  const slides      = document.querySelectorAll('.slide');
  const prevBtn     = document.getElementById('prevBtn');
  const nextBtn     = document.getElementById('nextBtn');
  const progressFill = document.getElementById('progressFill');
  const slideCounter = document.getElementById('slideCounter');
  const total       = slides.length;
  let current       = 0;

  function goTo(index) {
    if (index === current) return;

    const prev = slides[current];
    prev.classList.remove('active');
    prev.classList.add('leave');
    setTimeout(() => prev.classList.remove('leave'), 500);

    // Pausa vídeo se houver
    const vid = prev.querySelector('video');
    if (vid) vid.pause();

    current = Math.max(0, Math.min(index, total - 1));

    void slides[current].offsetWidth; // reflow para reiniciar animações
    slides[current].classList.add('active');
    slides[current].scrollTop = 0;

    // Inicia vídeo se houver
    const newVid = slides[current].querySelector('video');
    if (newVid) { newVid.currentTime = 0; newVid.play().catch(() => {}); }

    updateUI();
  }

  function updateUI() {
    const pct = total > 1 ? (current / (total - 1)) * 100 : 100;
    progressFill.style.width = pct + '%';
    if (slideCounter) slideCounter.textContent = `${current + 1} / ${total}`;
    prevBtn.style.opacity = current === 0 ? '0.3' : '1';
    nextBtn.style.opacity = current === total - 1 ? '0.3' : '1';
  }

  nextBtn.addEventListener('click', () => { if (current < total - 1) goTo(current + 1); });
  prevBtn.addEventListener('click', () => { if (current > 0)         goTo(current - 1); });

  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
      e.preventDefault();
      if (current < total - 1) goTo(current + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      if (current > 0) goTo(current - 1);
    } else if (e.key === 'Home') {
      e.preventDefault(); goTo(0);
    } else if (e.key === 'End') {
      e.preventDefault(); goTo(total - 1);
    }
  });

  // Suporte a toque
  let touchX = 0;
  document.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', e => {
    const diff = touchX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && current < total - 1) goTo(current + 1);
      if (diff < 0 && current > 0)         goTo(current - 1);
    }
  }, { passive: true });

  updateUI();

  /* ── Sistema de partículas ─────────────────────── */
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;

  const ctx    = canvas.getContext('2d');
  const COLORS = ['56,189,248', '129,140,248', '52,211,153'];
  let particles = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function init() {
    particles = Array.from({ length: 65 }, () => ({
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height,
      vx:    (Math.random() - 0.5) * 0.35,
      vy:    (Math.random() - 0.5) * 0.35,
      r:     Math.random() * 1.6 + 0.3,
      op:    Math.random() * 0.3 + 0.06,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const p = particles[i], q = particles[j];
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < 120) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(56,189,248,${0.06 * (1 - d / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${p.op})`;
      ctx.fill();
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
    });

    requestAnimationFrame(draw);
  }

  resize();
  init();
  draw();
  window.addEventListener('resize', () => { resize(); init(); });
});

/* ── Aplica imagens via data-img ──────────────── */
function applyImages() {
  document.querySelectorAll('[data-img]').forEach(slot => {
    if (slot.classList.contains('cover-bg')) return; // tratado separadamente
    const key = slot.dataset.img;
    const src = IMAGES[key];
    if (!src) return;

    const img = new Image();
    img.alt = slot.dataset.label || key;
    img.onload = () => {
      slot.appendChild(img);
      slot.classList.add('has-image');
    };
    img.onerror = () => { /* mantém placeholder elegante */ };
    img.src = src;
  });

  // Imagem de fundo do slide capa
  document.querySelectorAll('.cover-bg[data-img]').forEach(el => {
    const src = IMAGES[el.dataset.img];
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.18;filter:saturate(0.5) brightness(0.6)';
      el.appendChild(img);
    };
    img.src = src;
  });
}
