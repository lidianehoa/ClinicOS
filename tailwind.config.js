/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Identidade Dra. Lidiane: verde-escuro, dourado e creme
      colors: {
        primary: '#1A4C37',   // verde-escuro da marca
        secondary: '#A47A2E', // dourado
        base: '#0F3123',
        creme: '#FBF7EE',
        // Paletas padrão remapeadas para a marca (recolore o sistema inteiro)
        teal: {
          50: '#EEF5F0',
          100: '#D5E8DC',
          200: '#ABD1BA',
          300: '#7AB495',
          400: '#4A9470',
          500: '#2E7755',
          600: '#215F44',
          700: '#1A4C37',
          800: '#143D2C',
          900: '#0F3123',
          950: '#0A2219',
        },
        clinic: {
          50: '#EEF5F0',
          100: '#D5E8DC',
          200: '#ABD1BA',
          300: '#7AB495',
          400: '#4A9470',
          500: '#2E7755',
          600: '#215F44',
          700: '#1A4C37',
          800: '#143D2C',
          900: '#0F3123',
          950: '#0A2219',
        },
        pink: {
          50: '#FBF6EA',
          100: '#F5EACB',
          200: '#EBD49A',
          300: '#DFBD6E',
          400: '#D2A94F',
          500: '#C1953A',
          600: '#A47A2E',
          700: '#835F27',
          800: '#6B4D25',
          900: '#5A4123',
          950: '#33240F',
        },
      },
      boxShadow: {
        'clinic': '0 4px 6px -1px rgb(26 76 55 / 0.08)',
        'clinic-lg': '0 10px 15px -3px rgb(26 76 55 / 0.10)',
      }
    },
  },
  plugins: [],
}
