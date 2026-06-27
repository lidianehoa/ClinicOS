/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#EC4899', // Pink (Tailwind pink-500)
        secondary: '#7C3AED', // Purple (Tailwind purple-600)
        base: '#1E1B4B', // Purple 950
        clinic: {
          50:  '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        }
      },
      boxShadow: {
        'clinic': '0 4px 6px -1px rgb(15 118 110 / 0.08)',
        'clinic-lg': '0 10px 15px -3px rgb(15 118 110 / 0.10)',
      }
    },
  },
  plugins: [],
}
