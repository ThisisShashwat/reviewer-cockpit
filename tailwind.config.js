/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hc: {
          red: '#ec3750',
          orange: '#ff8c37',
          yellow: '#f1c40f',
          green: '#33d6a6',
          blue: '#338da6',
          purple: '#8067c3',
          dark: '#17171d',
          darker: '#0e0e12',
          card: '#1e1e26',
          border: '#2c2c38',
        }
      }
    },
  },
  plugins: [],
}
