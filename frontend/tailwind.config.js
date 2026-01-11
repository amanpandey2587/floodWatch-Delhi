/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        deepBlue: '#0A2540',
        lightBlue: '#2563EB',
        lightBlue300: '#3B82F6',
        lightBlue500: '#1D4ED8',
        greenLight: '#00D9FF',
        grayBlue: '#1E3A5F',
        grayText: '#4A5568',
        deepBlueHead: '#1A202C',
      },
      fontFamily: {
        mullish: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

