/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        eris: {
          bg: '#0A0A0F',
          purple: {
            DEFAULT: '#7C3AED',
            light: '#A855F7',
          },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
        'wave-out': 'wave-out 1.2s ease-out infinite',
        'spin-slow': 'spin 1.5s linear infinite',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(168, 85, 247, 0.7)' },
          '70%': { transform: 'scale(1)', boxShadow: '0 0 0 20px rgba(168, 85, 247, 0)' },
          '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(168, 85, 247, 0)' },
        },
        'wave-out': {
          '0%': { transform: 'scale(1)', opacity: '0.8' },
          '100%': { transform: 'scale(1.8)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
