/**
 * search.js - Buscador con autocompletado en tiempo real para Tecnografic
 *
 * Funcionalidad integrada del buscador con:
 * - Carga asíncrona no bloqueante de products.json (no interrumpe el render inicial)
 * - Normalización de texto (insensible a acentos, mayúsculas/minúsculas) y búsqueda multipalabra
 * - Dropdown de sugerencias (máximo 12 resultados)
 * - Resaltado de texto coincidente (<mark>)
 * - Navegación por teclado (↑ ↓ Enter Escape)
 * - Botón de limpiar búsqueda
 * - Cierre del dropdown al hacer clic fuera
 */

let productsCache = [];
let isLoaded = false;
let loadingPromise = null;
let searchSelectedIndex = -1;
let searchCurrentFiltered = [];

const BRAND_COLORS = {
  'triunfante': '#0062cc',
  'tintoretto': '#00c6fd',
  'potosi': '#76a41f',
  'mis-hojas': '#8174b8'
};

// Control de visibilidad de la barra de búsqueda y botón flotante al hacer scroll
document.addEventListener("DOMContentLoaded", () => {
  let lastScrollTop = 0;
  const searchBarContainer = document.getElementById("search-bar-container");
  const floatingSearchBtn = document.getElementById("floating-search-btn");
  const searchInput = document.getElementById("global-search-input");
  const suggestionsBox = document.getElementById("search-suggestions-box");
  const scrollThreshold = 10;
  let isHidden = false;
  let isLocked = false;

  // Iniciar precarga del catálogo en cuanto el DOM esté listo
  loadProductsData();

  if (searchBarContainer) {
    window.addEventListener("scroll", () => {
      let currentScroll = window.pageYOffset || document.documentElement.scrollTop;

      if (isLocked) {
        lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
        return;
      }

      const scrollDifference = currentScroll - lastScrollTop;

      if (Math.abs(scrollDifference) < scrollThreshold) {
        return;
      }

      // No ocultar la barra si el usuario tiene el foco en el buscador o el dropdown abierto
      const isDropdownOpen = suggestionsBox && !suggestionsBox.classList.contains("hidden");
      const isInputFocused = document.activeElement === searchInput;

      // Scroll hacia abajo -> Ocultar barra y mostrar botón flotante
      if (scrollDifference > 0 && currentScroll > 60 && !isHidden && !isDropdownOpen && !isInputFocused) {
        isHidden = true;
        isLocked = true;

        searchBarContainer.classList.remove("max-h-20", "opacity-100", "overflow-visible");
        searchBarContainer.classList.add("max-h-0", "opacity-0", "overflow-hidden", "pointer-events-none");

        if (floatingSearchBtn) {
          floatingSearchBtn.classList.remove("scale-0", "opacity-0", "pointer-events-none");
          floatingSearchBtn.classList.add("scale-100", "opacity-100");
        }

        setTimeout(() => { isLocked = false; }, 300);

      // Scroll hacia arriba -> Mostrar barra y ocultar botón flotante
      } else if (scrollDifference < 0 && isHidden) {
        isHidden = false;
        isLocked = true;

        searchBarContainer.classList.remove("max-h-0", "opacity-0", "overflow-hidden", "pointer-events-none");
        searchBarContainer.classList.add("max-h-20", "opacity-100", "overflow-visible");

        if (floatingSearchBtn) {
          floatingSearchBtn.classList.remove("scale-100", "opacity-100");
          floatingSearchBtn.classList.add("scale-0", "opacity-0", "pointer-events-none");
        }

        setTimeout(() => { isLocked = false; }, 300);
      }

      lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
    }, { passive: true });

    // Acción al hacer clic en el icono flotante de lupa
    if (floatingSearchBtn) {
      floatingSearchBtn.addEventListener("click", () => {
        isHidden = false;

        // Mostrar barra de búsqueda permitiendo overflow para el dropdown
        searchBarContainer.classList.remove("max-h-0", "opacity-0", "overflow-hidden", "pointer-events-none");
        searchBarContainer.classList.add("max-h-20", "opacity-100", "overflow-visible");

        // Ocultar botón flotante
        floatingSearchBtn.classList.remove("scale-100", "opacity-100");
        floatingSearchBtn.classList.add("scale-0", "opacity-0", "pointer-events-none");

        if (searchInput) {
          searchInput.focus();
        }
      });
    }
  }
});

// ─── Carga asíncrona no bloqueante del catálogo ──────────────────────────────
async function loadProductsData() {
  if (isLoaded) return productsCache;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const res = await fetch('/assets/data/products.json');
      if (res.ok) {
        productsCache = await res.json();
        isLoaded = true;
        console.log('✅ Catálogo de productos precargado en segundo plano:', productsCache.length, 'artículos');
      }
    } catch (err) {
      console.warn('No se pudo precargar products.json:', err);
    } finally {
      loadingPromise = null;
    }
    return productsCache;
  })();

  return loadingPromise;
}

// ─── Normalización de texto para búsqueda insensible a acentos ────────────────
function normalizeText(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// ─── Función pública de búsqueda (soporta múltiples palabras en cualquier orden)
window.searchProducts = function (query) {
  if (!isLoaded || !query || query.trim() === '') return [];
  const q = normalizeText(query.trim());
  const terms = q.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  return productsCache.filter(p => {
    const searchable = [
      p.name,
      p.brandName,
      p.brand,
      p.category,
      p.subcategory,
      p.spec,
      p.description,
      p.colorNames ? p.colorNames.join(' ') : '',
      p.specs ? Object.values(p.specs).join(' ') : ''
    ]
      .filter(Boolean)
      .map(normalizeText)
      .join(' ');

    return terms.every(term => searchable.includes(term));
  });
};

// ─── Resaltado del texto coincidente ──────────────────────────────────────────
function highlightText(text, query) {
  if (!query || !query.trim() || !text) return text;
  const terms = normalizeText(query.trim()).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return text;

  const normalizedText = normalizeText(text);

  // Buscar el primer término que coincida en este fragmento de texto
  for (const term of terms) {
    const startIndex = normalizedText.indexOf(term);
    if (startIndex !== -1) {
      const endIndex = startIndex + term.length;
      return (
        text.substring(0, startIndex) +
        `<mark style="background-color:#fef08a;color:#854d0e;font-weight:600;padding:0 2px;border-radius:2px;">${text.substring(startIndex, endIndex)}</mark>` +
        text.substring(endIndex)
      );
    }
  }

  return text;
}

// ─── Inicialización del buscador (llamada tras el DOMContentLoaded del layout) ─
function initSearchInput() {
  const input          = document.getElementById('global-search-input');
  const clearBtn       = document.getElementById('search-clear-btn');
  const suggestionsBox = document.getElementById('search-suggestions-box');
  const suggestionList = document.getElementById('search-suggestions-list');
  const counter        = document.getElementById('search-result-counter');
  const searchBarContainer = document.getElementById('search-bar-container');

  // Si el DOM aún no tiene los elementos, salir silenciosamente.
  if (!input || input.dataset.searchInitialized) return;
  if (!suggestionsBox || !suggestionList) return;

  input.dataset.searchInitialized = 'true';

  // ── Escribir en el input ──────────────────────────────────────────────────
  input.addEventListener('input', async (e) => {
    const query = e.target.value;

    // Mostrar/ocultar botón X
    if (clearBtn) {
      clearBtn.classList.toggle('hidden', query.length === 0);
    }

    if (!query.trim()) {
      hideSuggestions(suggestionsBox);
      return;
    }

    // Asegurar que si el usuario escribe, la barra de búsqueda permanezca abierta y con overflow-visible
    if (searchBarContainer) {
      searchBarContainer.classList.remove("max-h-0", "opacity-0", "overflow-hidden", "pointer-events-none");
      searchBarContainer.classList.add("max-h-20", "opacity-100", "overflow-visible");
    }

    // Si aún no terminó de cargar products.json, esperar su carga antes de filtrar
    if (!isLoaded) {
      await loadProductsData();
    }

    const results = window.searchProducts(query);
    searchCurrentFiltered = results.slice(0, 12);
    searchSelectedIndex = -1;
    renderSuggestions(suggestionList, suggestionsBox, counter, searchCurrentFiltered, query);
  });

  // ── Mostrar sugerencias al volver a enfocar el input si ya hay texto ─────
  input.addEventListener('focus', async () => {
    const query = input.value;
    if (!query.trim()) return;
    if (!isLoaded) {
      await loadProductsData();
    }
    const results = window.searchProducts(query);
    searchCurrentFiltered = results.slice(0, 12);
    renderSuggestions(suggestionList, suggestionsBox, counter, searchCurrentFiltered, query);
  });

  // ── Botón limpiar ─────────────────────────────────────────────────────────
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      input.value = '';
      clearBtn.classList.add('hidden');
      hideSuggestions(suggestionsBox);
      input.focus();
    });
  }

  // ── Navegación por teclado ────────────────────────────────────────────────
  input.addEventListener('keydown', (e) => {
    if (suggestionsBox.classList.contains('hidden') || searchCurrentFiltered.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      searchSelectedIndex = (searchSelectedIndex + 1) % searchCurrentFiltered.length;
      updateSelectedHighlight(suggestionList);

    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      searchSelectedIndex = (searchSelectedIndex - 1 + searchCurrentFiltered.length) % searchCurrentFiltered.length;
      updateSelectedHighlight(suggestionList);

    } else if (e.key === 'Enter') {
      e.preventDefault();
      const targetIndex = searchSelectedIndex >= 0 ? searchSelectedIndex : 0;
      if (searchCurrentFiltered[targetIndex]) {
        navigateToProduct(searchCurrentFiltered[targetIndex], input, suggestionsBox, clearBtn);
      }

    } else if (e.key === 'Escape') {
      hideSuggestions(suggestionsBox);
    }
  });

  // ── Cerrar dropdown al hacer clic fuera ──────────────────────────────────
  document.addEventListener('click', (e) => {
    const wrapper = document.getElementById('search-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
      hideSuggestions(suggestionsBox);
    }
  });
}

// ─── Renderizar las sugerencias en el dropdown ────────────────────────────────
function renderSuggestions(list, box, counter, items, query) {
  list.innerHTML = '';

  if (items.length === 0) {
    list.innerHTML = `
      <div class="px-4 py-5 text-center text-gray-400">
        <i class="fa-solid fa-magnifying-glass-minus text-2xl mb-2 text-gray-300 block"></i>
        <p class="text-sm font-medium text-gray-600">Sin resultados para "<strong>${query}</strong>"</p>
        <p class="text-xs text-gray-400 mt-0.5">Probá con "cuaderno", "repuesto" o una marca</p>
      </div>
    `;
    if (counter) counter.textContent = '0 resultados';
  } else {
    items.forEach((item, index) => {
      const highlightedName = highlightText(item.name, query);
      const thumbUrl = item.image ? (item.image.startsWith('/') ? item.image : `/${item.image}`) : '/assets/img/marcas-logos/Tecnografic logo.png';
      const brandColor = item.brandColor || BRAND_COLORS[item.brand] || '#0062cc';

      // Renderizar muestras de colores del producto si tiene colores disponibles
      let colorsHtml = '';
      if (Array.isArray(item.colors) && item.colors.length > 0) {
        const maxDots = 7;
        const visibleColors = item.colors.slice(0, maxDots);
        const extraCount = item.colors.length - visibleColors.length;
        const dots = visibleColors
          .map(hex => `<span class="w-3 h-3 rounded-full border border-gray-300 inline-block shrink-0" style="background-color: ${hex};"></span>`)
          .join('');
        const extraBadge = extraCount > 0
          ? `<span class="text-[10px] font-semibold text-gray-400 ml-0.5">+${extraCount}</span>`
          : '';
        colorsHtml = `<div class="flex items-center gap-1 mt-1">${dots}${extraBadge}</div>`;
      }

      const el = document.createElement('div');
      el.className = 'search-suggestion-item px-3 py-2.5 cursor-pointer flex items-center justify-between gap-3 hover:bg-blue-50/70 transition-colors';
      el.dataset.index = index;

      el.innerHTML = `
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <div class="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200/80 p-1 flex items-center justify-center shrink-0 overflow-hidden">
            <img src="${thumbUrl}" alt="${item.name}" class="max-h-full max-w-full object-contain" onerror="this.src='/assets/img/marcas-logos/Tecnografic logo.png'">
          </div>
          <div class="flex flex-col min-w-0 flex-1">
            <span class="text-xs sm:text-sm font-semibold text-gray-800 truncate">${highlightedName}</span>
            ${colorsHtml}
          </div>
        </div>
        <div class="shrink-0 flex items-center">
          ${item.brandName ? `<span class="text-xs font-extrabold whitespace-nowrap" style="color: ${brandColor};">${item.brandName}</span>` : ''}
        </div>
      `;

      el.addEventListener('click', () => {
        const input    = document.getElementById('global-search-input');
        const clearBtn = document.getElementById('search-clear-btn');
        navigateToProduct(item, input, box, clearBtn);
      });

      list.appendChild(el);
    });

    if (counter) counter.textContent = `${items.length} resultado${items.length !== 1 ? 's' : ''}`;
  }

  box.classList.remove('hidden');
}

// ─── Resaltar el ítem seleccionado con teclado ────────────────────────────────
function updateSelectedHighlight(list) {
  const items = list.querySelectorAll('.search-suggestion-item');
  items.forEach((el, idx) => {
    if (idx === searchSelectedIndex) {
      el.classList.add('bg-blue-50', 'border-l-4', 'border-blue-600', 'pl-3');
      el.scrollIntoView({ block: 'nearest' });
    } else {
      el.classList.remove('bg-blue-50', 'border-l-4', 'border-blue-600', 'pl-3');
    }
  });
}

// ─── Ocultar el dropdown ──────────────────────────────────────────────────────
function hideSuggestions(box) {
  if (box) box.classList.add('hidden');
  searchSelectedIndex = -1;
}

// ─── Acción al seleccionar un producto ───────────────────────────────────────
function navigateToProduct(item, input, box, clearBtn) {
  if (input) input.value = item.name;
  if (clearBtn) clearBtn.classList.remove('hidden');
  hideSuggestions(box);

  // Navegar a la marca con Deep Linking (URL limpia) si cuenta con brand y id
  if (item.brand && typeof window.appNavigate === 'function') {
    const targetUrl = item.id 
      ? `/marca/${item.brand}?prod=${encodeURIComponent(item.id)}`
      : `/marca/${item.brand}`;
    window.appNavigate(targetUrl);
  }
}

// Exportar initSearchInput para que el router lo llame al montar el layout
window.initSearchInput = initSearchInput;
