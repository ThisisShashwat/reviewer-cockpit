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
        canvas: {
          DEFAULT: '#09090b',  // Pitch obsidian background (Zinc-950)
          subtle: '#111113',   // Subtle secondary background
          card: '#161619',     // Card & panel surface
          hover: '#1e1e23',    // Table hover row & button hover
          elevated: '#25252b', // Elevated dropdowns / active controls
        },
        border: {
          subtle: 'rgba(255, 255, 255, 0.08)',
          DEFAULT: 'rgba(255, 255, 255, 0.12)',
          focus: '#ff6b35',
        },
        content: {
          primary: '#fafafa',   // Crisp stark white for headers & key metrics
          secondary: '#d4d4d8', // Readable high-contrast zinc for body copy
          tertiary: '#a1a1aa',  // Metadata, timestamps, handles
          muted: '#71717a',     // Subtle placeholder/disabled text
        },
        brand: {
          orange: '#ff6b35',    // Accent orange
          red: '#ec3750',       // Hack Club red
        },
        semantic: {
          success: '#22c55e',
          successBg: 'rgba(34, 197, 94, 0.12)',
          warning: '#f59e0b',
          warningBg: 'rgba(245, 158, 11, 0.12)',
          danger: '#ef4444',
          dangerBg: 'rgba(239, 68, 68, 0.12)',
          info: '#3b82f6',
          infoBg: 'rgba(59, 130, 246, 0.12)',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
