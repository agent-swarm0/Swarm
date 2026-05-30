/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#F0F8FF',
          100: '#E0F0FF',
          200: '#B3DBFF',
          300: '#80C2FF',
          400: '#4DA8FF',
          500: '#1A8CFF', /* Main brand blue */
          600: '#006CE0',
          700: '#004C99',
          800: '#002E66',
          900: '#001A33',
        },
        accent: {
          light: '#FFD700', /* Gold for highlights */
          DEFAULT: '#FFC400',
          dark: '#E0AC00',
        },
        neutral: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        gradientStart: '#1A8CFF', /* A vibrant blue */
        gradientEnd: '#6A00FF', /* A deep, engaging purple */
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Recommend linking Inter from Google Fonts
        serif: ['Merriweather', 'serif'], // For academic content readability
      },
      boxShadow: {
        'vibrant': '0 10px 30px rgba(26, 140, 255, 0.3), 0 5px 15px rgba(106, 0, 255, 0.2)',
      }
    },
  },
  plugins: [],
}