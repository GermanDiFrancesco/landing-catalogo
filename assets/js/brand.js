/**
 * brand.js - Manejo dinámico de la plantilla marca.html?b=[marca]
 */

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const brandKey = urlParams.get('b') || 'triunfante';

  try {
    const res = await fetch('assets/data/brands.json');
    const brandsData = await res.json();
    const brand = brandsData[brandKey] || brandsData['triunfante'];

    renderBrandPage(brand);
  } catch (error) {
    console.error('Error al cargar datos de marca:', error);
  }
});

function renderBrandPage(brand) {
  // 1. Título de la página
  document.title = `${brand.name} - Catálogo Tecnografic`;

  // 2. Hero Action
  const heroContainer = document.getElementById('brand-hero-section');
  if (heroContainer) {
    heroContainer.style.backgroundColor = brand.color;
  }

  const brandLogo = document.getElementById('brand-hero-logo');
  if (brandLogo) {
    brandLogo.src = brand.logo;
    brandLogo.alt = brand.name;
  }

  const brandSlogan = document.getElementById('brand-hero-slogan');
  if (brandSlogan) {
    brandSlogan.textContent = brand.slogan;
  }

  const brandDesc = document.getElementById('brand-hero-desc');
  if (brandDesc) {
    brandDesc.textContent = brand.description;
  }

  // 3. Sidebar con categorías
  const sidebar = document.getElementById('brand-sidebar-container');
  if (sidebar) {
    sidebar.style.backgroundColor = brand.color;
  }

  const categoriesList = document.getElementById('brand-categories-list');
  if (categoriesList) {
    categoriesList.innerHTML = '';
    brand.categories.forEach((cat, index) => {
      const li = document.createElement('li');
      const isFirst = index === 0;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `w-full text-left py-3 px-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-between transition-all duration-200 brand-cat-btn ${
        isFirst 
          ? 'bg-white shadow-md pl-5' 
          : 'text-white hover:bg-white/15'
      }`;
      if (isFirst) {
        btn.style.color = brand.color;
      }

      btn.innerHTML = `
        <span>${cat}</span>
        <span class="text-xs">&gt;</span>
      `;

      btn.addEventListener('click', () => {
        document.querySelectorAll('.brand-cat-btn').forEach(b => {
          b.className = 'w-full text-left py-3 px-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-between transition-all duration-200 brand-cat-btn text-white hover:bg-white/15';
          b.style.color = '#ffffff';
        });
        btn.className = 'w-full text-left py-3 px-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-between transition-all duration-200 brand-cat-btn bg-white shadow-md pl-5';
        btn.style.color = brand.color;

        const mainCatTitle = document.getElementById('selected-category-title');
        if (mainCatTitle) mainCatTitle.textContent = cat;
      });

      li.appendChild(btn);
      categoriesList.appendChild(li);
    });
  }

  // 4. Categoría inicial y producto de muestra
  const mainCatTitle = document.getElementById('selected-category-title');
  if (mainCatTitle && brand.categories.length > 0) {
    mainCatTitle.textContent = brand.categories[0];
    mainCatTitle.style.color = brand.color;
  }

  if (brand.sampleProduct) {
    const prodTitle = document.getElementById('sample-product-title');
    if (prodTitle) {
      prodTitle.textContent = brand.sampleProduct.title;
      prodTitle.style.color = brand.color;
    }

    // Galería
    const gallery = document.getElementById('sample-product-gallery');
    if (gallery && brand.sampleProduct.images) {
      gallery.innerHTML = '';
      brand.sampleProduct.images.forEach(imgUrl => {
        const div = document.createElement('div');
        div.className = 'bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center h-48';
        div.innerHTML = `<img src="${imgUrl}" alt="${brand.sampleProduct.title}" class="max-h-full max-w-full object-contain">`;
        gallery.appendChild(div);
      });
    }

    // Paleta de colores
    const colorsContainer = document.getElementById('sample-product-colors');
    if (colorsContainer && brand.sampleProduct.colors) {
      colorsContainer.innerHTML = '';
      brand.sampleProduct.colors.forEach(hex => {
        const dot = document.createElement('span');
        dot.className = 'w-5 h-5 rounded-full border border-white shadow-sm inline-block';
        dot.style.backgroundColor = hex;
        colorsContainer.appendChild(dot);
      });
    }

    // Botón Ver Más
    const btnVerMas = document.getElementById('btn-ver-mas');
    if (btnVerMas) {
      btnVerMas.style.backgroundColor = brand.color;
    }

    // Tabla de especificaciones
    const specsHead = document.getElementById('specs-header');
    if (specsHead) {
      specsHead.style.backgroundColor = brand.color;
    }

    const specs = brand.sampleProduct.specs;
    if (specs) {
      document.getElementById('spec-tamano').textContent = specs.tamano || '—';
      document.getElementById('spec-color').textContent = specs.color || '—';
      document.getElementById('spec-hojas').textContent = specs.hojas || '—';
      document.getElementById('spec-estilo').textContent = specs.estilo || '—';
      document.getElementById('spec-caja').textContent = specs.caja || '—';
      document.getElementById('spec-paquete').textContent = specs.paquete || '—';
    }
  }
}
