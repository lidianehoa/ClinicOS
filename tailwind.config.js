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
      }
    },
  },
  plugins: [],
}
