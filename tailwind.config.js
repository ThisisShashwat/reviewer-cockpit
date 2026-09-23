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
        canvas: {
          DEFAULT: '#eaeaf0',  // Crisp grayer canvas for distinct separation
          subtle: '#e2e2e9',   // Slightly darker track/well
          card: '#ffffff',     // Pure white card & panel surface
          hover: '#f0f0f4',    // Hover row / button hover
          elevated: '#ffffff', // Dropdowns / active controls
        },
        border: {
          subtle: '#e5e5ea',   // Hairline border
          DEFAULT: '#d1d1d6',  // Standard crisp border
          strong: '#8e8e93',   // Emphasized border
          focus: '#ec3750',    // Focus state (Hack Club Red)
        },
        content: {
          primary: '#111113',   // Stark readable near-black text
          secondary: '#3a3a3c', // High-contrast dark charcoal for body
          tertiary: '#636366',  // Metadata, labels, timestamps
          muted: '#8e8e93',     // Subtle placeholder / disabled text
        },
        'brand-orange': '#ff6b35',
        'brand-red': '#ec3750',
        brand: {
          red: '#ec3750',       // Hack Club signature red
          orange: '#ff6b35',    // Horizons orange
          accent: '#ec3750',
        },
        semantic: {
          success: '#15803d',     // Green (700)
          successBg: '#f0fdf4',   // Light green
          successBorder: '#bbf7d0',
          warning: '#b45309',     // Amber (700)
          warningBg: '#fffbeb',   // Light amber
          warningBorder: '#fde68a',
          danger: '#b91c1c',      // Red (700)
          dangerBg: '#fef2f2',    // Light red
          dangerBorder: '#fecaca',
          info: '#1d4ed8',        // Blue (700)
          infoBg: '#eff6ff',      // Light blue
          infoBorder: '#bfdbfe',
        },
      },
      fontFamily: {
        heading: ['Bricolage Grotesque', 'sans-serif'],
        sans: ['DM Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
