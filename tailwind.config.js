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
      fontFamily: {
        montserrat: ['Montserrat', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
