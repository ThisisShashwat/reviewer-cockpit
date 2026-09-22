/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Exact Horizons Reviewer Design Tokens */
        'rv-bg': '#1c1c1c',
        'rv-surface': '#242424',
        'rv-surface2': '#2e2e2e',
        'rv-border': '#3a3a3a',
        'rv-text': '#e0e0e0',
        'rv-dim': '#8892a4',
        'rv-accent': '#f5a623',
        'rv-green': '#4caf50',
        'rv-green-bg': 'rgba(76, 175, 80, 0.12)',
        'rv-red': '#ef5350',
        'rv-red-bg': 'rgba(239, 83, 80, 0.12)',
        'rv-blue': '#42a5f5',
        'rv-tag-bg': 'rgba(245, 166, 35, 0.15)',
        'rv-divider': 'rgba(255, 255, 255, 0.06)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
