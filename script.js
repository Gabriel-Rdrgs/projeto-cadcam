document.addEventListener('DOMContentLoaded', () => {
    const slides = document.querySelectorAll('.slide');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const progressFill = document.getElementById('progressFill');
    const slideCounter = document.getElementById('slideCounter');
    let currentSlide = 0;
    const total = slides.length;

    function updateUI() {
        const progress = (currentSlide / (total - 1)) * 100;
        progressFill.style.width = `${progress}%`;
        if (slideCounter) slideCounter.textContent = `${currentSlide + 1} / ${total}`;
    }

    function goToSlide(index) {
        const currentVideo = slides[currentSlide].querySelector('video');
        if (currentVideo) currentVideo.pause();

        slides[currentSlide].classList.remove('active');

        if (index < 0) index = 0;
        if (index >= total) index = total - 1;
        currentSlide = index;

        void slides[currentSlide].offsetWidth;
        slides[currentSlide].classList.add('active');
        slides[currentSlide].scrollTop = 0;

        const newVideo = slides[currentSlide].querySelector('video');
        if (newVideo) {
            newVideo.currentTime = 0;
            newVideo.play().catch(() => {});
        }

        updateUI();
    }

    nextBtn.addEventListener('click', () => {
        if (currentSlide < total - 1) goToSlide(currentSlide + 1);
    });

    prevBtn.addEventListener('click', () => {
        if (currentSlide > 0) goToSlide(currentSlide - 1);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
            e.preventDefault();
            if (currentSlide < total - 1) goToSlide(currentSlide + 1);
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
            e.preventDefault();
            if (currentSlide > 0) goToSlide(currentSlide - 1);
        }
    });

    // Swipe support
    let touchStartX = 0;
    document.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; });
    document.addEventListener('touchend', e => {
        const diff = touchStartX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) {
            if (diff > 0 && currentSlide < total - 1) goToSlide(currentSlide + 1);
            if (diff < 0 && currentSlide > 0) goToSlide(currentSlide - 1);
        }
    });

    // ── Particle System ──────────────────────────────
    const canvas = document.getElementById('particles-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particles = [];
        const COLORS = ['56,189,248', '167,139,250', '74,222,128'];

        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }

        function initParticles() {
            particles = Array.from({ length: 70 }, () => ({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                r: Math.random() * 1.8 + 0.4,
                op: Math.random() * 0.35 + 0.08,
                color: COLORS[Math.floor(Math.random() * COLORS.length)]
            }));
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const p = particles[i], q = particles[j];
                    const d = Math.hypot(p.x - q.x, p.y - q.y);
                    if (d < 130) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(q.x, q.y);
                        ctx.strokeStyle = `rgba(56,189,248,${0.07 * (1 - d / 130)})`;
                        ctx.lineWidth = 0.6;
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
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
            });
            requestAnimationFrame(draw);
        }

        resize();
        initParticles();
        draw();
        window.addEventListener('resize', () => { resize(); initParticles(); });
    }

    updateUI();
});
