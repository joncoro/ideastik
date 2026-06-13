/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#FAFAF8',
        foreground: '#1F1F1F',
        primary: '#6C3DF4',
        success: '#2BA664',
        alert: '#D97706',
        pillar: {
          autoridad: '#6C3DF4',
          conexion: '#EC4899',
          venta: '#F59E0B',
          prueba_social: '#10B981',
          educacion: '#3B82F6',
          otro: '#64748B'
        }
      },
      fontFamily: {
        heading: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}