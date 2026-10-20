/**
 * main.js - Lógica global de navegación, menú móvil y carrusel de inicio
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initHeroCarousel();
  initSearchInput();
});

// 1. Menú Móvil Hamburguesa
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const icon = document.getElementById('mobile-menu-icon');

  if (!toggleBtn || !mobileMenu) return;

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

// 2. Carrusel Hero Inicio
function initHeroCarousel() {
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
  let autoPlay = setInterval(nextSlide, 5000);
  container?.addEventListener('mouseenter', () => clearInterval(autoPlay));
  container?.addEventListener('mouseleave', () => {
    autoPlay = setInterval(nextSlide, 5000);
  });

  updateSlide();
}

// 3. Buscador visual (Previsión para búsqueda con products.json)
function initSearchInput() {
  const input = document.getElementById('global-search-input');
  if (!input) return;

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const term = input.value.trim();
      if (term) {
        console.log('Buscar producto:', term);
      }
    }
  });
}

