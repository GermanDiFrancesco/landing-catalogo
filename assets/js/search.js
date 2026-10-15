/**
 * search.js - Carga asíncrona no bloqueante de products.json para el buscador
 */

let productsCache = [];
let isLoaded = false;

// Ejecutar tras la carga completa de la página para no bloquear el render
window.addEventListener('load', () => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(loadProductsData);
  } else {
    setTimeout(loadProductsData, 100);
  }
});

async function loadProductsData() {
  try {
    const res = await fetch('assets/data/products.json');
    if (res.ok) {
      productsCache = await res.json();
      isLoaded = true;
      console.log('✅ Catálogo de productos precargado en segundo plano:', productsCache.length, 'artículos');
    }
  } catch (err) {
    console.warn('No se pudo precargar products.json:', err);
  }
}

// Búsqueda en memoria
window.searchProducts = function(query) {
  if (!isLoaded || !query) return [];
  const q = query.toLowerCase();
  return productsCache.filter(p => 
    p.name.toLowerCase().includes(q) ||
    p.brandName.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q)
  );
};
