/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Crisp Horizons Light Theme Tokens */
        'rv-bg': '#f5f5f5',
        'rv-surface': '#ffffff',
        'rv-surface2': '#eaeaea',
        'rv-border': '#d0d0d0',
        'rv-text': '#1a1a1a',
        'rv-dim': '#6b7280',
        'rv-accent': '#d4890a',
        'rv-green': '#2e7d32',
        'rv-green-bg': 'rgba(46, 125, 50, 0.1)',
        'rv-red': '#c62828',
        'rv-red-bg': 'rgba(198, 40, 40, 0.1)',
        'rv-blue': '#1976d2',
        'rv-tag-bg': 'rgba(212, 137, 10, 0.12)',
        'rv-divider': 'rgba(0, 0, 0, 0.08)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
