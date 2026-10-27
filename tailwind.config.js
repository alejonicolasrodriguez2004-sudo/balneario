/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          900: '#134e4a',
        },
        balneario: {
          sand: '#fefce8',
          sea: '#0284c7',
          sun: '#eab308',
          alert: '#dc2626',
        }
      },
      minHeight: {
        touch: '48px',
      },
      minWidth: {
        touch: '48px',
      }
    },
  },
  plugins: [],
};

