/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0d0d0d', // Slightly lighter than #0a0a0a for better contrast
        'light-gray': '#e0e0e0', // Primary text, subtle accents
        'medium-gray': '#a0a0a0', // Secondary text, subtle borders
        'soft-accent': '#607d8b', // Desaturated blue-gray for subtle highlights/hovers
        'border-dark': '#2a2a2a', // For dividers, subtle borders
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Montserrat', 'sans-serif'],
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Removed: glow, pulseGlow, backgroundShift, aurora-glow, text-reveal-gradient keyframes
      },
      animation: {
        fadeInUp: 'fadeInUp 0.6s ease-out forwards',
        'fadeInUp-slow': 'fadeInUp 1s ease-out forwards', // For staggered elements
      },
    },
  },
  plugins: [],
}