import { defineConfig, minimalPreset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset: {
    ...minimalPreset,
    maskable: {
      sizes: [512],
      padding: 0.3,
      resizeOptions: { background: '#7C3AED' },
    },
    apple: {
      sizes: [180],
      padding: 0.2,
      resizeOptions: { background: '#0A0A0F' },
    },
    transparent: {
      sizes: [192, 512],
      padding: 0,
      resizeOptions: { background: 'transparent' },
    },
  },
  images: ['public/icon.svg'],
})
