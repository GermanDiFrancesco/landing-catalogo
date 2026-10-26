const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Servir recursos estáticos (CSS, JS, imágenes, fuentes, JSON)
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Servir vistas parciales para el router de frontend
app.use('/views', express.static(path.join(__dirname, 'views')));

// Herramientas internas de desarrollo (Catalog Builder, etc.)
app.use('/tools', express.static(path.join(__dirname, 'tools')));

// Rutas explícitas con URLs limpias (sin .html)
const pageRoutes = [
  '/',
  '/nosotros',
  '/catalogos',
  '/puntos-de-venta',
  '/contacto',
  '/marca',
  '/marca/:brand'
];

pageRoutes.forEach(route => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });
});

// Fallback para cualquier otra ruta de navegación
app.get('*', (req, res) => {
  // Si la petición pide un archivo existente con extensión (ej. .png, .css) y no se encontró, responde 404
  if (path.extname(req.path)) {
    return res.status(404).send('Archivo no encontrado');
  }
  // En cualquier otro caso, servir la aplicación principal para que el router de frontend la procese
  res.sendFile(path.join(__dirname, 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 Servidor Tecnografic iniciado con éxito`);
    console.log(`🌐 Acceder en: http://localhost:${PORT}`);
    console.log(`=========================================`);
  });
}

module.exports = app;
