/**
 * search.js - Buscador con autocompletado en tiempo real para Tecnografic
 *
 * Funcionalidad integrada del buscador con:
 * - Carga asíncrona no bloqueante de products.json (no interrumpe el render inicial)
 * - Normalización de texto (insensible a acentos, mayúsculas/minúsculas)
 * - Dropdown de sugerencias (máximo 12 resultados)
 * - Resaltado de texto coincidente (<mark>)
 * - Navegación por teclado (↑ ↓ Enter Escape)
 * - Botón de limpiar búsqueda
 * - Cierre del dropdown al hacer clic fuera
 */

let productsCache = [];
let isLoaded = false;
let searchSelectedIndex = -1;
let searchCurrentFiltered = [];
// Control de visibilidad de la barra de búsqueda y botón flotante al hacer scroll
document.addEventListener("DOMContentLoaded", () => {
  let lastScrollTop = 0;
  const searchBarContainer = document.getElementById("search-bar-container");
  const floatingSearchBtn = document.getElementById("floating-search-btn");
  const searchInput = document.getElementById("global-search-input");
  const scrollThreshold = 10;
  let isHidden = false;
  let isLocked = false;

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

      // Scroll hacia abajo -> Ocultar barra y mostrar botón flotante
      if (scrollDifference > 0 && currentScroll > 60 && !isHidden) {
        isHidden = true;
        isLocked = true;
        
        searchBarContainer.classList.remove("max-h-20", "opacity-100");
        searchBarContainer.classList.add("max-h-0", "opacity-0", "pointer-events-none");

        if (floatingSearchBtn) {
          floatingSearchBtn.classList.remove("scale-0", "opacity-0", "pointer-events-none");
          floatingSearchBtn.classList.add("scale-100", "opacity-100");
        }

        setTimeout(() => { isLocked = false; }, 300);

      // Scroll hacia arriba -> Mostrar barra y ocultar botón flotante
      } else if (scrollDifference < 0 && isHidden) {
        isHidden = false;
        isLocked = true;

        searchBarContainer.classList.remove("max-h-0", "opacity-0", "pointer-events-none");
        searchBarContainer.classList.add("max-h-20", "opacity-100");

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

        // Mostrar barra de búsqueda
        searchBarContainer.classList.remove("max-h-0", "opacity-0", "pointer-events-none");
        searchBarContainer.classList.add("max-h-20", "opacity-100");

        // Ocultar botón flotante
        floatingSearchBtn.classList.remove("scale-100", "opacity-100");
        floatingSearchBtn.classList.add("scale-0", "opacity-0", "pointer-events-none");

        // Subir suavemente la página y enfocar el input
        //window.scrollTo({ top: 0, behavior: 'smooth' });
        if (searchInput){searchInput.focus()}
      });
    }
  }
});
// ─── Carga diferida no bloqueante del catálogo ───────────────────────────────
window.addEventListener('load', () => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(loadProductsData);
  } else {
    setTimeout(loadProductsData, 100);
  }
});

async function loadProductsData() {
  try {
    const res = await fetch('/assets/data/products.json');
    if (res.ok) {
      productsCache = await res.json();
      isLoaded = true;
      console.log('✅ Catálogo de productos precargado en segundo plano:', productsCache.length, 'artículos');
    }
  } catch (err) {
    console.warn('No se pudo precargar products.json:', err);
  }
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

// ─── Función pública de búsqueda ──────────────────────────────────────────────
window.searchProducts = function (query) {
  if (!isLoaded || !query || query.trim() === '') return [];
  const q = normalizeText(query.trim());

  return productsCache.filter(p => {
    const name      = normalizeText(p.name);
    const category  = normalizeText(p.category);
    const brand     = normalizeText(p.brandName || '');
    const spec      = normalizeText(p.spec || p.description || '');
    const specs     = p.specs ? normalizeText(Object.values(p.specs).join(' ')) : '';

    return name.includes(q) || category.includes(q) || brand.includes(q) || spec.includes(q) || specs.includes(q);
  });
};

// ─── Resaltado del texto coincidente ──────────────────────────────────────────
function highlightText(text, query) {
  if (!query.trim() || !text) return text;
  const normalizedQuery = normalizeText(query.trim());
  const normalizedText  = normalizeText(text);

  const startIndex = normalizedText.indexOf(normalizedQuery);
  if (startIndex === -1) return text;

  const endIndex = startIndex + query.trim().length;
  return (
    text.substring(0, startIndex) +
    `<mark style="background-color:#fef08a;color:#854d0e;font-weight:600;padding:0 2px;border-radius:2px;">${text.substring(startIndex, endIndex)}</mark>` +
    text.substring(endIndex)
  );
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
  input.addEventListener('input', (e) => {
    const query = e.target.value;

    // Mostrar/ocultar botón X
    if (clearBtn) {
      clearBtn.classList.toggle('hidden', query.length === 0);
    }

    if (!query.trim()) {
      hideSuggestions(suggestionsBox);
      return;
    }

    // Asegurar que si el usuario escribe, la barra de búsqueda permanezca abierta (por si estaba contraída por el scroll)
    if (searchBarContainer) {
      searchBarContainer.classList.remove("max-h-0", "opacity-0", "pointer-events-none");
      searchBarContainer.classList.add("max-h-20", "opacity-100");
    }

    const results = window.searchProducts(query);
    searchCurrentFiltered = results.slice(0, 12);
    searchSelectedIndex = -1;
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
      if (searchSelectedIndex >= 0 && searchSelectedIndex < searchCurrentFiltered.length) {
        navigateToProduct(searchCurrentFiltered[searchSelectedIndex], input, suggestionsBox, clearBtn);
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
      const subText = item.spec || item.description || (item.specs ? Object.values(item.specs).filter(v => v && v !== '—').join(' · ') : '');
      const highlightedName = highlightText(item.name, query);
      const highlightedSub  = subText ? highlightText(subText, query) : '';

      const el = document.createElement('div');
      el.className = 'search-suggestion-item px-4 py-2.5 cursor-pointer flex items-center justify-between gap-3 hover:bg-blue-50/70 transition-colors';
      el.dataset.index = index;

      el.innerHTML = `
        <div class="flex flex-col min-w-0">
          <span class="text-sm font-semibold text-gray-800 truncate">${highlightedName}</span>
          ${highlightedSub ? `<span class="text-xs text-gray-500 truncate mt-0.5">${highlightedSub}</span>` : ''}
        </div>
        <div class="shrink-0 flex flex-col items-end gap-1">
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 whitespace-nowrap">
            ${item.category}
          </span>
          ${item.brandName ? `<span class="text-[10px] text-gray-400">${item.brandName}</span>` : ''}
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

  // Navegar a la página de la marca del producto si tiene brand slug
  if (item.brand && typeof window.appNavigate === 'function') {
    window.appNavigate(`/marca/${item.brand}`);
  }
}

// Exportar initSearchInput para que el router lo llame al montar el layout
window.initSearchInput = initSearchInput;