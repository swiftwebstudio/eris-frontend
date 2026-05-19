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
          bg:      '#000814',
          navy:    '#001D3D',
          blue:    '#0077FF',
          cyan:    '#00D4FF',
          glow:    '#00E5FF',
          text:    '#E6F4FF',
          muted:   '#6B8FB3',
        },
      },
    },
  },
  plugins: [],
}
