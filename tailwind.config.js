/** @type {import('tailwindcss').Config} */
module.exports = {
  // Escanear todos los HTML de vistas, el index y los scripts JS para detectar clases usadas
  content: [
    './index.html',
    './views/**/*.html',
    './assets/js/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        'mis-hojas': 'var(--color-lila-mis-hojas, #7477b9)',
        'potosi': 'var(--color-verde-potosi, #9fba30)',
        'tintoretto': 'var(--color-celeste-tintoretto, #009fe3)',
        'triunfante': 'var(--color-azul-triunfante, #0059e5)',
      },
      fontFamily: {
        montserrat: ['Montserrat', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
