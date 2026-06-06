/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        hookline: {
          50: '#f0f4ff',
          100: '#dbe4ff',
          500: '#4f6ef7',
          600: '#3b57e0',
          700: '#2f46c4',
          900: '#1a2560',
        },
      },
    },
  },
  plugins: [],
};
