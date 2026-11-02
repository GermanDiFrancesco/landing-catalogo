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
  'triunfante': '#0059e5',
  'tintoretto': '#009fe3',
  'potosi': '#9fba30',
  'mis-hojas': '#7477b9'
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
// ─── Función pública de búsqueda con prioridades de coincidencia ─────────────
// Prioridades:
// 1. Coincide con el inicio de alguna palabra en el título/nombre (prefijo de palabra).
// 2. Coincide con el inicio de alguna palabra en la descripción (prefijo de palabra).
// 3. Coincide en cualquier parte del título/nombre (subcadena interna).
// 4. Coincide en cualquier parte de la descripción (subcadena interna).
// 5. Coincide en otros campos (marca, categoría, especificaciones, etc.).
window.searchProducts = function (query) {
  if (!isLoaded || !query || query.trim() === '') return [];
  const q = normalizeText(query.trim());
  const terms = q.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  // Función auxiliar para determinar si un texto contiene un término al inicio de una palabra
  const startsWord = (textNorm, term) => {
    if (!textNorm || !term) return false;
    // Coincide al inicio del texto o tras un espacio o signo de puntuación
    const words = textNorm.split(/[\s,./\-#()_]+/);
    return words.some(w => w.startsWith(term));
  };

  const scoredProducts = [];

  for (const p of productsCache) {
    const nameNorm = normalizeText(p.name || '');
    const descNorm = normalizeText(p.description || '');

    const otherSearchable = [
      p.brandName,
      p.brand,
      p.category,
      p.subcategory,
      p.spec,
      p.colorNames ? p.colorNames.join(' ') : '',
      p.specs ? Object.values(p.specs).join(' ') : ''
    ]
      .filter(Boolean)
      .map(normalizeText)
      .join(' ');

    const fullSearchable = `${nameNorm} ${descNorm} ${otherSearchable}`;

    // Todos los términos de búsqueda deben estar presentes en algún campo
    const matchesAllTerms = terms.every(t => fullSearchable.includes(t));
    if (!matchesAllTerms) continue;

    // Calcular nivel de prioridad (1 es mayor prioridad)
    let priority = 5;

    // ¿Todos los términos inician alguna palabra en el título? (o al menos el primer término)
    const nameWordsStart = terms.every(t => startsWord(nameNorm, t));
    const descWordsStart = terms.every(t => startsWord(descNorm, t));
    const nameContains   = terms.every(t => nameNorm.includes(t));
    const descContains   = terms.every(t => descNorm.includes(t));

    if (nameWordsStart) {
      priority = 1; // 1: Coincide desde el inicio de palabra en el título
    } else if (descWordsStart) {
      priority = 2; // 2: Coincide desde el inicio de palabra en la descripción
    } else if (nameContains) {
      priority = 3; // 3: Coincide dentro del título (aunque no empiece desde el principio de palabra)
    } else if (descContains) {
      priority = 4; // 4: Coincide dentro de la descripción
    } else {
      priority = 5; // 5: Coincide en otros atributos
    }

    // Índice de posición en el nombre para desempatar (más al principio = mejor)
    const nameIndex = nameNorm.indexOf(terms[0]);
    const posScore = nameIndex === -1 ? 999 : nameIndex;

    scoredProducts.push({
      product: p,
      priority,
      posScore,
      nameLength: nameNorm.length
    });
  }

  // Ordenar por prioridad (ascendente), luego por posición y longitud de nombre
  scoredProducts.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    if (a.posScore !== b.posScore) {
      return a.posScore - b.posScore;
    }
    return a.nameLength - b.nameLength;
  });

  return scoredProducts.map(sp => sp.product);
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
    searchCurrentFiltered = results.slice(0, 20);
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

      const el = document.createElement('div');
      el.className = 'search-suggestion-item px-3.5 py-1 cursor-pointer flex items-center gap-3.5 hover:bg-blue-50/70 transition-colors';
      el.dataset.index = index;

      el.innerHTML = `
        <div class="w-14 h-14 rounded-xl bg-gray-50 border border-gray-200/80 p-1.5 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
          <img src="${thumbUrl}" alt="${item.name}" loading="lazy" decoding="async" class="max-h-full max-w-full object-contain" onerror="this.src='/assets/img/marcas-logos/Tecnografic logo.png'">
        </div>
        <div class="flex flex-col justify-center min-w-0 flex-1">
          <span class="text-sm font-semibold text-gray-800 leading-snug line-clamp-2">${highlightedName}</span>
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
