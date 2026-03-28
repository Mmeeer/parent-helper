import type { Config } from 'tailwindcss';

export default <Config>{
  content: [],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Cormorant Garamond', 'serif'],
        sans: ['Commissioner', 'sans-serif'],
      },
      colors: {
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
        ac: {
          500: '#0d9488',
          600: '#0f766e',
        },
        primary: {
          50: '#f0fdfa',
          100: '#f0fdfa',
          500: '#0d9488',
          600: '#0f766e',
          700: '#0f766e',
        },
      },
    },
  },
};
