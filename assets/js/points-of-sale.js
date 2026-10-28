/**
 * points-of-sale.js - Gestión interactiva de Puntos de Venta y Mapa para Tecnografic
 * Mantiene la estructura original (Buscador + Tabs Mayoristas/Minoristas + Mapa con estilo claro)
 */

(function () {
  let salesLocationsCache = null;
  let mapInstance = null;
  let infoWindowInstance = null;
  let markersById = new Map();
  let activeTab = 'mayoristas'; // 'mayoristas' | 'minoristas'
  let currentSearchQuery = '';
  let activeLocationId = null;
  let googleMapsPromise = null;

  // Estilo claro/plateado original de Tecnografic para Google Maps
  const MAP_STYLES = [
    { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#a9a9a9' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
    { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#f9f9f9' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#f9f9f9' }] },
    { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
    { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
    { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#f9f9f9' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#f9f9f9' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] }
  ];

  function normalizeStr(str) {
    if (!str) return '';
    return str
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Carga los datos de puntos de venta desde el JSON estático
   */
  async function loadSalesLocations() {
    if (salesLocationsCache) return salesLocationsCache;
    const res = await fetch('/assets/data/points-of-sale.json');
    if (!res.ok) throw new Error('No se pudo cargar points-of-sale.json');
    salesLocationsCache = await res.json();
    return salesLocationsCache;
  }

  /**
   * Carga el script de Google Maps API de forma asíncrona (loading=async) si aún no está disponible
   */
  function ensureGoogleMapsLoaded() {
    if (window.google && window.google.maps && window.google.maps.Map && window.google.maps.OverlayView) {
      return Promise.resolve();
    }
    if (googleMapsPromise) {
      return googleMapsPromise;
    }

    googleMapsPromise = new Promise((resolve, reject) => {
      window.__onTecnograficGoogleMapsReady = async () => {
        try {
          if (window.google && window.google.maps && typeof window.google.maps.importLibrary === 'function') {
            await window.google.maps.importLibrary('maps');
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      const script = document.createElement('script');
      script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyAAFmSUZqHI6l6p41rSC4-W0bEwtK0aIbg&loading=async&callback=__onTecnograficGoogleMapsReady';
      script.async = true;
      script.defer = true;
      script.onerror = (err) => {
        googleMapsPromise = null;
        reject(err);
      };
      document.head.appendChild(script);
    });

    return googleMapsPromise;
  }

  /**
   * Crea un marcador personalizado basado en google.maps.OverlayView
   * Evita el uso de google.maps.Marker (deprecado) y permite conservar MAP_STYLES sin requerir mapId
   */
  function createCustomPinOverlay(loc, map, onClick) {
    const position = new google.maps.LatLng(loc.latitude, loc.longitude);
    const overlay = new google.maps.OverlayView();
    let div = null;

    overlay.onAdd = function () {
      div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.cursor = 'pointer';
      div.style.width = '22px';
      div.style.height = '29px';
      div.style.transform = 'translate(-50%, -100%)';
      div.style.userSelect = 'none';
      div.title = loc.name || 'Tecnografic';

      const img = document.createElement('img');
      img.src = '/assets/img/icons/market-pin.png';
      img.alt = loc.name || 'Tecnografic';
      img.style.width = '22px';
      img.style.height = '29px';
      img.style.display = 'block';
      img.draggable = false;
      div.appendChild(img);

      div.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof onClick === 'function') {
          onClick();
        }
      });

      const panes = this.getPanes();
      if (panes && panes.overlayMouseTarget) {
        panes.overlayMouseTarget.appendChild(div);
      }
    };

    overlay.draw = function () {
      if (!div) return;
      const projection = this.getProjection();
      if (!projection) return;
      const point = projection.fromLatLngToDivPixel(position);
      if (point) {
        div.style.left = `${point.x}px`;
        div.style.top = `${point.y}px`;
      }
    };

    overlay.onRemove = function () {
      if (div && div.parentNode) {
        div.parentNode.removeChild(div);
      }
      div = null;
    };

    overlay.getPosition = function () {
      return position;
    };

    overlay.setMap(map);
    return overlay;
  }

  /**
   * Construye el HTML de la ventana emergente (InfoWindow) en el mapa
   */
  function buildInfoWindowHtml(loc) {
    const tel = (loc.telephone_number || '').trim();
    const ig = (loc.instagram_url || '').trim();
    const fb = (loc.facebook_url || '').trim();

    return `
      <div class="p-1 max-w-[280px] text-gray-800 font-sans">
        <div class="font-bold text-sm text-gray-900 mb-1.5">${loc.name || ''}</div>
        <p class="text-xs text-gray-700 mb-1 flex items-start gap-1.5">
          <i class="fa-solid fa-location-dot text-[#173d56] mt-0.5 shrink-0"></i>
          <span>${loc.address || ''}</span>
        </p>
        ${tel ? `
          <p class="text-xs text-gray-700 mb-1 flex items-center gap-1.5">
            <i class="fa-solid fa-phone text-[#173d56] shrink-0"></i>
            <span>Tel: ${tel}</span>
          </p>
        ` : ''}
        ${ig ? `
          <p class="text-xs text-gray-600 mb-1 flex items-center gap-1.5">
            <i class="fa-brands fa-instagram text-[#173d56] shrink-0"></i>
            <span class="truncate">${ig}</span>
          </p>
        ` : ''}
        ${fb ? `
          <p class="text-xs text-gray-600 mb-1.5 flex items-center gap-1.5">
            <i class="fa-brands fa-facebook-f text-[#173d56] shrink-0"></i>
            <span class="truncate">${fb}</span>
          </p>
        ` : ''}
        <div class="pt-1.5 mt-1 border-t border-gray-200">
          <a
            href="https://maps.google.com/maps?q=${loc.latitude},${loc.longitude}"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 text-xs font-bold text-[#0062cc] hover:underline"
          >
            <span>Cómo llegar</span>
            <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
          </a>
        </div>
      </div>
    `;
  }

  /**
   * Inicializa el mapa de Google y crea los marcadores de todas las sucursales
   */
  function initGoogleMap(locations) {
    const mapContainer = document.getElementById('map');
    if (!mapContainer || !window.google || !window.google.maps) return;

    const initialCenter = new google.maps.LatLng(-34.6406642, -58.4102976);
    mapInstance = new google.maps.Map(mapContainer, {
      zoom: 12,
      center: initialCenter,
      styles: MAP_STYLES,
      mapTypeControl: false,
      streetViewControl: false
    });

    infoWindowInstance = new google.maps.InfoWindow({
      pixelOffset: new google.maps.Size(0, -29)
    });
    markersById.clear();

    locations.forEach((loc) => {
      if (typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') return;

      const openLocInfo = () => {
        infoWindowInstance.setContent(buildInfoWindowHtml(loc));
        infoWindowInstance.setPosition(new google.maps.LatLng(loc.latitude, loc.longitude));
        infoWindowInstance.open(mapInstance);
      };

      const marker = createCustomPinOverlay(loc, mapInstance, openLocInfo);

      markersById.set(loc.id, { marker, loc });
    });
  }

  /**
   * Centra el mapa en un punto de venta y abre su InfoWindow (equivalente a cargarMapa)
   */
  function focusLocationOnMap(loc) {
    if (!mapInstance || !window.google || !window.google.maps) return;

    const latLng = new google.maps.LatLng(loc.latitude, loc.longitude);
    mapInstance.panTo(latLng);
    mapInstance.setZoom(15);

    const entry = markersById.get(loc.id);
    if (entry && infoWindowInstance) {
      infoWindowInstance.setContent(buildInfoWindowHtml(loc));
      infoWindowInstance.setPosition(latLng);
      infoWindowInstance.open(mapInstance);
    }

    // En pantallas móviles, hacer scroll suave hacia el mapa para que el usuario vea el pin
    if (window.innerWidth < 1024) {
      const mapEl = document.getElementById('map');
      if (mapEl) {
        mapEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }

  /**
   * Filtra los comercios según el texto buscado y la pestaña activa
   */
  function renderPointsList(locations) {
    const listContainer = document.getElementById('pos-list-container');
    const countMayoristas = document.getElementById('count-mayoristas');
    const countMinoristas = document.getElementById('count-minoristas');
    if (!listContainer) return;

    const terms = normalizeStr(currentSearchQuery.trim()).split(/\s+/).filter(Boolean);

    const matchesQuery = (loc) => {
      if (terms.length === 0) return true;
      const haystack = normalizeStr(
        `${loc.name || ''} ${loc.address || ''} ${loc.instagram_url || ''} ${loc.facebook_url || ''}`
      );
      return terms.every(t => haystack.includes(t));
    };

    const mayoristasList = locations.filter(l => l.wholesaler === 1 && matchesQuery(l));
    const minoristasList = locations.filter(l => l.retail === 1 && matchesQuery(l));

    if (countMayoristas) countMayoristas.textContent = `(${mayoristasList.length})`;
    if (countMinoristas) countMinoristas.textContent = `(${minoristasList.length})`;

    const currentList = activeTab === 'mayoristas' ? mayoristasList : minoristasList;

    listContainer.innerHTML = '';

    if (currentList.length === 0) {
      listContainer.innerHTML = `
        <div class="py-12 px-6 text-center text-gray-400">
          <i class="fa-solid fa-location-dot text-2xl mb-2 block text-gray-300"></i>
          <p class="text-sm font-medium text-gray-600">No se encontraron puntos de venta</p>
          <p class="text-xs text-gray-400 mt-1">Probá buscando otra localidad, provincia o comercio.</p>
        </div>
      `;
      return;
    }

    const fragment = document.createDocumentFragment();

    currentList.forEach((loc) => {
      const tel = (loc.telephone_number || '').trim();
      const ig = (loc.instagram_url || '').trim();
      const fb = (loc.facebook_url || '').trim();
      const isSelected = activeLocationId === loc.id;

      const row = document.createElement('div');
      row.className = `px-6 py-4 cursor-pointer transition-colors hover:bg-blue-50/60 ${
        isSelected ? 'bg-blue-50/80 border-l-4 border-[#173d56]' : ''
      }`;

      row.innerHTML = `
        <ul class="space-y-1 text-sm">
          <li class="font-bold text-gray-900 text-[15px] leading-snug">${loc.name || ''}</li>
          <li class="flex items-start gap-2 text-gray-800">
            <i class="fa-solid fa-location-dot text-[#173d56] mt-1 w-3.5 text-center shrink-0 text-xs"></i>
            <span class="font-medium text-xs sm:text-sm">${loc.address || ''}</span>
          </li>
          ${tel ? `
            <li class="flex items-center gap-2 text-gray-700">
              <i class="fa-solid fa-phone text-[#173d56] w-3.5 text-center shrink-0 text-xs"></i>
              <span class="font-medium text-xs sm:text-sm">${tel}</span>
            </li>
          ` : ''}
          ${(ig || fb) ? `
            <li class="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-xs text-gray-600">
              ${ig ? `
                <span class="inline-flex items-center gap-1.5">
                  <i class="fa-brands fa-instagram text-[#173d56]"></i>
                  <span>${ig}</span>
                </span>
              ` : ''}
              ${fb ? `
                <span class="inline-flex items-center gap-1.5">
                  <i class="fa-brands fa-facebook-f text-[#173d56]"></i>
                  <span>${fb}</span>
                </span>
              ` : ''}
            </li>
          ` : ''}
        </ul>
      `;

      row.addEventListener('click', () => {
        activeLocationId = loc.id;
        renderPointsList(locations);
        focusLocationOnMap(loc);
      });

      fragment.appendChild(row);
    });

    listContainer.appendChild(fragment);
  }

  /**
   * Actualiza el estado visual de las pestañas Mayoristas / Minoristas
   */
  function updateTabStyles() {
    const btnMay = document.getElementById('tab-btn-mayoristas');
    const btnMin = document.getElementById('tab-btn-minoristas');
    if (!btnMay || !btnMin) return;

    if (activeTab === 'mayoristas') {
      btnMay.className = 'w-full py-1.5 px-3 text-sm font-bold tracking-wide transition-colors text-[#173d56]';
      btnMay.setAttribute('aria-selected', 'true');
      btnMin.className = 'w-full py-1.5 px-3 text-sm font-medium tracking-wide transition-colors text-gray-400 hover:text-gray-600';
      btnMin.setAttribute('aria-selected', 'false');
    } else {
      btnMin.className = 'w-full py-1.5 px-3 text-sm font-bold tracking-wide transition-colors text-[#173d56]';
      btnMin.setAttribute('aria-selected', 'true');
      btnMay.className = 'w-full py-1.5 px-3 text-sm font-medium tracking-wide transition-colors text-gray-400 hover:text-gray-600';
      btnMay.setAttribute('aria-selected', 'false');
    }
  }

  /**
   * Inicializa la vista de Puntos de Venta cuando el router la monta
   */
  async function initPointsOfSalePage() {
    const listContainer = document.getElementById('pos-list-container');
    if (!listContainer) return;

    activeTab = 'mayoristas';
    currentSearchQuery = '';
    activeLocationId = null;

    const searchForm = document.getElementById('pos-search-form');
    const searchInput = document.getElementById('pos-search-input');
    const clearBtn = document.getElementById('pos-search-clear');
    const btnMay = document.getElementById('tab-btn-mayoristas');
    const btnMin = document.getElementById('tab-btn-minoristas');

    try {
      const locations = await loadSalesLocations();

      // Renderizar lista de inmediato sin esperar a que termine de cargar el mapa externo
      updateTabStyles();
      renderPointsList(locations);

      // Eventos de pestañas
      btnMay?.addEventListener('click', () => {
        if (activeTab !== 'mayoristas') {
          activeTab = 'mayoristas';
          updateTabStyles();
          renderPointsList(locations);
          listContainer.scrollTop = 0;
        }
      });

      btnMin?.addEventListener('click', () => {
        if (activeTab !== 'minoristas') {
          activeTab = 'minoristas';
          updateTabStyles();
          renderPointsList(locations);
          listContainer.scrollTop = 0;
        }
      });

      // Eventos de búsqueda
      const handleSearchUpdate = () => {
        currentSearchQuery = searchInput ? searchInput.value : '';
        if (clearBtn) {
          clearBtn.classList.toggle('hidden', currentSearchQuery.length === 0);
        }
        renderPointsList(locations);
        listContainer.scrollTop = 0;
      };

      searchInput?.addEventListener('input', handleSearchUpdate);
      searchForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSearchUpdate();
      });

      clearBtn?.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        handleSearchUpdate();
        searchInput?.focus();
      });

      // Inicializar el mapa de Google
      await ensureGoogleMapsLoaded();
      initGoogleMap(locations);

    } catch (err) {
      console.error('Error al inicializar Puntos de Venta:', err);
    }
  }

  window.initPointsOfSalePage = initPointsOfSalePage;
})();
