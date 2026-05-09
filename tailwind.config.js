/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Chamba — sincronizada con mobile/src/theme/index.ts
        primary: {
          50:  '#f0fff8',
          100: '#d0ffe9',
          200: '#a2f2cd',
          300: '#49BF88',
          400: '#1AD980',
          500: '#1BF28E', // brand primary
          600: '#00A855', // primaryShadow / hover
          700: '#007a3d',
          800: '#005229',
          900: '#002d16',
          950: '#001409',
        },
        dark: '#0D1B2A',
        brand: {
          text:    '#111827',
          gray:    '#6B7280',
          border:  '#ecebe6',
          surface: '#F9FAFB',
          bgSoft:  '#fbfaf7',
        },
      },
    },
  },
  plugins: [],
}
