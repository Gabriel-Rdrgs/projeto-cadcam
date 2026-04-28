document.addEventListener('DOMContentLoaded', () => {
    const slides = document.querySelectorAll('.slide');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const progressFill = document.getElementById('progressFill');
    let currentSlide = 0;

    function updateProgress() {
        const progress = (currentSlide / (slides.length - 1)) * 100;
        progressFill.style.width = `${progress}%`;
    }

    function goToSlide(index) {
        // 1. Antes de trocar, verifica se o slide atual tem um vídeo rodando e pausa
        const currentVideo = slides[currentSlide].querySelector('video');
        if (currentVideo) {
            currentVideo.pause();
        }

        // 2. Remove a classe ativa do slide atual
        slides[currentSlide].classList.remove('active');
        
        // Proteção de limites
        if (index < 0) index = 0;
        if (index >= slides.length) index = slides.length - 1;
        
        // Define o novo slide
        currentSlide = index;
        
        // Força reflow do CSS para reativar animações
        void slides[currentSlide].offsetWidth; 
        
        // Ativa o novo slide
        slides[currentSlide].classList.add('active');
        slides[currentSlide].scrollTop = 0;
        
        // 3. Verifica se o novo slide tem um vídeo. Se tiver, dá play!
        const newVideo = slides[currentSlide].querySelector('video');
        if (newVideo) {
            newVideo.currentTime = 0; // Volta o vídeo pro começo
            
            // O navegador permite o play com áudio porque o usuário interagiu com o teclado para mudar de slide
            let playPromise = newVideo.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log("Navegador bloqueou o autoplay. Precisará de um clique.");
                });
            }
        }

        updateProgress();
    }

    // Botões visuais (mouse)
    nextBtn.addEventListener('click', () => {
        if (currentSlide < slides.length - 1) goToSlide(currentSlide + 1);
    });

    prevBtn.addEventListener('click', () => {
        if (currentSlide > 0) goToSlide(currentSlide - 1);
    });

    // Controle pelo teclado (Setas, Espaço ou "Passador de Slide Laser")
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
            e.preventDefault();
            if (currentSlide < slides.length - 1) goToSlide(currentSlide + 1);
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
            e.preventDefault();
            if (currentSlide > 0) goToSlide(currentSlide - 1);
        }
    });

    // Inicia a apresentação
    updateProgress();
});