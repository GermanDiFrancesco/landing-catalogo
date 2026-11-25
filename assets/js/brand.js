/**
 * brand.js - Manejo dinámico universal y modular de la sección de Marca
 * Compatible con URLs limpias (/marca/triunfante) y query params (?b=triunfante).
 * Separa el main content en:
 * 1. Grilla interactiva de los productos de la familia/categoría.
 * 2. Vista desacoplada de detalle del producto con variantes (tamaño, hojas, tipo, manos, colores) y ficha técnica.
 */

let cachedBrandsData = null;
const cachedBrandProducts = {};

// Base URL absoluta de la raíz del proyecto calculada a partir del script actual (/assets/js/brand.js)
const BRAND_SCRIPT_SRC = (typeof document !== 'undefined' && document.currentScript && document.currentScript.src)
  ? document.currentScript.src
  : '';
const SITE_ROOT_URL = BRAND_SCRIPT_SRC
  ? new URL('../../', BRAND_SCRIPT_SRC).href
  : (typeof window !== 'undefined' ? window.location.origin + '/' : '/');

// Fallbacks vectoriales embebidos por si falla la carga de algún ícono de tipo de hoja
const SHEET_TYPE_SVG_FALLBACKS = {
  'rayado.png': 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#ffffff" stroke="#1f1f1f" stroke-width="6"/><line x1="12" y1="26" x2="88" y2="26" stroke="#1f1f1f" stroke-width="3.5"/><line x1="5" y1="50" x2="95" y2="50" stroke="#1f1f1f" stroke-width="3.5"/><line x1="12" y1="74" x2="88" y2="74" stroke="#1f1f1f" stroke-width="3.5"/></svg>'
  ),
  'cuadriculado.png': 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#ffffff" stroke="#1f1f1f" stroke-width="6"/><line x1="15" y1="20" x2="85" y2="20" stroke="#1f1f1f" stroke-width="2.5"/><line x1="6" y1="35" x2="94" y2="35" stroke="#1f1f1f" stroke-width="2.5"/><line x1="4" y1="50" x2="96" y2="50" stroke="#1f1f1f" stroke-width="2.5"/><line x1="6" y1="65" x2="94" y2="65" stroke="#1f1f1f" stroke-width="2.5"/><line x1="15" y1="80" x2="85" y2="80" stroke="#1f1f1f" stroke-width="2.5"/><line x1="20" y1="15" x2="20" y2="85" stroke="#1f1f1f" stroke-width="2.5"/><line x1="35" y1="6" x2="35" y2="94" stroke="#1f1f1f" stroke-width="2.5"/><line x1="50" y1="4" x2="50" y2="96" stroke="#1f1f1f" stroke-width="2.5"/><line x1="65" y1="6" x2="65" y2="94" stroke="#1f1f1f" stroke-width="2.5"/><line x1="80" y1="15" x2="80" y2="85" stroke="#1f1f1f" stroke-width="2.5"/></svg>'
  ),
  'lisas.png': 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#ffffff" stroke="#1f1f1f" stroke-width="6"/></svg>'
  )
};

function extractHashSearch(searchOverride) {
  if (typeof searchOverride === 'string' && searchOverride.length > 0) {
    return searchOverride;
  }
  const hash = window.location.hash || '';
  const qIndex = hash.indexOf('?');
  if (qIndex !== -1) {
    return hash.slice(qIndex);
  }
  return window.location.search || '';
}

async function initBrandPage(brandSlug, searchOverride) {
  const activeSearch = extractHashSearch(searchOverride);

  // Determinar marca activa (argumento > hash > pathname > query param > fallback)
  let brandKey = brandSlug;
  if (!brandKey) {
    const hashMatch = (window.location.hash || '').match(/^#?\/marca\/([^\/?#]+)/);
    const pathMatch = window.location.pathname.match(/^\/marca\/([^\/?#]+)/);
    if (hashMatch && hashMatch[1]) {
      brandKey = hashMatch[1];
    } else if (pathMatch && pathMatch[1]) {
      brandKey = pathMatch[1];
    } else {
      const urlParams = new URLSearchParams(activeSearch);
      brandKey = urlParams.get('b') || 'triunfante';
    }
  }

  try {
    if (!cachedBrandsData) {
      const res = await fetch('/assets/data/brands.json?v=20261125181207');
      cachedBrandsData = await res.json();
    }
    const brand = cachedBrandsData[brandKey] || cachedBrandsData['triunfante'];

    // Cargar el JSON de productos detallados de la marca (con caché en memoria)
    let brandProductsData = cachedBrandProducts[brandKey] || null;
    if (!brandProductsData) {
      try {
        const prodRes = await fetch(`/assets/data/products/${brandKey}.json?v=20261125181207`);
        if (prodRes.ok) {
          brandProductsData = await prodRes.json();
          cachedBrandProducts[brandKey] = brandProductsData;
        }
      } catch (e) {
        console.warn(`No se pudo cargar JSON para ${brandKey}:`, e);
      }
    }

    renderBrandPage(brand, brandProductsData, activeSearch);
  } catch (error) {
    console.error('Error al inicializar la página de marca:', error);
  }
}

function formatImgUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const cleanPath = url.replace(/^\/+/, '');
  try {
    return new URL(cleanPath, SITE_ROOT_URL).href;
  } catch (e) {
    return `/${cleanPath}`;
  }
}

function setSafeProductImage(imgEl, primaryUrl, fallbackUrl) {
  if (!imgEl) return;
  const resolvedPrimary = formatImgUrl(primaryUrl || fallbackUrl);
  const resolvedFallback = formatImgUrl(fallbackUrl);

  imgEl.onerror = () => {
    if (resolvedFallback && imgEl.src !== resolvedFallback) {
      imgEl.onerror = null;
      imgEl.src = resolvedFallback;
    }
  };
  imgEl.src = resolvedPrimary;
}

function initProductZoomModal() {
  const trigger = document.getElementById('product-image-zoom-trigger');
  const mainImg = document.getElementById('product-main-image');
  const modal = document.getElementById('product-zoom-modal');
  const modalContent = document.getElementById('product-zoom-content');
  const closeBtn = document.getElementById('product-zoom-close');
  const prevBtn = document.getElementById('product-zoom-prev');
  const nextBtn = document.getElementById('product-zoom-next');
  const zoomImg = document.getElementById('product-zoom-image');
  const zoomCaption = document.getElementById('product-zoom-caption');

  if (!trigger || !mainImg || !modal || !zoomImg) return;
  if (trigger.dataset.zoomBound === 'true') return;
  trigger.dataset.zoomBound = 'true';

  const updateZoomView = () => {
    const gal = window.__tgActiveGallery;
    const hasMulti = Boolean(gal && Array.isArray(gal.images) && gal.images.length > 1);

    if (hasMulti) {
      const idx = ((gal.activeIdx || 0) % gal.images.length + gal.images.length) % gal.images.length;
      gal.activeIdx = idx;
      zoomImg.src = gal.images[idx];
    } else {
      zoomImg.src = mainImg.src;
    }
    zoomImg.alt = mainImg.alt || 'Vista ampliada';

    if (prevBtn && nextBtn) {
      if (hasMulti) {
        prevBtn.classList.remove('hidden');
        prevBtn.classList.add('flex');
        nextBtn.classList.remove('hidden');
        nextBtn.classList.add('flex');
      } else {
        prevBtn.classList.add('hidden');
        prevBtn.classList.remove('flex');
        nextBtn.classList.add('hidden');
        nextBtn.classList.remove('flex');
      }
    }

    if (zoomCaption) {
      const prodTitle = document.getElementById('sample-product-title');
      const variantBadge = document.getElementById('product-variant-badge');
      const titleText = prodTitle ? prodTitle.textContent.trim() : (mainImg.alt || '');
      const badgeText = variantBadge ? variantBadge.textContent.trim() : '';
      let caption = badgeText && badgeText !== 'Vista Familia'
        ? `${titleText} (${badgeText})`
        : titleText;
      if (hasMulti) {
        caption += ` · ${(gal.activeIdx || 0) + 1} / ${gal.images.length}`;
      }
      zoomCaption.textContent = caption;
    }
  };

  const stepZoom = (delta) => {
    const gal = window.__tgActiveGallery;
    if (!gal || !Array.isArray(gal.images) || gal.images.length <= 1) return;
    const nextIdx = ((gal.activeIdx || 0) + delta + gal.images.length) % gal.images.length;
    gal.activeIdx = nextIdx;
    if (typeof gal.onSelect === 'function') {
      gal.onSelect(nextIdx);
    }
    updateZoomView();
  };

  const openModal = () => {
    if (!mainImg.src) return;
    updateZoomView();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
  };

  trigger.addEventListener('click', openModal);

  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      stepZoom(-1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      stepZoom(1);
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeModal();
    });
  }

  // Cerrar al hacer clic fuera del cuadro de contenido (sobre el fondo oscuro)
  modal.addEventListener('click', (e) => {
    if (!modalContent || !modalContent.contains(e.target)) {
      closeModal();
    }
  });

  // Teclado: Escape para cerrar, flechas para navegar galería en el zoom
  if (!window.__tecnograficZoomEscBound) {
    window.__tecnograficZoomEscBound = true;
    document.addEventListener('keydown', (e) => {
      const activeModal = document.getElementById('product-zoom-modal');
      if (!activeModal || activeModal.classList.contains('hidden')) return;
      if (e.key === 'Escape') {
        activeModal.classList.add('hidden');
        activeModal.classList.remove('flex');
        document.body.style.overflow = '';
      } else if (e.key === 'ArrowLeft') {
        const p = document.getElementById('product-zoom-prev');
        if (p && !p.classList.contains('hidden')) p.click();
      } else if (e.key === 'ArrowRight') {
        const n = document.getElementById('product-zoom-next');
        if (n && !n.classList.contains('hidden')) n.click();
      }
    });
  }
}

function updateBrandSeo(brand) {
  if (!brand || typeof window.updateSeoMeta !== 'function') return;
  window.updateSeoMeta({
    title: `${brand.name} | Tecnografic`,
    description: brand.description || `Catálogo de productos ${brand.name} de Tecnografic.`,
    canonicalPath: `/marca/${encodeURIComponent(brand.id)}`,
    ogType: 'website',
    ogImage: brand.logoAzul || brand.logo,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://www.tecnograficsa.com.ar/' },
        { '@type': 'ListItem', position: 2, name: brand.name, item: `https://www.tecnograficsa.com.ar/marca/${encodeURIComponent(brand.id)}` }
      ]
    }
  });
}

function updateProductSeo(brand, category, product) {
  if (!brand || !product || typeof window.updateSeoMeta !== 'function') return;
  const firstVariantImg = product.variants && product.variants[0] && (product.variants[0].image || product.variants[0].imageClean);
  const productImagePath = product.familyImage || firstVariantImg || brand.logoAzul || brand.logo;
  const productUrl = `https://www.tecnograficsa.com.ar/marca/${encodeURIComponent(brand.id)}?prod=${encodeURIComponent(product.id)}`;
  const brandUrl = `https://www.tecnograficsa.com.ar/marca/${encodeURIComponent(brand.id)}`;
  const absImg = productImagePath.startsWith('http')
    ? productImagePath
    : `https://www.tecnograficsa.com.ar${encodeURI(productImagePath.startsWith('/') ? productImagePath : `/${productImagePath}`)}`;

  window.updateSeoMeta({
    title: `${product.name} — ${brand.name} | Tecnografic`,
    description: product.description || brand.description || `${product.name} de la línea ${brand.name}.`,
    canonicalPath: `/marca/${encodeURIComponent(brand.id)}?prod=${encodeURIComponent(product.id)}`,
    ogType: 'product',
    ogImage: productImagePath,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Product',
          name: product.name,
          description: product.description || brand.description || product.name,
          image: absImg,
          category: category ? category.name : undefined,
          brand: {
            '@type': 'Brand',
            name: brand.name
          },
          url: productUrl
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://www.tecnograficsa.com.ar/' },
            { '@type': 'ListItem', position: 2, name: brand.name, item: brandUrl },
            { '@type': 'ListItem', position: 3, name: product.name, item: productUrl }
          ]
        }
      ]
    }
  });
}

function renderBrandPage(brand, brandProductsData, activeSearch) {
  initProductZoomModal();

  const srTitle = document.getElementById('brand-sr-title');
  if (srTitle) {
    srTitle.textContent = brand.name;
  }

  const heroContainer = document.getElementById('brand-hero-section');
  if (heroContainer) {
    heroContainer.style.backgroundColor = brand.color;
  }
  const brandLogo = document.getElementById('brand-hero-logo');
  if (brandLogo) {
    brandLogo.src = formatImgUrl(brand.logo);
    brandLogo.alt = brand.name;
  }
  const brandSlogan = document.getElementById('brand-hero-slogan');
  if (brandSlogan) {
    brandSlogan.textContent = brand.slogan || '';
  }

  const brandDesc = document.getElementById('brand-hero-desc');
  if (brandDesc) {
    brandDesc.textContent = brand.description || '';
  }

  // Sello de calidad ISO 9001 (triunfante, potosi, mis-hojas)
  const isoBadge = document.getElementById('brand-iso-badge');
  if (isoBadge) {
    const brandsWithIso = ['triunfante', 'potosi', 'mis-hojas'];
    if (brandsWithIso.includes(brand.id)) {
      isoBadge.classList.remove('hidden');
    } else {
      isoBadge.classList.add('hidden');
    }
  }

  // Color del encabezado de la ficha técnica
  const specsHead = document.getElementById('specs-header');
  if (specsHead) {
    specsHead.style.backgroundColor = brand.color;
  }

  // 3. Renderizar Catálogo Estructurado o Fallback
  const categories = (brandProductsData && brandProductsData.categories) ? brandProductsData.categories : null;

  if (categories && categories.length > 0) {
    renderStructuredCatalog(brand, categories, activeSearch);
  } else {
    updateBrandSeo(brand);
    renderLegacyCatalog(brand);
  }
}

/**
 * Renderiza el catálogo estructurado con Sidebar, Grilla de Familia y Detalle de Variantes
 */
function renderStructuredCatalog(brand, categories, activeSearch) {
  const sidebar = document.getElementById('brand-sidebar-container');
  if (sidebar) {
    sidebar.style.backgroundColor = brand.color;
  }

  const categoriesList = document.getElementById('brand-categories-list');
  if (!categoriesList) return;

  categoriesList.innerHTML = '';

  let currentCategoryIndex = 0;
  let currentProductIndex = 0;
  let activeGridSliderCleanups = [];

  function cleanupGridSliders() {
    activeGridSliderCleanups.forEach(fn => {
      try { fn(); } catch (_) {}
    });
    activeGridSliderCleanups = [];
  }

  // Construir categorías en el sidebar
  categories.forEach((cat, index) => {
    const li = document.createElement('li');
    const isFirst = index === 0;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `w-full text-left py-3 px-4  font-bold text-sm sm:text-base flex items-center justify-between transition-all duration-200 brand-cat-btn ${
      isFirst 
        ? 'bg-white shadow-md pl-5' 
        : 'text-white hover:bg-white/15'
    }`;
    if (isFirst) {
      btn.style.color = brand.color;
    }

    btn.innerHTML = `
      <span>${cat.name}</span>
      <span class="text-xs">&gt;</span>
    `;

    btn.addEventListener('click', () => {
      document.querySelectorAll('.brand-cat-btn').forEach(b => {
        b.className = 'w-full text-left py-3 px-4 font-bold text-sm sm:text-base flex items-center justify-between transition-all duration-200 brand-cat-btn text-white hover:bg-white/15';
        b.style.color = '#ffffff';
      });
      btn.className = 'w-full text-left py-3 px-4 font-bold text-sm sm:text-base flex items-center justify-between transition-all duration-200 brand-cat-btn bg-white shadow-md';
      btn.style.color = brand.color;

      currentCategoryIndex = index;
      currentProductIndex = 0;
      showCategoryGrid(categories[currentCategoryIndex]);
    });

    li.appendChild(btn);
    categoriesList.appendChild(li);
  });

  // Soporte de Deep Linking: si la URL o el hash contiene ?prod=id, abrir directamente ese producto
  const urlParams = new URLSearchParams(extractHashSearch(activeSearch));
  const targetProdId = urlParams.get('prod');
  let deepLinkHandled = false;

  if (targetProdId) {
    for (let cIdx = 0; cIdx < categories.length; cIdx++) {
      const prods = categories[cIdx].products || [];
      const pIdx = prods.findIndex(p => p.id === targetProdId);
      if (pIdx !== -1) {
        // Activar el botón de categoría correspondiente en el sidebar
        const catButtons = document.querySelectorAll('.brand-cat-btn');
        catButtons.forEach((b, idx) => {
          if (idx === cIdx) {
            b.className = 'w-full text-left py-3 px-4 font-bold text-sm sm:text-base flex items-center justify-between transition-all duration-200 brand-cat-btn bg-white shadow-md';
            b.style.color = brand.color;
          } else {
            b.className = 'w-full text-left py-3 px-4 font-bold text-sm sm:text-base flex items-center justify-between transition-all duration-200 brand-cat-btn text-white hover:bg-white/15';
            b.style.color = '#ffffff';
          }
        });
        currentCategoryIndex = cIdx;
        currentProductIndex = pIdx;
        openProductDetail(categories[cIdx], pIdx);
        deepLinkHandled = true;
        break;
      }
    }
  }

  // Si no hay parámetro de deep link o no coincidió, mostrar la primera categoría por defecto
  if (!deepLinkHandled) {
    showCategoryGrid(categories[0]);
  }

  /**
   * VISTA 1: Muestra la grilla de los productos de la familia/categoría seleccionada
   */
  function showCategoryGrid(category) {
    const gridView = document.getElementById('brand-category-grid-view');
    const detailView = document.getElementById('brand-product-detail-view');
    const gridTitle = document.getElementById('selected-category-title');
    const countBadge = document.getElementById('category-products-count');
    const gridContainer = document.getElementById('brand-products-grid');

    if (!gridView || !detailView || !gridContainer) return;

    cleanupGridSliders();
    updateBrandSeo(brand);

    if (window.location.search.includes('prod=')) {
      const cleanBrandPath = `/marca/${encodeURIComponent(brand.id)}`;
      window.history.replaceState({ path: cleanBrandPath }, '', cleanBrandPath);
    }

    // Asegurar visibilidad de la Grilla y ocultar el Detalle
    gridView.classList.remove('hidden');
    detailView.classList.add('hidden');

    if (gridTitle) {
      gridTitle.textContent = category.name;
      gridTitle.style.color = brand.color;
    }

    const prods = category.products || [];
    if (countBadge) {
      countBadge.textContent = `${prods.length} ${prods.length === 1 ? 'producto' : 'productos'}`;
    }

    gridContainer.innerHTML = '';

    if (prods.length === 0) {
      gridContainer.innerHTML = `
        <div class="col-span-full py-12 text-center text-gray-400">
          <p>Próximamente más productos en esta categoría.</p>
        </div>
      `;
      return;
    }

    // Generar las tarjetas para cada producto de la familia
    prods.forEach((prod, pIdx) => {
      const card = document.createElement('div');
      card.className = 'group transition-all duration-300 p-3 transform hover:-translate-y-1 flex flex-col justify-between cursor-pointer';

      const thumbImg = formatImgUrl(prod.familyImage || (prod.variants && prod.variants[0]?.image) || brand.logo);
      const attributes = prod.attributes || {};

      // Detectar si la familia cuenta con múltiples portadas / motivos (4, 8 o N modelos de diseño, para todas las marcas)
      const hasMotivos = (attributes.motivos && attributes.motivos.length > 1) || (prod.coverImages && prod.coverImages.length > 1);
      let coverSlides = [];

      if (hasMotivos) {
        if (Array.isArray(prod.coverImages) && prod.coverImages.length > 1) {
          coverSlides = prod.coverImages.map((imgUrl, idx) => ({
            image: formatImgUrl(imgUrl || prod.familyImage || brand.logo),
            label: (attributes.motivos && attributes.motivos[idx]) || (attributes.colores && attributes.colores[idx]) || `Motivo ${idx + 1}`
          }));
        } else {
          const seenMotivos = new Set();
          (prod.variants || []).forEach(v => {
            if (v.motivo && !seenMotivos.has(v.motivo)) {
              seenMotivos.add(v.motivo);
              coverSlides.push({
                image: formatImgUrl(v.image || prod.familyImage || brand.logo),
                label: v.motivo
              });
            }
          });
        }
        const expectedMotivosCount = Array.isArray(attributes.motivos) ? attributes.motivos.length : 0;
        while (coverSlides.length > 0 && coverSlides.length < expectedMotivosCount) {
          const nextIdx = coverSlides.length;
          coverSlides.push({
            image: thumbImg,
            label: (attributes.motivos && attributes.motivos[nextIdx]) || `Motivo ${nextIdx + 1}`
          });
        }
      }

      const motivosCount = coverSlides.length;

      // Anteponer la imagen de familia como primera diapositiva del carrusel
      if (coverSlides.length > 1 && prod.familyImage) {
        const familyUrl = formatImgUrl(prod.familyImage);
        if (familyUrl && coverSlides[0]?.image !== familyUrl) {
          coverSlides.unshift({
            image: familyUrl,
            label: 'Familia'
          });
        }
      }

      if (coverSlides.length > 1) {
        const slidesHtml = coverSlides.map((slide, sIdx) => `
          <div class="w-full h-full flex-shrink-0 flex items-center justify-center relative select-none" data-slide-index="${sIdx}">
            <img src="${slide.image}" alt="${prod.name} - ${slide.label}" loading="lazy" decoding="async" class="max-h-full object-contain scale-125 transition-transform duration-300 group-hover:scale-105">
          </div>
        `).join('');

        const dotsHtml = coverSlides.map((slide, sIdx) => `
          <button type="button" data-dot-index="${sIdx}" title="${slide.label}" aria-label="Ver ${slide.label}"
            class="h-1.5 rounded-full transition-all duration-300 ${sIdx === 0 ? 'w-5 opacity-100' : 'w-1.5 bg-gray-400/60 hover:bg-gray-500 opacity-80'}"
            style="${sIdx === 0 ? `background-color: ${brand.color};` : ''}"></button>
        `).join('');

        card.innerHTML = `
          <!-- Contenedor carrusel portadas (familia + motivos) -->
          <div class="w-full bg-gray-50/70 h-48 mb-4 overflow-hidden relative rounded-lg">
            <!-- Badge indicador de modelos -->
            <div style="z-index:10;" class="absolute top-2 right-2 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-full shadow-xs border border-gray-200/80 flex items-center gap-1 pointer-events-none">
              <span class="w-1.5 h-1.5 rounded-full animate-pulse" style="background-color: ${brand.color};"></span>
              <span data-slide-badge class="text-[10px] font-bold text-gray-700 tracking-tight">${motivosCount} motivos</span>
            </div>
            <!-- Track horizontal -->
            <div data-slider-track class="flex w-full h-full transition-transform duration-500 ease-out" style="transform: translateX(0%);">
              ${slidesHtml}
            </div>
            <!-- Indicadores inferiores (dots) -->
            <div class="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 bg-white/85 backdrop-blur-xs px-2.5 py-1 rounded-full shadow-xs border border-gray-200/60">
              ${dotsHtml}
            </div>
          </div>
          <!-- Título del producto -->
          <h3 class="px-3 py-1.5 text-xs font-bold rounded-lg text-white shadow-sm transition-all transform scale-105 text-center" style="background-color: ${brand.color};">
            ${prod.name}
          </h3>
        `;

        const track = card.querySelector('[data-slider-track]');
        const badgeEl = card.querySelector('[data-slide-badge]');
        const dotBtns = Array.from(card.querySelectorAll('[data-dot-index]'));
        let currentSlide = 0;
        let slideInterval = null;

        const goToSlide = (idx, showLabel = false) => {
          currentSlide = ((idx % coverSlides.length) + coverSlides.length) % coverSlides.length;
          if (track) {
            track.style.transform = `translateX(-${currentSlide * 100}%)`;
          }
          if (badgeEl) {
            badgeEl.textContent = showLabel ? coverSlides[currentSlide].label : `${motivosCount} motivos`;
          }
          dotBtns.forEach((btn, bIdx) => {
            if (bIdx === currentSlide) {
              btn.className = 'h-1.5 w-5 rounded-full transition-all duration-300 opacity-100';
              btn.style.backgroundColor = brand.color;
            } else {
              btn.className = 'h-1.5 w-1.5 rounded-full bg-gray-400/60 hover:bg-gray-500 transition-all duration-300 opacity-80';
              btn.style.backgroundColor = '';
            }
          });
        };

        const startAutoSlide = (immediateAdvance = false) => {
          if (slideInterval) clearInterval(slideInterval);
          if (immediateAdvance) {
            goToSlide(currentSlide + 1, true);
          }
          slideInterval = setInterval(() => {
            goToSlide(currentSlide + 1, true);
          }, 1100);
        };

        const stopAutoSlide = (resetToFirst = true) => {
          if (slideInterval) {
            clearInterval(slideInterval);
            slideInterval = null;
          }
          if (resetToFirst) {
            goToSlide(0, false);
          }
        };

        // Desktop: onhover avanza las portadas y al salir vuelve a la primera
        card.addEventListener('mouseenter', () => {
          startAutoSlide(true);
        });
        card.addEventListener('mouseleave', () => {
          stopAutoSlide(true);
        });

        // Click en los indicadores para cambiar de portada sin abrir todavía el detalle
        dotBtns.forEach((btn, bIdx) => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (slideInterval) {
              clearInterval(slideInterval);
              slideInterval = null;
            }
            goToSlide(bIdx, true);
          });
        });

        // Mobile / Touch: reproducir transición automáticamente al entrar en pantalla
        let observer = null;
        const isMobileOrTouch = window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse), (max-width: 1023px)').matches;
        if (isMobileOrTouch && 'IntersectionObserver' in window) {
          observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                startAutoSlide(false);
              } else {
                stopAutoSlide(true);
              }
            });
          }, { threshold: 0.65 });
          observer.observe(card);
        }

        activeGridSliderCleanups.push(() => {
          if (slideInterval) clearInterval(slideInterval);
          if (observer) observer.disconnect();
        });
      } else {
        card.innerHTML = `
          <!-- Contenedor imagen -->
          <div class="w-full bg-gray-50/70 flex items-center justify-center h-48 mb-4 overflow-hidden relative">
            <img src="${thumbImg}" alt="${prod.name}" loading="lazy" decoding="async" class="max-h-full object-contain scale-125 transition-transform duration-300 group-hover:scale-105">
          </div>
          <!-- Título del producto -->
          <h3 class="px-3 py-1.5 text-xs font-bold rounded-lg text-white shadow-sm transition-all transform scale-105 text-center" style="background-color: ${brand.color};">
            ${prod.name}
          </h3>
        `;
      }

      // Al hacer clic en la tarjeta, abre el detalle del producto
      card.addEventListener('click', () => {
        currentProductIndex = pIdx;
        openProductDetail(category, currentProductIndex);
      });

      gridContainer.appendChild(card);
    });
  }

  /**
   * VISTA 2: Abre el detalle del producto con sus variantes completas
   */
  function openProductDetail(category, prodIndex) {
    const gridView = document.getElementById('brand-category-grid-view');
    const detailView = document.getElementById('brand-product-detail-view');
    const backBtn = document.getElementById('btn-back-to-grid');
    const backBtnText = document.getElementById('btn-back-to-grid-text');

    if (!gridView || !detailView) return;

    cleanupGridSliders();

    // Cambiar a la vista de detalle
    gridView.classList.add('hidden');
    detailView.classList.remove('hidden');

    if (backBtnText) {
      backBtnText.textContent = `Volver a ${category.name}`;
    }

    // Botón volver al listado
    if (backBtn) {
      backBtn.onclick = () => {
        showCategoryGrid(category);
      };
    }

    const prods = category.products || [];
    const product = prods[prodIndex];
    if (!product) return;

    updateProductSeo(brand, category, product);
    const productRoute = `/marca/${encodeURIComponent(brand.id)}?prod=${encodeURIComponent(product.id)}`;
    if (window.location.pathname + window.location.search !== productRoute) {
      window.history.replaceState({ path: productRoute }, '', productRoute);
    }

    // Controles de paginación / navegación entre productos
    const btnPrev = document.getElementById('btn-prev-product');
    const btnNext = document.getElementById('btn-next-product');
    const pageIndicator = document.getElementById('product-pagination-indicator');

    if (pageIndicator) {
      pageIndicator.textContent = `${prodIndex + 1} de ${prods.length}`;
    }

    if (btnPrev) {
      btnPrev.disabled = prodIndex === 0;
      btnPrev.style.opacity = prodIndex === 0 ? '0.3' : '1';
      btnPrev.onclick = () => {
        if (currentProductIndex > 0) {
          currentProductIndex--;
          openProductDetail(category, currentProductIndex);
        }
      };
    }

    if (btnNext) {
      btnNext.disabled = prodIndex >= prods.length - 1;
      btnNext.style.opacity = prodIndex >= prods.length - 1 ? '0.3' : '1';
      btnNext.onclick = () => {
        if (currentProductIndex < prods.length - 1) {
          currentProductIndex++;
          openProductDetail(category, currentProductIndex);
        }
      };
    }

    // Desplazar suavemente hacia la vista de producto
    const mainContent = document.getElementById('brand-main-content');
    if (mainContent) {
      mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    displayProduct(product, prods.length, prodIndex);
  }

  /**
   * Renderiza el contenido interno del visor de producto y variantes
   */
  function displayProduct(product, totalInCat, pIdx) {
    if (!product) return;

    // Título, subcategoría y descripción
    const prodTitle = document.getElementById('sample-product-title');
    if (prodTitle) {
      prodTitle.textContent = product.name;
    }

    const subTag = document.getElementById('product-subcategory-tag');
    if (subTag) {
      subTag.textContent = product.subcategory || '';
      subTag.style.color = brand.color;
    }

    const descText = document.getElementById('product-description-text');
    if (descText) {
      descText.textContent = product.description || '';
    }

    // Imagen principal y badge
    const mainImg = document.getElementById('product-main-image');
    const variantBadge = document.getElementById('product-variant-badge');
    const fallbackImage = formatImgUrl(product.familyImage || (product.variants && product.variants[0]?.image) || brand.logo);

    if (mainImg) {
      setSafeProductImage(mainImg, fallbackImage, brand.logo);
      mainImg.alt = product.name;
    }
    if (variantBadge) {
      variantBadge.textContent = 'Vista Familia';
    }
    // GESTIÓN DE ATRIBUTOS Y VARIANTES
    const variants = product.variants || [];
    if (variants.length === 0) {
      hideAllAttributeWrappers();
      updateSpecsTable(null);
      return;
    }

    const attributes = product.attributes || {};
    const isColorFirst = product.selectorOrder === 'color-first';

    // Ajustar orden visual de los selectores (normal vs color-first para Línea de Dibujo)
    const setWrapperOrder = (id, orderVal) => {
      const el = document.getElementById(id);
      if (el) el.style.order = orderVal;
    };
    if (isColorFirst) {
      setWrapperOrder('selector-tamano-wrapper', '1');
      setWrapperOrder('selector-colores-wrapper', '2');
      setWrapperOrder('selector-tipo-hoja-wrapper', '3');
      setWrapperOrder('selector-hojas-wrapper', '4');
      setWrapperOrder('selector-manos-wrapper', '5');
      setWrapperOrder('selector-motivos-wrapper', '6');
    } else {
      setWrapperOrder('selector-tamano-wrapper', '');
      setWrapperOrder('selector-hojas-wrapper', '');
      setWrapperOrder('selector-tipo-hoja-wrapper', '');
      setWrapperOrder('selector-manos-wrapper', '');
      setWrapperOrder('selector-colores-wrapper', '');
      setWrapperOrder('selector-motivos-wrapper', '');
    }

    let selectedState = {
      tamano: variants[0].tamano || null,
      hojas: variants[0].hojas !== undefined ? variants[0].hojas : null,
      tipo_hoja: variants[0].tipo_hoja || null,
      manos: variants[0].manos !== undefined ? variants[0].manos : null,
      colorHex: variants[0].colorHex || null,
      colorName: variants[0].colorName || null,
      motivo: variants[0].motivo || null
    };

    renderInteractiveSelectors();

    function renderInteractiveSelectors() {
      // 1. Tamaño
      renderAttributeOptions(
        'options-tamano',
        'selector-tamano-wrapper',
        attributes.tamanos,
        selectedState.tamano,
        (val) => {
          selectedState.tamano = val;
          ensureValidSelection('tamano');
          renderInteractiveSelectors();
        },
        (val) => variants.some(v => v.tamano === val)
      );

      // 2. Hojas
      renderAttributeOptions(
        'options-hojas',
        'selector-hojas-wrapper',
        attributes.hojas,
        selectedState.hojas,
        (val) => {
          selectedState.hojas = isNaN(Number(val)) ? val : Number(val);
          ensureValidSelection('hojas');
          renderInteractiveSelectors();
        },
        (val) => variants.some(v => {
          const matchTam = !selectedState.tamano || v.tamano === selectedState.tamano;
          if (isColorFirst) {
            const matchColor = !selectedState.colorHex || (v.colorHex || '').toUpperCase() === (selectedState.colorHex || '').toUpperCase();
            return matchTam && matchColor && (String(v.hojas) === String(val));
          }
          return matchTam && (String(v.hojas) === String(val));
        })
      );

      // 3. Tipo de Hoja
      renderAttributeOptions(
        'options-tipo-hoja',
        'selector-tipo-hoja-wrapper',
        attributes.tipos_hoja,
        selectedState.tipo_hoja,
        (val) => {
          selectedState.tipo_hoja = val;
          ensureValidSelection('tipo_hoja');
          renderInteractiveSelectors();
        },
        (val) => variants.some(v => {
          const matchTam = !selectedState.tamano || v.tamano === selectedState.tamano;
          if (isColorFirst) {
            const matchColor = !selectedState.colorHex || (v.colorHex || '').toUpperCase() === (selectedState.colorHex || '').toUpperCase();
            return matchTam && matchColor && v.tipo_hoja === val;
          }
          const matchHojas = selectedState.hojas === null || String(v.hojas) === String(selectedState.hojas);
          const matchManos = selectedState.manos === null || String(v.manos) === String(selectedState.manos);
          return matchTam && matchHojas && matchManos && v.tipo_hoja === val;
        })
      );

      // 4. Manos (para Libros Comerciales)
      renderAttributeOptions(
        'options-manos',
        'selector-manos-wrapper',
        attributes.manos,
        selectedState.manos,
        (val) => {
          selectedState.manos = isNaN(Number(val)) ? val : Number(val);
          ensureValidSelection('manos');
          renderInteractiveSelectors();
        },
        (val) => variants.some(v => {
          const matchTam = !selectedState.tamano || v.tamano === selectedState.tamano;
          return matchTam && (String(v.manos) === String(val));
        })
      );

      // 5. Colores Disponibles
      renderColorOptions();

      // 5b. Motivos Disponibles (para líneas de diseño con múltiples modelos)
      renderMotivoOptions();

      // 6. Actualizar Ficha Técnica
      const currentActiveVariant = findActiveVariant();
      updateSpecsTable(currentActiveVariant);
    }

    function ensureValidSelection(priority) {
      let match = findActiveVariant();
      if (!match) {
        let compatible = variants.filter(v => {
          if (selectedState.tamano && v.tamano && v.tamano !== selectedState.tamano) return false;
          return true;
        });

        if (isColorFirst && priority === 'color' && selectedState.colorHex) {
          const byColor = compatible.filter(v => (v.colorHex || '').toUpperCase() === (selectedState.colorHex || '').toUpperCase());
          if (byColor.length > 0) {
            const keepTipo = selectedState.tipo_hoja ? byColor.find(v => v.tipo_hoja === selectedState.tipo_hoja) : null;
            compatible = keepTipo ? [keepTipo] : byColor;
          }
        } else if (isColorFirst && priority === 'tamano' && selectedState.colorHex) {
          const keepColor = compatible.filter(v => (v.colorHex || '').toUpperCase() === (selectedState.colorHex || '').toUpperCase());
          if (keepColor.length > 0) compatible = keepColor;
        }

        const fallback = compatible[0] || variants[0];
        if (fallback) {
          if (fallback.tamano !== undefined) selectedState.tamano = fallback.tamano;
          if (fallback.hojas !== undefined) selectedState.hojas = fallback.hojas;
          if (fallback.tipo_hoja !== undefined) selectedState.tipo_hoja = fallback.tipo_hoja;
          if (fallback.manos !== undefined) selectedState.manos = fallback.manos;
          if (fallback.colorHex !== undefined) selectedState.colorHex = fallback.colorHex;
          if (fallback.colorName !== undefined) selectedState.colorName = fallback.colorName;
          if (fallback.motivo !== undefined) selectedState.motivo = fallback.motivo;
        }
      }
    }

    function findActiveVariant() {
      return variants.find(v => {
        if (selectedState.tamano && v.tamano && v.tamano !== selectedState.tamano) return false;
        if (selectedState.hojas !== null && v.hojas !== undefined && String(v.hojas) !== String(selectedState.hojas)) return false;
        if (selectedState.tipo_hoja && v.tipo_hoja && v.tipo_hoja !== selectedState.tipo_hoja) return false;
        if (selectedState.manos !== null && v.manos !== undefined && String(v.manos) !== String(selectedState.manos)) return false;
        if (selectedState.colorHex && v.colorHex && v.colorHex !== selectedState.colorHex) return false;
        if (selectedState.motivo && v.motivo && v.motivo !== selectedState.motivo) return false;
        return true;
      }) || variants.find(v => {
        if (selectedState.tamano && v.tamano && v.tamano !== selectedState.tamano) return false;
        return true;
      }) || variants[0];
    }
    
    function renderAttributeOptions(containerId, wrapperId, optionsArray, currentValue, onSelect, isAvailableFn) {
      const container = document.getElementById(containerId);
      const wrapper = document.getElementById(wrapperId);
      if (!container || !wrapper) return;

      if (!optionsArray || optionsArray.length === 0) {
        wrapper.classList.add('hidden');
        return;
      }
      wrapper.classList.remove('hidden');

      // Si es selector de tipo de hoja, adaptar título según el tipo de producto (ej. Mapas, Orientación)
      if (containerId === 'options-tipo-hoja') {
        const label = wrapper.querySelector('label');
        if (label) {
          const isMapOrDidactic = optionsArray.some(opt => {
            const low = String(opt).toLowerCase();
            return low.includes('político') || low.includes('politico') || low.includes('contorno') || low.includes('físico') || low.includes('fisico');
          });
          const isOrientation = optionsArray.every(opt => {
            const low = String(opt).toLowerCase();
            return low === 'apaisado' || low === 'alto';
          });
          const isIndice = optionsArray.every(opt => {
            const low = String(opt).toLowerCase();
            return low.includes('índice') || low.includes('indice');
          });
          label.textContent = isMapOrDidactic
            ? 'Tipo / Modelo'
            : (isOrientation ? 'Orientación' : (isIndice ? 'Índice' : 'Tipo de Hoja'));
        }
      }

      container.innerHTML = '';
      optionsArray.forEach(opt => {
        const isSelected = String(opt) === String(currentValue);
        const isAvailable = isAvailableFn ? isAvailableFn(opt) : true;

        const btn = document.createElement('button');
        btn.type = 'button';

        // Iconos disponibles conocidos (soporta singular/plural y sin acentos)
        const iconMap = {
          'rayado': 'rayado.png',
          'rayada': 'rayado.png',
          'rayados': 'rayado.png',
          'rayadas': 'rayado.png',
          'cuadriculado': 'cuadriculado.png',
          'cuadriculada': 'cuadriculado.png',
          'cuadriculados': 'cuadriculado.png',
          'cuadriculadas': 'cuadriculado.png',
          'lisas': 'lisas.png',
          'lisa': 'lisas.png',
          'liso': 'lisas.png',
          'lisos': 'lisas.png'
        };

        const optKey = String(opt)
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim();
        const iconFileName = iconMap[optKey];
        const hasIcon = (containerId === 'options-tipo-hoja') && Boolean(iconFileName);

        // 1. Renderizado de contenido (Icono si existe, texto con nombre si es mapas u otros)
        if (hasIcon) {
          const img = document.createElement('img');
          const iconPath = formatImgUrl(`/assets/img/icons/${iconFileName}`);
          const svgFallback = SHEET_TYPE_SVG_FALLBACKS[iconFileName];
          img.onerror = () => {
            if (svgFallback && img.src !== svgFallback) {
              img.onerror = null;
              img.src = svgFallback;
            }
          };
          img.src = iconPath;
          img.alt = opt;
          img.className = 'w-full h-full object-cover rounded-full pointer-events-none';
          btn.appendChild(img);
          btn.title = opt; // Tooltip con el nombre (Rayado, Cuadriculado, Lisas)
        } else {
          btn.textContent = (typeof opt === 'number' && containerId === 'options-hojas') 
            ? `${opt} Hojas` 
            : (containerId === 'options-manos' ? `${opt} Manos` : opt);
        }

        // 2. Clases base (para tipo con icono: exactamente redondo w-7 h-7 p-0 como el selector de colores)
        let baseClasses = '';
        if (hasIcon) {
          baseClasses = 'w-7 h-7 p-0 rounded-full border-2 border-black overflow-hidden flex items-center justify-center relative transition-all shadow-sm ';
        } else {
          baseClasses = 'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ';
        }

        if (!isAvailable) {
          btn.disabled = true;
          // Botones deshabilitados: fondo rojito tenue con baja opacidad y tachado
          btn.className = baseClasses + 'bg-red-50 text-red-300 border border-red-200/60 cursor-not-allowed line-through opacity-40';
        } else if (isSelected) {
          if (hasIcon) {
            btn.className = baseClasses + 'ring-2 ring-offset-2 scale-110';
            btn.style.boxShadow = `0 0 0 2px #fff, 0 0 0 4px ${brand.color}`;
          } else {
            btn.className = baseClasses + 'text-white font-bold shadow-sm transform scale-105';
            btn.style.backgroundColor = brand.color;
          }
        } else {
          const borderStyle = hasIcon ? 'bg-white hover:scale-110 opacity-90 hover:opacity-100' : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400 hover:bg-gray-50';
          btn.className = baseClasses + borderStyle;
          btn.addEventListener('click', () => onSelect(opt));
        }

        container.appendChild(btn);
      });
    }
    function renderColorOptions() {
      const colorsContainer = document.getElementById('sample-product-colors');
      const colorLabel = document.getElementById('selected-color-name');
      const colorWrapper = document.getElementById('selector-colores-wrapper');
      if (!colorsContainer || !colorWrapper) return;

      const coloredVariants = variants.filter(v => v.colorHex);
      if (coloredVariants.length === 0) {
        colorWrapper.classList.add('hidden');
        return;
      }

      const compatibleVariants = coloredVariants.filter(v => {
        if (selectedState.tamano && v.tamano && v.tamano !== selectedState.tamano) return false;
        if (!isColorFirst) {
          if (selectedState.hojas !== null && v.hojas !== undefined && String(v.hojas) !== String(selectedState.hojas)) return false;
          if (selectedState.tipo_hoja && v.tipo_hoja && v.tipo_hoja !== selectedState.tipo_hoja) return false;
          if (selectedState.manos !== null && v.manos !== undefined && String(v.manos) !== String(selectedState.manos)) return false;
        }
        return true;
      });

      const sourceList = compatibleVariants.length > 0 ? compatibleVariants : coloredVariants;

      // Deduplicar colores
      const seenColors = new Set();
      const uniqueColorVariants = [];
      sourceList.forEach(v => {
        const key = (v.colorHex || '').trim().toUpperCase();
        if (!seenColors.has(key)) {
          seenColors.add(key);
          uniqueColorVariants.push(v);
        }
      });

      if (uniqueColorVariants.length === 0) {
        colorWrapper.classList.add('hidden');
        return;
      }
      colorWrapper.classList.remove('hidden');

      if (colorLabel) {
        colorLabel.textContent = selectedState.colorName || (uniqueColorVariants[0]?.colorName || '');
      }

      colorsContainer.innerHTML = '';
      uniqueColorVariants.forEach(variant => {
        const isSelected = (variant.colorHex || '').toUpperCase() === (selectedState.colorHex || '').toUpperCase();

        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = `w-7 h-7 rounded-full border-2 border-black transition-all flex items-center justify-center relative shadow-sm ${
          isSelected ? 'ring-2 ring-offset-2 scale-110' : 'hover:scale-110 opacity-90 hover:opacity-100'
        }`;
        if (variant.colorHex && variant.colorHex.includes('gradient')) {
          dot.style.background = variant.colorHex;
        } else {
          dot.style.backgroundColor = variant.colorHex;
        }
        if (isSelected) {
          dot.style.boxShadow = `0 0 0 2px #fff, 0 0 0 4px ${brand.color}`;
        }
        dot.setAttribute('title', variant.colorName || variant.sku);

        // Hover: Swap de imagen en el visor
        dot.addEventListener('mouseenter', () => {
          if (mainImg && variant.image) {
            setSafeProductImage(mainImg, variant.image, fallbackImage);
          }
          if (variantBadge) {
            variantBadge.textContent = variant.colorName || 'Color seleccionado';
          }
          if (colorLabel && variant.colorName) {
            colorLabel.textContent = variant.colorName;
          }
        });

        // Mouseleave: Retornar a la foto seleccionada
        dot.addEventListener('mouseleave', () => {
          const currentVariant = findActiveVariant();
          if (mainImg) {
            setSafeProductImage(mainImg, currentVariant?.image, fallbackImage);
          }
          if (variantBadge) {
            variantBadge.textContent = currentVariant.colorName || 'Seleccionado';
          }
          if (colorLabel) {
            colorLabel.textContent = selectedState.colorName || '';
          }
        });

        // Click: Fijar el color seleccionado
        dot.addEventListener('click', () => {
          selectedState.colorHex = variant.colorHex;
          selectedState.colorName = variant.colorName;
          if (isColorFirst) {
            ensureValidSelection('color');
            renderInteractiveSelectors();
            return;
          }
          if (variant.image && mainImg) {
            setSafeProductImage(mainImg, variant.image, fallbackImage);
          }
          renderColorOptions();
          updateSpecsTable(variant);
        });

        colorsContainer.appendChild(dot);
      });
    }

    function renderMotivoOptions() {
      const motivosContainer = document.getElementById('sample-product-motivos');
      const motivoLabel = document.getElementById('selected-motivo-name');
      const motivoWrapper = document.getElementById('selector-motivos-wrapper');
      if (!motivosContainer || !motivoWrapper) return;

      const motivoVariants = variants.filter(v => v.motivo);
      if (motivoVariants.length === 0) {
        motivoWrapper.classList.add('hidden');
        return;
      }

      const compatibleVariants = motivoVariants.filter(v => {
        if (selectedState.tamano && v.tamano && v.tamano !== selectedState.tamano) return false;
        if (selectedState.hojas !== null && v.hojas !== undefined && String(v.hojas) !== String(selectedState.hojas)) return false;
        if (selectedState.tipo_hoja && v.tipo_hoja && v.tipo_hoja !== selectedState.tipo_hoja) return false;
        if (selectedState.manos !== null && v.manos !== undefined && String(v.manos) !== String(selectedState.manos)) return false;
        return true;
      });

      const sourceList = compatibleVariants.length > 0 ? compatibleVariants : motivoVariants;

      // Deduplicar por nombre de motivo
      const seenMotivos = new Set();
      const uniqueMotivoVariants = [];
      sourceList.forEach(v => {
        const key = (v.motivo || '').trim();
        if (key && !seenMotivos.has(key)) {
          seenMotivos.add(key);
          uniqueMotivoVariants.push(v);
        }
      });

      if (uniqueMotivoVariants.length === 0) {
        motivoWrapper.classList.add('hidden');
        return;
      }
      motivoWrapper.classList.remove('hidden');

      if (!selectedState.motivo && uniqueMotivoVariants[0]?.motivo) {
        selectedState.motivo = uniqueMotivoVariants[0].motivo;
      }

      const formatMotivoNumber = (val, idx) => {
        if (!val) return `${idx + 1}`;
        const stripped = String(val).replace(/^motivo\s*/i, '').trim();
        return stripped || `${idx + 1}`;
      };

      if (motivoLabel) {
        const activeIdx = uniqueMotivoVariants.findIndex(v => String(v.motivo) === String(selectedState.motivo));
        motivoLabel.textContent = formatMotivoNumber(
          selectedState.motivo || uniqueMotivoVariants[0]?.motivo,
          activeIdx !== -1 ? activeIdx : 0
        );
      }

      motivosContainer.innerHTML = '';
      uniqueMotivoVariants.forEach((variant, mIdx) => {
        const isSelected = String(variant.motivo) === String(selectedState.motivo);
        const motivoShort = formatMotivoNumber(variant.motivo, mIdx);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `w-8 h-8 p-0.5 rounded-md border-2 border-black bg-white overflow-hidden transition-all flex items-center justify-center relative shadow-sm ${
          isSelected ? 'ring-2 ring-offset-2 scale-110' : 'hover:scale-110 opacity-90 hover:opacity-100'
        }`;
        if (isSelected) {
          btn.style.boxShadow = `0 0 0 2px #fff, 0 0 0 4px ${brand.color}`;
        }
        btn.setAttribute('title', `Motivo ${motivoShort}`);

        const thumbUrl = formatImgUrl(variant.image || fallbackImage);
        btn.innerHTML = `
          <img src="${thumbUrl}" alt="Motivo ${motivoShort}" class="w-full h-full object-contain pointer-events-none">
        `;

        // Hover: previsualizar portada del motivo
        btn.addEventListener('mouseenter', () => {
          if (mainImg && variant.image) {
            setSafeProductImage(mainImg, variant.image, fallbackImage);
          }
          if (variantBadge) {
            variantBadge.textContent = `Motivo ${motivoShort}`;
          }
          if (motivoLabel) {
            motivoLabel.textContent = motivoShort;
          }
        });

        // Mouseleave: retornar al motivo activo
        btn.addEventListener('mouseleave', () => {
          const currentVariant = findActiveVariant();
          if (mainImg) {
            setSafeProductImage(mainImg, currentVariant?.image, fallbackImage);
          }
          if (variantBadge) {
            variantBadge.textContent = currentVariant?.motivo || currentVariant?.colorName || currentVariant?.tipo_hoja || 'Seleccionado';
          }
          if (motivoLabel) {
            const activeIdx = uniqueMotivoVariants.findIndex(v => String(v.motivo) === String(selectedState.motivo));
            motivoLabel.textContent = formatMotivoNumber(selectedState.motivo, activeIdx !== -1 ? activeIdx : 0);
          }
        });

        // Click: fijar motivo seleccionado
        btn.addEventListener('click', () => {
          selectedState.motivo = variant.motivo;
          if (variant.image && mainImg) {
            setSafeProductImage(mainImg, variant.image, fallbackImage);
          }
          renderMotivoOptions();
          updateSpecsTable(findActiveVariant());
        });

        motivosContainer.appendChild(btn);
      });
    }

    function updateSpecsTable(activeVariant) {
      const specTamano = document.getElementById('spec-tamano');
      const specTipo = document.getElementById('spec-tipo');
      const specColor = document.getElementById('spec-color');
      const specCaja = document.getElementById('spec-caja');
      const specPaquete = document.getElementById('spec-paquete');
      const specPalet = document.getElementById('spec-palet');
      const specGramaje = document.getElementById('spec-gramaje');

      if (!activeVariant) {
        if (specTamano) specTamano.textContent = '—';
        if (specTipo) specTipo.textContent = '—';
        if (specColor) specColor.textContent = '—';
        if (specCaja) specCaja.textContent = '—';
        if (specPaquete) specPaquete.textContent = '—';
        if (specPalet) specPalet.textContent = '—';
        if (specGramaje) specGramaje.textContent = '—';
        return;
      }

      // 1. Tamaño
      if (specTamano) specTamano.textContent = activeVariant.tamano || '—';

      // 2. Tipo (separado de Color: Rayado, Cuadriculado, Político, etc.)
      if (specTipo) {
        specTipo.textContent = activeVariant.tipo_hoja || (activeVariant.manos ? `${activeVariant.manos} Manos` : '—');
      }

      // 3. Color / Motivo (separado de Tipo: Amarillo, Azul, Motivo 1, o — si no aplica)
      if (specColor) {
        specColor.textContent = activeVariant.colorName || activeVariant.motivo || (activeVariant.colorHex ? activeVariant.colorHex : '—');
      }

      // 4. Specs de embalaje y gramaje del JSON
      const sp = activeVariant.specs || {};
      if (specCaja) specCaja.textContent = sp.caja || '—';
      if (specPaquete) specPaquete.textContent = sp.paquete || '—';
      if (specPalet) specPalet.textContent = sp.palet || '—';
      if (specGramaje) specGramaje.textContent = sp.gramaje || '—';

      if (mainImg && activeVariant.image) {
        setSafeProductImage(mainImg, activeVariant.image, fallbackImage);
      }
      if (variantBadge && activeVariant.sku) {
        variantBadge.textContent = activeVariant.colorName || activeVariant.motivo || activeVariant.tipo_hoja || 'Modelo';
      }
      renderGalleryThumbs(activeVariant);
    }

    function renderGalleryThumbs(activeVariant) {
      const thumbsContainer = document.getElementById('product-gallery-thumbs');
      const rawList = [];
      if (activeVariant?.image) rawList.push(activeVariant.image);
      if (Array.isArray(activeVariant?.images)) rawList.push(...activeVariant.images);
      if (Array.isArray(product.images)) rawList.push(...product.images);
      if (Array.isArray(product.gallery)) rawList.push(...product.gallery);

      const seen = new Set();
      const galleryUrls = [];
      for (const raw of rawList) {
        const formatted = formatImgUrl(raw);
        if (formatted && !seen.has(formatted)) {
          seen.add(formatted);
          galleryUrls.push(formatted);
        }
      }

      if (galleryUrls.length <= 1) {
        if (thumbsContainer) {
          thumbsContainer.innerHTML = '';
          thumbsContainer.classList.add('hidden');
        }
        window.__tgActiveGallery = {
          images: galleryUrls.length === 1 ? galleryUrls : [formatImgUrl(activeVariant?.image || fallbackImage)],
          activeIdx: 0,
          onSelect: null
        };
        return;
      }

      let activeIdx = 0;
      const selectThumb = (idx) => {
        activeIdx = ((idx % galleryUrls.length) + galleryUrls.length) % galleryUrls.length;
        if (window.__tgActiveGallery) window.__tgActiveGallery.activeIdx = activeIdx;
        if (mainImg) {
          setSafeProductImage(mainImg, galleryUrls[activeIdx], fallbackImage);
        }
        if (thumbsContainer) {
          const btns = thumbsContainer.querySelectorAll('[data-gallery-idx]');
          btns.forEach((b, bIdx) => {
            if (bIdx === activeIdx) {
              b.className = 'w-14 h-14 p-1 rounded-lg bg-white border-2 flex items-center justify-center shrink-0 transition-all shadow-sm scale-105';
              b.style.borderColor = brand.color;
            } else {
              b.className = 'w-14 h-14 p-1 rounded-lg bg-white border border-gray-200 hover:border-gray-400 flex items-center justify-center shrink-0 transition-all opacity-75 hover:opacity-100';
              b.style.borderColor = '';
            }
          });
        }
      };

      window.__tgActiveGallery = {
        images: galleryUrls,
        activeIdx: 0,
        onSelect: selectThumb
      };

      if (!thumbsContainer) return;
      thumbsContainer.innerHTML = '';
      thumbsContainer.classList.remove('hidden');

      galleryUrls.forEach((url, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.galleryIdx = String(idx);
        btn.title = `Vista ${idx + 1}`;
        btn.innerHTML = `<img src="${url}" alt="Vista ${idx + 1}" loading="lazy" decoding="async" class="max-h-full max-w-full object-contain pointer-events-none">`;
        btn.addEventListener('click', () => selectThumb(idx));
        thumbsContainer.appendChild(btn);
      });

      selectThumb(0);
    }

    function hideAllAttributeWrappers() {
      ['selector-tamano-wrapper', 'selector-hojas-wrapper', 'selector-tipo-hoja-wrapper', 'selector-manos-wrapper', 'selector-colores-wrapper', 'selector-motivos-wrapper'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
      });
    }
  }
}

/**
 * Fallback para marcas en caso de no contar con JSON detallado
 */
function renderLegacyCatalog(brand) {
  const sidebar = document.getElementById('brand-sidebar-container');
  if (sidebar) sidebar.style.backgroundColor = brand.color;

  const categoriesList = document.getElementById('brand-categories-list');
  if (categoriesList && brand.categories) {
    categoriesList.innerHTML = '';
    brand.categories.forEach((cat, index) => {
      const li = document.createElement('li');
      const isFirst = index === 0;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `w-full text-left py-3 px-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-between transition-all duration-200 brand-cat-btn ${
        isFirst ? 'bg-white shadow-md pl-5' : 'text-white hover:bg-white/15'
      }`;
      if (isFirst) btn.style.color = brand.color;

      btn.innerHTML = `<span>${cat}</span><span class="text-xs">&gt;</span>`;
      li.appendChild(btn);
      categoriesList.appendChild(li);
    });
  }
}

// Exportar función globalmente para el router SPA
window.initBrandPage = initBrandPage;
