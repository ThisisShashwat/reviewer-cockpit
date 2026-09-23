/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* Signature Horizons Dark Theme Tokens */
        'rv-bg': '#121212',
        'rv-surface': '#1c1c1c',
        'rv-surface2': '#242424',
        'rv-surface3': '#2e2e2e',
        'rv-border': '#333333',
        'rv-border-subtle': '#282828',
        'rv-text': '#f4f4f5',
        'rv-dim': '#a1a1aa',
        'rv-muted': '#71717a',
        'rv-accent': '#ff6b35', // Horizons Vibrant Orange
        'rv-brand': '#ec3750', // Hack Club Red
        'rv-green': '#22c55e',
        'rv-green-bg': 'rgba(34, 197, 94, 0.12)',
        'rv-red': '#ef4444',
        'rv-red-bg': 'rgba(239, 68, 68, 0.12)',
        'rv-yellow': '#eab308',
        'rv-yellow-bg': 'rgba(234, 179, 8, 0.12)',
        'rv-blue': '#3b82f6',
        'rv-blue-bg': 'rgba(59, 130, 246, 0.12)',
        'rv-tag-bg': 'rgba(255, 107, 53, 0.12)',
        'rv-divider': 'rgba(255, 255, 255, 0.08)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
