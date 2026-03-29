/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        nest: {
          50: '#f0f7ff',
          100: '#dfeeff',
          200: '#b8dcff',
          300: '#79c0ff',
          400: '#3a9eff',
          500: '#0b7aed',
          600: '#005fcb',
          700: '#004ba5',
          800: '#004088',
          900: '#003570',
        },
        warm: {
          50: '#fffbf5',
          100: '#fff4e6',
          200: '#ffe8cc',
          300: '#ffd6a5',
          400: '#ffb86c',
          500: '#ff9f43',
          600: '#e8842a',
          700: '#c46a1a',
        },
        safe: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#6ee7a0',
          400: '#34d46f',
          500: '#16b650',
          600: '#0e9240',
        },
        danger: {
          50: '#fff5f5',
          100: '#ffe0e0',
          400: '#ff6b6b',
          500: '#ff4757',
          600: '#e63946',
        },
        surface: {
          DEFAULT: '#fafbfe',
        },
      },
      fontFamily: {
        display: ['Outfit_700Bold'],
        'display-extrabold': ['Outfit_800ExtraBold'],
        body: ['Nunito_400Regular'],
        'body-medium': ['Nunito_500Medium'],
        'body-semibold': ['Nunito_600SemiBold'],
        'body-bold': ['Nunito_700Bold'],
      },
    },
  },
  plugins: [],
};
