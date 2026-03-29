import type { Config } from 'tailwindcss';

export default <Config>{
  content: [],
  theme: {
    extend: {
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        sans: ['Commissioner', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // SafeNest primary blue
        nest: {
          50: '#f0f7ff',
          100: '#dfeeff',
          200: '#b8dcff',
          300: '#79c0ff',
          400: '#3a9eff',
          500: '#0b7aed',
          600: '#005fcb',
          700: '#004aa3',
        },
        // SafeNest warm orange
        warm: {
          50: '#fffbf5',
          100: '#fff4e6',
          400: '#ffb86c',
          500: '#ff9f43',
          600: '#e8842a',
        },
        // SafeNest safe green
        safe: {
          50: '#f0fdf4',
          100: '#dcfce7',
          400: '#34d46f',
          500: '#16b650',
          600: '#0e9240',
        },
        // SafeNest danger red
        danger: {
          50: '#fff5f5',
          100: '#ffe0e0',
          400: '#ff6b6b',
          500: '#ff4757',
          600: '#e63946',
        },
        // Neutral ink (warm gray — kept for backgrounds/text)
        ink: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
        },
      },
    },
  },
};
