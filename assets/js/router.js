/**
 * router.js - Enrutador SPA 100% Vanilla JS nativo para Tecnografic
 * Gestiona rutas limpias sin recargar el Navbar, Buscador ni Footer.
 */

(function () {
  const routes = {
    '/': '/views/home.html',
    '/nosotros': '/views/nosotros.html',
    '/catalogos': '/views/catalogos.html',
    '/puntos-de-venta': '/views/puntos-de-venta.html',
    '/contacto': '/views/contacto.html',
    '/marca': '/views/marca.html'
  };

  /**
   * Resuelve la vista adecuada según la ruta solicitada
   */
  function resolveView(pathname) {
    if (pathname === '/' || pathname === '') {
      return { viewUrl: routes['/'], routeKey: '/' };
    }
    if (pathname.startsWith('/marca')) {
      return { viewUrl: routes['/marca'], routeKey: '/marca' };
    }
    if (routes[pathname]) {
      return { viewUrl: routes[pathname], routeKey: pathname };
    }
    return { viewUrl: routes['/'], routeKey: '/' };
  }

  /**
   * Carga e inyecta la vista solicitada en el contenedor #app
   */
  async function navigate(targetUrl, addToHistory = true) {
    const app = document.getElementById('app');
    if (!app) return;

    // Crear un objeto URL para parsear fácilmente pathname y search
    const parsed = new URL(targetUrl, window.location.origin);
    const pathname = parsed.pathname;
    const search = parsed.search;
    const fullRelativeUrl = pathname + search;

    const { viewUrl, routeKey } = resolveView(pathname);

    try {
      const response = await fetch(viewUrl);
      if (!response.ok) {
        throw new Error(`Error ${response.status} al cargar ${viewUrl}`);
      }
      const html = await response.text();
      app.innerHTML = html;

      // Actualizar historial del navegador sin recarga
      if (addToHistory && fullRelativeUrl !== (window.location.pathname + window.location.search)) {
        window.history.pushState({ path: fullRelativeUrl }, '', fullRelativeUrl);
      }

      // Scroll arriba instantáneo
      window.scrollTo(0, 0);

      // Actualizar clases activas en Navbar
      updateActiveNavLinks(fullRelativeUrl);

      // Cerrar menú móvil si estuviera abierto
      closeMobileMenu();

      // Ejecutar lógica específica de la vista montada
      handleViewMounted(pathname, search);

    } catch (err) {
      console.error('Error en navegación router:', err);
      app.innerHTML = `
        <div class="max-w-xl mx-auto my-20 p-8 text-center bg-red-50 rounded-2xl border border-red-200">
          <i class="fa-solid fa-triangle-exclamation text-3xl text-red-500 mb-3"></i>
          <h2 class="text-xl font-bold text-red-700 mb-2">No se pudo cargar la sección</h2>
          <p class="text-sm text-red-600 mb-4">Ocurrió un problema al solicitar el contenido.</p>
          <a href="/" class="inline-block px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold">Volver al Inicio</a>
        </div>
      `;
    }
  }

  /**
   * Ejecuta scripts correspondientes según la ruta montada
   */
  function handleViewMounted(pathname, search) {
    // 1. Home: inicializar carrusel
    if (pathname === '/' || pathname === '') {
      if (typeof window.initHeroCarousel === 'function') {
        window.initHeroCarousel();
      }
    }

    // 2. Marca: inicializar catálogo de marca
    if (pathname.startsWith('/marca')) {
      let brandSlug = null;
      const match = pathname.match(/^\/marca\/([^\/?#]+)/);
      if (match && match[1]) {
        brandSlug = match[1];
      } else {
        const params = new URLSearchParams(search);
        brandSlug = params.get('b');
      }

      if (typeof window.initBrandPage === 'function') {
        window.initBrandPage(brandSlug || 'triunfante');
      }
    }
  }

  /**
   * Resalta visualmente el enlace activo en la barra de navegación
   */
  function updateActiveNavLinks(currentUrl) {
    const navLinks = document.querySelectorAll('header nav a, #mobile-menu a');
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;

      const isCurrent = (href === currentUrl) || 
        (href === '/' && currentUrl === '/') ||
        (href.startsWith('/marca') && currentUrl.startsWith(href));

      if (isCurrent) {
        link.classList.add('text-blue-800', 'font-black');
        link.classList.remove('text-[#0062cc]');
      } else {
        link.classList.remove('text-blue-800', 'font-black');
        link.classList.add('text-[#0062cc]');
      }
    });
  }

  /**
   * Cierra el menú móvil al navegar
   */
  function closeMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    const icon = document.getElementById('mobile-menu-icon');
    if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
      mobileMenu.classList.add('hidden');
      if (icon) {
        icon.className = 'fa-solid fa-bars text-xl';
      }
    }
  }

  // 1. Interceptar clics en enlaces locales (con URLs limpias)
  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href) return;

    // Ignorar links externos, anclas o protocolos especiales
    if (
      href.startsWith('http://') ||
      href.startsWith('https://') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('#') ||
      href.startsWith('javascript:') ||
      anchor.getAttribute('target') === '_blank'
    ) {
      return;
    }

    e.preventDefault();
    navigate(href, true);
  });

  // 2. Soporte para botones "Atrás" y "Adelante" del navegador
  window.addEventListener('popstate', () => {
    navigate(window.location.pathname + window.location.search, false);
  });

  // 3. Cargar la vista inicial cuando carga la página
  document.addEventListener('DOMContentLoaded', () => {
    navigate(window.location.pathname + window.location.search, false);
  });

  // Exponer navigate globalmente si se necesita llamar programáticamente
  window.appNavigate = navigate;
})();
