/** @type {import('tailwindcss').Config} */
module.exports = {
  // Escanear todos los HTML de vistas y el index para detectar clases usadas
  content: [
    './index.html',
    './views/**/*.html',
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

