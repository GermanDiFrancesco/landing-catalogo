/**
 * router.js - Enrutador SPA Estático con URLs limpias (History API) 100% Vanilla JS
 * - En Home deja la URL limpia en "/" (elimina /index.html o #/)
 * - En secciones deja URLs limpias como "/contacto", "/nosotros", "/marca/triunfante"
 * - Servido por Node.js (server.js) con fallback SPA a index.html
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

  // Caché en memoria de vistas HTML para transiciones instantáneas
  const viewCache = {};
  let currentFullRoute = null;

  /**
   * Normaliza cualquier URL (/contacto, /index.html, #/contacto) a una ruta limpia (/contacto o /)
   */
  function parseCleanRoute(rawTarget) {
    let clean = (rawTarget || '').trim();

    // Si venía con hash (#/contacto), convertirlo a ruta limpia (/contacto)
    if (clean.startsWith('#')) {
      clean = clean.slice(1);
    }

    if (!clean || clean === '') {
      clean = '/';
    }

    const parsed = new URL(clean, window.location.origin);
    let pathname = parsed.pathname;

    // Limpiar /index.html para que el Home quede siempre en "/"
    if (pathname === '/index.html' || pathname === '') {
      pathname = '/';
    } else if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    const search = parsed.search || '';
    const fullRoute = pathname + search;

    return { pathname, search, fullRoute };
  }

  /**
   * Determina la ruta inicial al abrir o recargar la página
   */
  function getInitialRoute() {
    // Si la URL tenía un hash residual (ej. /index.html#/contacto), migrarlo a URL limpia (/contacto)
    if (window.location.hash && window.location.hash.startsWith('#/')) {
      return window.location.hash.slice(1);
    }
    return window.location.pathname + window.location.search;
  }

  /**
   * Resuelve el archivo de vista según el pathname
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

    const { pathname, search, fullRoute } = parseCleanRoute(targetUrl);
    const { viewUrl } = resolveView(pathname);

    try {
      let html = viewCache[viewUrl];
      if (!html) {
        const response = await fetch(viewUrl);
        if (!response.ok) {
          throw new Error(`Error ${response.status} al cargar ${viewUrl}`);
        }
        html = await response.text();
        viewCache[viewUrl] = html;
      }

      app.innerHTML = html;
      currentFullRoute = fullRoute;

      // Actualizar la barra de direcciones con URL limpia (sin /index.html ni #/)
      const currentBrowserUrl = window.location.pathname + window.location.search + window.location.hash;
      if (addToHistory) {
        if (currentBrowserUrl !== fullRoute) {
          window.history.pushState({ path: fullRoute }, '', fullRoute);
        }
      } else if (currentBrowserUrl !== fullRoute) {
        window.history.replaceState({ path: fullRoute }, '', fullRoute);
      }

      // Scroll arriba instantáneo
      window.scrollTo(0, 0);

      // Actualizar clases activas en Navbar
      updateActiveNavLinks(pathname);

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

  const SITE_BASE_URL = 'https://www.tecnograficsa.com.ar';
  const DEFAULT_OG_IMAGE = `${SITE_BASE_URL}/assets/img/marcas-logos/Tecnografic%20logo.webp`;

  const ROUTE_SEO = {
    '/': {
      title: 'Tecnografic | Cuadernos, Repuestos y Artículos Escolares',
      description: 'Tecnografic: Fabricante líder de cuadernos, repuestos y artículos escolares con marcas como Triunfante, Tintoretto, Potosí y Mis Hojas.',
      canonicalPath: '/',
      ogType: 'website',
      robots: 'index, follow'
    },
    '/nosotros': {
      title: 'Nosotros | Tecnografic',
      description: 'Conocé la historia, filosofía y trayectoria de Tecnografic S.A., fabricante de cuadernos, repuestos y artículos escolares de calidad.',
      canonicalPath: '/nosotros',
      ogType: 'website',
      robots: 'index, follow'
    },
    '/catalogos': {
      title: 'Catálogos Descargables | Tecnografic',
      description: 'Descargá los catálogos en PDF y accedé al banco de imágenes de Triunfante, Tintoretto, Potosí y Mis Hojas.',
      canonicalPath: '/catalogos',
      ogType: 'website',
      robots: 'index, follow'
    },
    '/puntos-de-venta': {
      title: 'Puntos de Venta | Tecnografic',
      description: 'Encontrá mayoristas y minoristas donde adquirir los productos de Tecnografic en todo el país.',
      canonicalPath: '/puntos-de-venta',
      ogType: 'website',
      robots: 'index, follow'
    },
    '/contacto': {
      title: 'Contacto | Tecnografic',
      description: 'Contactate con Tecnografic S.A. para consultas comerciales, mayoristas o información sobre nuestros productos.',
      canonicalPath: '/contacto',
      ogType: 'website',
      robots: 'index, follow'
    }
  };

  function toAbsoluteSeoUrl(assetPath) {
    if (!assetPath) return DEFAULT_OG_IMAGE;
    if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) return assetPath;
    const normalized = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
    return `${SITE_BASE_URL}${encodeURI(normalized)}`;
  }

  function setMetaAttr(selector, attr, value) {
    const el = document.querySelector(selector);
    if (el && value !== undefined && value !== null) {
      el.setAttribute(attr, value);
    }
  }

  function updateSeoMeta({ title, description, canonicalPath, ogType = 'website', ogImage, robots = 'index, follow', jsonLd = null }) {
    if (title) {
      document.title = title;
      setMetaAttr('meta[property="og:title"]', 'content', title);
      setMetaAttr('meta[name="twitter:title"]', 'content', title);
    }
    if (description) {
      setMetaAttr('meta[name="description"]', 'content', description);
      setMetaAttr('meta[property="og:description"]', 'content', description);
      setMetaAttr('meta[name="twitter:description"]', 'content', description);
    }
    const canonicalUrl = `${SITE_BASE_URL}${canonicalPath || '/'}`;
    setMetaAttr('link[rel="canonical"]', 'href', canonicalUrl);
    setMetaAttr('meta[property="og:url"]', 'content', canonicalUrl);
    setMetaAttr('meta[property="og:type"]', 'content', ogType);
    setMetaAttr('meta[name="robots"]', 'content', robots);

    const absImage = toAbsoluteSeoUrl(ogImage);
    setMetaAttr('meta[property="og:image"]', 'content', absImage);
    setMetaAttr('meta[name="twitter:image"]', 'content', absImage);

    let dynamicJsonLdEl = document.getElementById('seo-dynamic-jsonld');
    if (jsonLd) {
      if (!dynamicJsonLdEl) {
        dynamicJsonLdEl = document.createElement('script');
        dynamicJsonLdEl.type = 'application/ld+json';
        dynamicJsonLdEl.id = 'seo-dynamic-jsonld';
        document.head.appendChild(dynamicJsonLdEl);
      }
      dynamicJsonLdEl.textContent = JSON.stringify(jsonLd);
    } else if (dynamicJsonLdEl) {
      dynamicJsonLdEl.remove();
    }
  }

  window.updateSeoMeta = updateSeoMeta;

  /**
   * Ejecuta scripts correspondientes según la ruta montada
   */
  function handleViewMounted(pathname, search) {
    // 1. Home: inicializar carrusel
    if (pathname === '/' || pathname === '') {
      updateSeoMeta(ROUTE_SEO['/']);
      if (typeof window.initHeroCarousel === 'function') {
        window.initHeroCarousel();
      }
    }

    // 2. Marca: inicializar catálogo de marca pasando brandSlug y search (?prod=id)
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
        window.initBrandPage(brandSlug || 'triunfante', search);
      }
    }

    // 3. Puntos de Venta: inicializar mapa interactivo y listado de comercios
    if (pathname === '/puntos-de-venta') {
      updateSeoMeta(ROUTE_SEO['/puntos-de-venta']);
      if (typeof window.initPointsOfSalePage === 'function') {
        window.initPointsOfSalePage();
      }
    }

    // 4. Contacto: inicializar formulario de envío de consultas
    if (pathname === '/contacto') {
      updateSeoMeta(ROUTE_SEO['/contacto']);
      if (typeof window.initContactPage === 'function') {
        window.initContactPage();
      }
    }

    // 5. Otras secciones estáticas
    if (pathname === '/nosotros' || pathname === '/catalogos') {
      updateSeoMeta(ROUTE_SEO[pathname]);
    }
  }

  /**
   * Resalta visualmente el enlace activo en la barra de navegación
   */
  function updateActiveNavLinks(currentPathname) {
    const navLinks = document.querySelectorAll('header nav a, #mobile-menu a');
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;

      const { pathname: linkPathname } = parseCleanRoute(href);

      const isCurrent =
        (linkPathname === currentPathname) ||
        (linkPathname.startsWith('/marca/') && currentPathname.startsWith(linkPathname));

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

  // 1. Interceptar clics en enlaces locales
  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href) return;

    // Ignorar links vacíos placeholder (ej. href="#"), links externos, o protocolos especiales
    if (
      href === '#' ||
      href.startsWith('http://') ||
      href.startsWith('https://') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('javascript:') ||
      anchor.getAttribute('target') === '_blank' ||
      anchor.hasAttribute('download')
    ) {
      if (href === '#') e.preventDefault();
      return;
    }

    // Interceptar rutas internas (/... o #/...)
    if (href.startsWith('/') || href.startsWith('#/')) {
      e.preventDefault();
      navigate(href, true);
    }
  });

  // 2. Soporte para botones "Atrás" y "Adelante" del navegador
  window.addEventListener('popstate', () => {
    const target = window.location.pathname + window.location.search;
    const { fullRoute } = parseCleanRoute(target);
    if (fullRoute !== currentFullRoute) {
      navigate(fullRoute, false);
    }
  });

  // 3. Cargar la vista inicial y limpiar /index.html de la barra de direcciones
  document.addEventListener('DOMContentLoaded', () => {
    const initialRoute = getInitialRoute();
    navigate(initialRoute, false);
  });

  // Exponer navigate globalmente
  window.appNavigate = navigate;
})();
