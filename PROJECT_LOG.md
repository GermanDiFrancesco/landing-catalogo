# Bitácora de Proyecto (Project Log) - Tecnografic

Registro cronológico de tareas, decisiones técnicas, modificaciones y avances del desarrollo del sitio web estático.

---

## [2026-10-15] - Fase 0: Definición y Planificación
- **Decisión de Arquitectura:** Se define el descarte de frameworks compilados (Astro) y la adopción de una arquitectura estática clásica basada en **HTML5 + Tailwind CSS + Vanilla JS**.
- **Gestión de Datos:** Los productos y puntos de venta se gestionan a través de archivos JSON estructurados (`products.json`, `brands.json`, `points_of_sale.json`), cargados de forma asíncrona no bloqueante tras el render inicial.
- **Documento de Diseño:** Se elaboró el archivo de especificaciones de diseño y navegación [`DESIGN_DOCUMENT.md`](file:///C:/Users/germa/.gemini/antigravity/brain/25e0b39a-3c34-4f46-9944-6dbe84c4681a/DESIGN_DOCUMENT.md).
- **Estructura de Navegación Aprobada:**
  - Nosotros
  - Triunfante
  - Tintoretto
  - Potosí
  - Mis hojas
  - Puntos de venta
  - Catálogos (Sección de descargas)
  - Contacto (Formulario, Newsletter y WhatsApp)
  - Buscador visual integrado en el Navbar

---

## [2026-10-15] - Fase 1: Creación de Estructura Base y Archivos de Navegación
- [x] Creación del Documento de Diseño: `DESIGN_DOCUMENT.md`.
- [x] Creación de carpetas de organización: `assets/css`, `assets/js`, `assets/data`, `assets/img`.
- [x] Creación de bases estructuradas de datos:
  - `assets/data/brands.json`: Colores, logos, eslóganes, categorías y producto de muestra para Triunfante, Tintoretto, Potosí y Mis Hojas.
  - `assets/data/products.json`: Base de datos de productos para la búsqueda rápida en memoria.
- [x] Lógica de cliente en Vanilla JS:
  - `assets/js/main.js`: Menú hamburguesa responsivo, autoplay y control del carrusel, soporte para input de búsqueda.
  - `assets/js/search.js`: Carga en diferido (`load` / `requestIdleCallback`) del JSON de productos sin bloquear el render inicial.
  - `assets/js/brand.js`: Renderizado dinámico de `marca.html?b=[slug]`, gestión de categorías en la barra lateral y ficha técnica.
- [x] Maquetación de Vistas HTML (Tailwind CSS + HTML5 semántico):
  - `index.html`: Header con logo y buscador, carrusel hero, divisor multicolor, grilla 2x2 de marcas, espaciador y footer.
  - `marca.html`: Plantilla universal con Hero Action de marca, sidebar de categorías y contenedor principal de producto con tabla de especificaciones.
  - `nosotros.html`: Página About Us institucional de Tecnografic.
  - `puntos-de-venta.html`: Estructura para mapa interactivo de Google Maps API y listado.
  - `catalogos.html`: Sección de descargas de catálogos en PDF.
  - `contacto.html`: Formulario de consultas, bloque newsletter y botón con enlace directo a WhatsApp.

---

## [2026-10-15] - Fase 1.1: Ajustes de Layout, Logos Locales y Buscador
- [x] **Buscador debajo del Navbar:** Se movió la barra de búsqueda fuera de la barra principal a un contenedor propio ubicado inmediatamente debajo del Navbar en todas las vistas (`index.html`, `marca.html`, `nosotros.html`, `puntos-de-venta.html`, `catalogos.html`, `contacto.html`).
- [x] **Logos de marcas locales:** Se sustituyeron las URLs remotas por los archivos locales en `assets/img/` (`triunfante-logo.png`, `tintoretto-logo.png`, `potosi-logo.png`, `mishojas-logo.png`), tanto en `index.html` (grilla 2x2) como en `assets/data/brands.json` para la vista de marcas.
- [x] **Sidebar de Productos en marca.html:**
  - Se eliminó la barra de título con el `h3`.
  - Se unió visualmente el sidebar al header hero (eliminando el padding superior de la sección que lo separaba).
  - El padding de la sección del catálogo ahora se aplica exclusivamente en el contenedor principal (`main content`).

---

## [2026-10-16] - Fase 1.2: Refactor de Header Desktop/Mobile, Logos de Marcas y Estilos de Home
- [x] **Título unificado:** Se fijó el `<title>` como `'Tecnografic'` en todas las vistas (`index.html`, `marca.html`, `nosotros.html`, `puntos-de-venta.html`, `catalogos.html`, `contacto.html`) y en la lógica dinámica de `assets/js/brand.js`.
- [x] **Header con buscador integrado en Desktop:**
  - Logo Tecnografic a la izquierda (`assets/img/marcas-logos/Tecnografic logo.png`).
  - Contenedor derecho con la barra de enlaces (`<nav>`) arriba y el buscador alineado a la derecha debajo, visible únicamente en pantallas grandes (`lg:flex`).
  - El buscador inferior fuera del navbar se reservó y configuró solo para móviles (`lg:hidden`).
- [x] **Carrusel Hero:** Se integró `assets/img/carousel-1.png` como primera diapositiva del carrusel de inicio.
- [x] **Divisor Home:** Se reemplazó el gradiente CSS por la imagen oficial `assets/img/colours-div.png`.
- [x] **Logos de marcas actualizados (`assets/img/marcas-logos/`):**
  - Triunfante en Home: `Triunfante azul logo.png` (sobre fondo blanco).
  - Triunfante en Marca: `Triunfante blanco logo.png` (sobre fondo azul corporativo).
  - Tintoretto: `Tintoretto logo.png`.
  - Potosí: `Potosi logo.png`.
  - Mis Hojas: `Mis hojas logo.png`.
- [x] **Grilla 2x2 de Marcas:**
  - Se removieron los bordes redondeados (`rounded-none`).
  - Se suavizó el hover (sombra sutil `shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md` y ligera opacidad en el logo `group-hover:opacity-90`, sin desplazamientos bruscos).

---

## [2026-10-20] - Fase 1.3: Restauración del Buscador debajo del Navbar en Web y Mobile
- [x] **Restauración del Navbar en una sola fila (Desktop):**
  - Se retiró el contenedor anidado vertical del header en desktop.
  - El logo y los enlaces de navegación vuelven a coexistir en una única fila horizontal limpia y espaciosa (`hidden lg:flex items-center space-x-1 xl:space-x-2`).
- [x] **Buscador debajo del Navbar visible en todos los tamaños:**
  - Se removió la clase `lg:hidden` de la franja de búsqueda inferior (`border-t border-gray-100 bg-[#f8fafc] py-2 px-4 sm:px-6 lg:px-8`).
  - Ahora el buscador `#global-search-input` se ubica debajo del Navbar tanto en versión web/desktop como en móvil, alineado a la derecha.
  - Aplicado de manera uniforme en: `index.html`, `marca.html`, `nosotros.html`, `puntos-de-venta.html`, `catalogos.html` y `contacto.html`.
- [x] **Limpieza en scripts:**
  - Se simplificó `initSearchInput()` en `assets/js/main.js` para enlazar directamente el evento del buscador `#global-search-input`.

---

## [2026-10-21] - Fase 2: Implementación del Árbol de Navegación y Display de Productos (Triunfante)
- [x] **Estructuración del Catálogo por Marcas:**
  - Creación del directorio [`assets/data/products/`](file:///c:/2026/tecnografic/assets/data/products) para independizar el árbol y variantes por marca.
  - Generación de [`assets/data/products/triunfante.json`](file:///c:/2026/tecnografic/assets/data/products/triunfante.json) con las 9 categorías oficiales del PDF (Cuadernos Escolares, Repuestos, Mapas, Blocks, Resmitas, Cuaderno Con Espiral, Cuadernos Especiales, Línea De Dibujo, Cuaderno Con Indice).
  - Agrupación por **familias de productos** con atributos globales (`tamanos`, `hojas`, `tipos_hoja`) y lista exhaustiva de **variantes SKU** (colorHex, colorName, imagen individual y ficha técnica).
- [x] **Display Interactivo en `marca.html`:**
  - Rediseño del card de producto: Columna izquierda con vista de familia / producto individual y miniaturas de galería; Columna derecha con selector de tamaño, cantidad de hojas, tipo de hoja y paleta de colores.
  - Ficha técnica inferior dinámica que se sincroniza automáticamente con la variante seleccionada.
- [x] **Lógica Dinámica en `assets/js/brand.js`:**
  - **Inhabilitación reactiva (disabled/gris):** Al seleccionar un tamaño o cantidad de hojas, las opciones de hojas o tipos no compatibles pasan a estado inhabilitado con estilo tachado/gris.
  - **Swap de imagen en hover:** Al pasar el cursor por los botones circulares de color, la imagen principal cambia instantáneamente a la foto del color específico, volviendo a la seleccionada al retirar el cursor.
  - **Navegación fluida:** Botones de navegación Anterior / Siguiente e indicador de producto dentro de la categoría.

---

## [2026-10-21] - Fase 2.1: Integración Universal de los 4 JSON de Productos
- [x] **Auditoría e Integración de los 4 JSON (`assets/data/products/`):**
  - **Triunfante:** 9 categorías, 35 productos/familias con sus imágenes de producto oficiales, variantes y ficha técnica.
  - **Tintoretto:** 3 categorías (Adhesivos, Témperas, Plastilinas), 11 productos con variantes de volumen (30g, 250g, 500g, 1000g, etc.), colores Fluo/Glitter y galerías.
  - **Potosí:** 5 categorías (Cuaderno con Espiral, Blocks, Cuadernos, Repuestos, Libros comerciales), 12 productos con soporte para atributo `manos` en libros de actas y talonarios.
  - **Mis Hojas:** 1 categoría (Cuaderno con espiral), 1 producto con variantes de espiral y rayado.
- [x] **Ajuste del Visor de Producto en `marca.html` y `assets/js/brand.js`:**
  - Ficha técnica universal responsive adaptada a los campos reales del JSON: **Tamaño, Color/Tipo, Caja, Paquete, Palet y Gramaje**.
  - Inclusión dinámica de selector de **Manos** (activado automáticamente para libros de actas).
  - Soporte para galerías de hasta 6 miniaturas con cambio en click.
  - Sincronización automática de las categorías en `assets/data/brands.json`.

---

## [2026-10-22] - Fase 3: Migración a Formato Servidor (Node.js + Express) y SPA Vanilla JS con Grilla de Familia
- [x] **Arquitectura Servidor (Node.js + Express):**
  - Implementación de [`server.js`](file:///c:/2026/tecnografic/server.js) con Express para servir recursos estáticos (`/assets`, `/views`) y manejar URLs limpias sin `.html` (`/`, `/nosotros`, `/catalogos`, `/puntos-de-venta`, `/contacto`, `/marca`, `/marca/:brand`).
  - Configuración de [`package.json`](file:///c:/2026/tecnografic/package.json) con scripts `npm start` y `npm run dev`.
- [x] **Enrutador SPA en Vanilla JS Nativo (Sin librerías externas ni Swup):**
  - Creación de [`assets/js/router.js`](file:///c:/2026/tecnografic/assets/js/router.js) utilizando únicamente `fetch()` y la History API nativa del navegador (`history.pushState` y evento `popstate`).
  - El `<header>` (Navbar + Buscador) y el `<footer>` residen exclusivamente en [`index.html`](file:///c:/2026/tecnografic/index.html), manteniéndose fijos y sin recargar nunca al navegar entre páginas.
  - Creación de vistas desacopladas en `views/`: `home.html`, `nosotros.html`, `catalogos.html`, `puntos-de-venta.html`, `contacto.html` y `marca.html`.
- [x] **Desacoplamiento del Main Content de Marca (Grilla de Familia + Detalle de Producto):**
  - **Sub-vista 1 (Grilla de la Categoría):** Al seleccionar una categoría en el sidebar, se despliega una grilla responsiva con las tarjetas de todos los productos pertenecientes a esa familia (imagen, nombre, subcategoría, badges de tamaños/hojas y muestras de color).
  - **Sub-vista 2 (Detalle y Variantes):** Al hacer clic en cualquier tarjeta de producto, se pasa a la vista de detalle con botón *"Volver a [Categoría]"*, permitiendo seleccionar tamaño, hojas, tipo, manos, muestras de colores con swap hover y la ficha técnica sincronizada.
  - Sincronización completa con URLs canónicas (`/marca/triunfante`, `/marca/tintoretto`, `/marca/potosi`, `/marca/mis-hojas`).




