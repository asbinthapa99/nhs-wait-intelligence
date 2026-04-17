/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        nhs: {
          navy: '#1e3a5f',
          blue: '#1d4ed8',
          light: '#eff6ff',
          border: '#e2e8f0',
        },
        score: {
          red: '#e05252',
          amber: '#d97706',
          green: '#16a34a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
