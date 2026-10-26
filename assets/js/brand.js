/**
 * brand.js - Manejo dinámico universal y modular de la sección de Marca
 * Compatible con URLs limpias (/marca/triunfante) y query params (?b=triunfante).
 * Separa el main content en:
 * 1. Grilla interactiva de los productos de la familia/categoría.
 * 2. Vista desacoplada de detalle del producto con variantes (tamaño, hojas, tipo, manos, colores) y ficha técnica.
 */

async function initBrandPage(brandSlug) {
  // Determinar marca activa (argumento > pathname > query param > fallback)
  let brandKey = brandSlug;
  if (!brandKey) {
    const match = window.location.pathname.match(/^\/marca\/([^\/?#]+)/);
    if (match && match[1]) {
      brandKey = match[1];
    } else {
      const urlParams = new URLSearchParams(window.location.search);
      brandKey = urlParams.get('b') || 'triunfante';
    }
  }

  try {
    const res = await fetch('/assets/data/brands.json');
    const brandsData = await res.json();
    const brand = brandsData[brandKey] || brandsData['triunfante'];

    // Cargar el JSON de productos detallados de la marca
    let brandProductsData = null;
    try {
      const prodRes = await fetch(`/assets/data/products/${brandKey}.json`);
      if (prodRes.ok) {
        brandProductsData = await prodRes.json();
      }
    } catch (e) {
      console.warn(`No se pudo cargar JSON para ${brandKey}:`, e);
    }

    renderBrandPage(brand, brandProductsData);
  } catch (error) {
    console.error('Error al inicializar la página de marca:', error);
  }
}

function formatImgUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
    return url;
  }
  return `/${url}`;
}

function renderBrandPage(brand, brandProductsData) {
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

  // Color del encabezado de la ficha técnica
  const specsHead = document.getElementById('specs-header');
  if (specsHead) {
    specsHead.style.backgroundColor = brand.color;
  }

  // 3. Renderizar Catálogo Estructurado o Fallback
  const categories = (brandProductsData && brandProductsData.categories) ? brandProductsData.categories : null;

  if (categories && categories.length > 0) {
    renderStructuredCatalog(brand, categories);
  } else {
    renderLegacyCatalog(brand);
  }
}

/**
 * Renderiza el catálogo estructurado con Sidebar, Grilla de Familia y Detalle de Variantes
 */
function renderStructuredCatalog(brand, categories) {
  const sidebar = document.getElementById('brand-sidebar-container');
  if (sidebar) {
    sidebar.style.backgroundColor = brand.color;
  }

  const categoriesList = document.getElementById('brand-categories-list');
  if (!categoriesList) return;

  categoriesList.innerHTML = '';

  let currentCategoryIndex = 0;
  let currentProductIndex = 0;

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

  // Mostrar la grilla de productos de la primera categoría
  showCategoryGrid(categories[0]);

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
      const tamanosStr = (attributes.tamanos || []).slice(0, 3).join(', ');
      const hojasStr = (attributes.hojas || []).slice(0, 3).map(h => `${h}h`).join(' · ');

      // Colores de muestra para la tarjeta
      const sampleColors = (prod.variants || [])
        .filter(v => v.colorHex)
        .slice(0, 5)
        .map(v => `<span class="w-3.5 h-3.5 rounded-full border border-gray-200 shadow-xs inline-block" style="background-color: ${v.colorHex};"></span>`)
        .join('');

     card.innerHTML = `
          <!-- Contenedor imagen -->
          <div class="w-full bg-gray-50/70 flex items-center justify-center h-48 mb-4 overflow-hidden relative">
            <img src="${thumbImg}" alt="${prod.name}" style=""class="max-h-full object-contain scale-125 transition-transform duration-300 group-hover:scale-105">
          </div>
          <!-- Título del producto -->
          <h3 class="px-3 py-1.5 text-xs font-bold rounded-lg text-white shadow-sm transition-all transform scale-105 text-center" style="background-color: ${brand.color};">
            ${prod.name}
          </h3>
      `;
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
      mainImg.src = fallbackImage;
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

    let selectedState = {
      tamano: variants[0].tamano || null,
      hojas: variants[0].hojas !== undefined ? variants[0].hojas : null,
      tipo_hoja: variants[0].tipo_hoja || null,
      manos: variants[0].manos !== undefined ? variants[0].manos : null,
      colorHex: variants[0].colorHex || null,
      colorName: variants[0].colorName || null
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
          ensureValidSelection();
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
          ensureValidSelection();
          renderInteractiveSelectors();
        },
        (val) => variants.some(v => {
          const matchTam = !selectedState.tamano || v.tamano === selectedState.tamano;
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
          ensureValidSelection();
          renderInteractiveSelectors();
        },
        (val) => variants.some(v => {
          const matchTam = !selectedState.tamano || v.tamano === selectedState.tamano;
          const matchHojas = selectedState.hojas === null || String(v.hojas) === String(selectedState.hojas);
          return matchTam && matchHojas && v.tipo_hoja === val;
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
          ensureValidSelection();
          renderInteractiveSelectors();
        },
        (val) => variants.some(v => {
          const matchTam = !selectedState.tamano || v.tamano === selectedState.tamano;
          return matchTam && (String(v.manos) === String(val));
        })
      );

      // 5. Colores Disponibles
      renderColorOptions();

      // 6. Actualizar Ficha Técnica
      const currentActiveVariant = findActiveVariant();
      updateSpecsTable(currentActiveVariant);
    }

    function ensureValidSelection() {
      let match = findActiveVariant();
      if (!match) {
        const compatible = variants.filter(v => {
          if (selectedState.tamano && v.tamano && v.tamano !== selectedState.tamano) return false;
          return true;
        });

        const fallback = compatible[0] || variants[0];
        if (fallback) {
          if (fallback.tamano !== undefined) selectedState.tamano = fallback.tamano;
          if (fallback.hojas !== undefined) selectedState.hojas = fallback.hojas;
          if (fallback.tipo_hoja !== undefined) selectedState.tipo_hoja = fallback.tipo_hoja;
          if (fallback.manos !== undefined) selectedState.manos = fallback.manos;
          if (fallback.colorHex !== undefined) selectedState.colorHex = fallback.colorHex;
          if (fallback.colorName !== undefined) selectedState.colorName = fallback.colorName;
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

      container.innerHTML = '';
      optionsArray.forEach(opt => {
        const isSelected = String(opt) === String(currentValue);
        const isAvailable = isAvailableFn ? isAvailableFn(opt) : true;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = (typeof opt === 'number' && containerId === 'options-hojas') 
          ? `${opt} Hojas` 
          : (containerId === 'options-manos' ? `${opt} Manos` : opt);

        if (!isAvailable) {
          btn.disabled = true;
          btn.className = 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-300 border border-gray-200 cursor-not-allowed line-through opacity-60';
        } else if (isSelected) {
          btn.className = 'px-3 py-1.5 text-xs font-bold rounded-lg text-white shadow-sm transition-all transform scale-105';
          btn.style.backgroundColor = brand.color;
        } else {
          btn.className = 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-white text-gray-700 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors';
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
        if (selectedState.hojas !== null && v.hojas !== undefined && String(v.hojas) !== String(selectedState.hojas)) return false;
        if (selectedState.tipo_hoja && v.tipo_hoja && v.tipo_hoja !== selectedState.tipo_hoja) return false;
        if (selectedState.manos !== null && v.manos !== undefined && String(v.manos) !== String(selectedState.manos)) return false;
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
        dot.className = `w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center relative shadow-sm ${
          isSelected ? 'ring-2 ring-offset-2 scale-110' : 'hover:scale-110 border-white opacity-85 hover:opacity-100'
        }`;
        dot.style.backgroundColor = variant.colorHex;
        dot.style.borderColor = isSelected ? brand.color : '#ffffff';
        dot.setAttribute('title', variant.colorName || variant.sku);

        // Hover: Swap de imagen en el visor
        dot.addEventListener('mouseenter', () => {
          if (mainImg && variant.image) {
            mainImg.src = formatImgUrl(variant.image);
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
            mainImg.src = formatImgUrl(currentVariant.image || fallbackImage);
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
          if (variant.image && mainImg) {
            mainImg.src = formatImgUrl(variant.image);
          }
          renderColorOptions();
          updateSpecsTable(variant);
        });

        colorsContainer.appendChild(dot);
      });
    }

    function updateSpecsTable(activeVariant) {
      const specTamano = document.getElementById('spec-tamano');
      const specColor = document.getElementById('spec-color');
      const specCaja = document.getElementById('spec-caja');
      const specPaquete = document.getElementById('spec-paquete');
      const specPalet = document.getElementById('spec-palet');
      const specGramaje = document.getElementById('spec-gramaje');

      if (!activeVariant) {
        if (specTamano) specTamano.textContent = '—';
        if (specColor) specColor.textContent = '—';
        if (specCaja) specCaja.textContent = '—';
        if (specPaquete) specPaquete.textContent = '—';
        if (specPalet) specPalet.textContent = '—';
        if (specGramaje) specGramaje.textContent = '—';
        return;
      }

      if (specTamano) specTamano.textContent = activeVariant.tamano || '—';
      const colorDesc = activeVariant.colorName || activeVariant.tipo_hoja || (activeVariant.hojas ? `${activeVariant.hojas} Hojas` : '—');
      if (specColor) specColor.textContent = colorDesc;

      const sp = activeVariant.specs || {};
      if (specCaja) specCaja.textContent = sp.caja || '—';
      if (specPaquete) specPaquete.textContent = sp.paquete || '—';
      if (specPalet) specPalet.textContent = sp.palet || '—';
      if (specGramaje) specGramaje.textContent = sp.gramaje || '—';

      if (mainImg && activeVariant.image) {
        mainImg.src = activeVariant.image;
      }
      if (variantBadge && activeVariant.sku) {
        variantBadge.textContent = activeVariant.colorName || activeVariant.tipo_hoja || 'Modelo';
      }
    }

    function hideAllAttributeWrappers() {
      ['selector-tamano-wrapper', 'selector-hojas-wrapper', 'selector-tipo-hoja-wrapper', 'selector-manos-wrapper', 'selector-colores-wrapper'].forEach(id => {
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
