import type { Config } from 'tailwindcss'

export default <Config>{
  content: [
    './app/**/*.{vue,js,ts,jsx,tsx}',
    './components/**/*.{vue,js,ts,jsx,tsx}',
    './pages/**/*.{vue,js,ts,jsx,tsx}',
    './app.vue',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        canvas: '#0e0e11', // Deep Charcoal Basalt
        surface: {
          DEFAULT: '#151519',
          border: '#232328',
          hover: '#1b1b22',
          subtle: '#18181e',
        },
      },
    },
  },
}
