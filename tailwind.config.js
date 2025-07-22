/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  // tailwind.config.js
  theme: {
    extend: {
      colors: {
        primary: '#4f46e5', // indigo-600
        secondary: '#10b981', // emerald-500
      },
    },
  },

  plugins: [],
}
