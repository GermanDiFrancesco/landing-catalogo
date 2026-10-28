/**
 * main.js - Lógica global de navegación, menú móvil y carrusel de inicio
 */

let heroCarouselInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  // initSearchInput es gestionado por search.js, pero también lo inicializamos aquí
  // para el header persistente que ya está en el DOM desde el primer render.
  if (typeof window.initSearchInput === 'function') {
    window.initSearchInput();
  }
});

// 1. Menú Móvil Hamburguesa (Header persistente)
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const icon = document.getElementById('mobile-menu-icon');

  if (!toggleBtn || !mobileMenu || toggleBtn.dataset.initialized) return;
  toggleBtn.dataset.initialized = 'true';

  toggleBtn.addEventListener('click', () => {
    const isHidden = mobileMenu.classList.toggle('hidden');
    if (icon) {
      if (isHidden) {
        icon.className = 'fa-solid fa-bars text-xl';
      } else {
        icon.className = 'fa-solid fa-xmark text-xl';
      }
    }
  });
}

// 2. Carrusel Hero Inicio (Llamado dinámicamente cada vez que se carga la vista Home)
function initHeroCarousel() {
  if (heroCarouselInterval) {
    clearInterval(heroCarouselInterval);
    heroCarouselInterval = null;
  }

  const track = document.getElementById('carousel-track');
  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');
  const dots = document.querySelectorAll('.carousel-dot');
  const container = document.getElementById('hero-carousel');

  if (!track || dots.length === 0) return;

  let currentIndex = 0;
  const totalSlides = dots.length;

  function updateSlide() {
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
    dots.forEach((dot, idx) => {
      if (idx === currentIndex) {
        dot.classList.add('bg-white', 'scale-110');
        dot.classList.remove('bg-white/50');
      } else {
        dot.classList.remove('bg-white', 'scale-110');
        dot.classList.add('bg-white/50');
      }
    });
  }

  function nextSlide() {
    currentIndex = (currentIndex + 1) % totalSlides;
    updateSlide();
  }

  function prevSlide() {
    currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
    updateSlide();
  }

  nextBtn?.addEventListener('click', nextSlide);
  prevBtn?.addEventListener('click', prevSlide);

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const idx = Number(dot.getAttribute('data-index'));
      if (!isNaN(idx)) {
        currentIndex = idx;
        updateSlide();
      }
    });
  });

  // Autoplay cada 5 segundos
  heroCarouselInterval = setInterval(nextSlide, 5000);
  container?.addEventListener('mouseenter', () => {
    if (heroCarouselInterval) clearInterval(heroCarouselInterval);
  });
  container?.addEventListener('mouseleave', () => {
    if (heroCarouselInterval) clearInterval(heroCarouselInterval);
    heroCarouselInterval = setInterval(nextSlide, 5000);
  });

  updateSlide();
}

// Exportar funciones globalmente para el router SPA
// Nota: initSearchInput y el control de scroll del buscador son gestionados por search.js
window.initHeroCarousel = initHeroCarousel;
window.initMobileMenu = initMobileMenu;
