import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}', // Ensure src is included
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0a0a0a',
        'primary-accent': '#34d399', // Emerald-400
        'secondary-accent': '#a78bfa', // Purple-400
        'tertiary-accent': '#60a5fa', // Blue-400
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Montserrat', 'sans-serif'] // For titles
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glow: {
          '0%, 100%': {
            textShadow: '0 0 5px rgba(52, 211, 153, 0.4), 0 0 10px rgba(52, 211, 153, 0.2)',
          },
          '50%': {
            textShadow: '0 0 10px rgba(52, 211, 153, 0.6), 0 0 20px rgba(52, 211, 153, 0.4)',
          },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0px rgba(52, 211, 153, 0.4)' },
          '50%': { boxShadow: '0 0 15px rgba(52, 211, 153, 0.6)' },
        },
        backgroundShift: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
      animation: {
        fadeInUp: 'fadeInUp 0.8s ease-out forwards',
        glow: 'glow 2s ease-in-out infinite',
        pulseGlow: 'pulseGlow 2s ease-in-out infinite',
        backgroundShift: 'backgroundShift 15s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}

export default config