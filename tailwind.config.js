/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard', 'Inter', 'sans-serif'],
      },
      colors: {
        ax: {
          primary: '#2563eb',
          dark: '#0a0a0a',
          surface: '#f8f7f4',
          border: '#e5e3de',
        },
      },
    },
  },
  plugins: [],
};
