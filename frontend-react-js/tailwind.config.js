/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 950: '#0F0E0D', 900: '#191716', 800: '#26221F', 700: '#2A2724', 600: '#3A342F', 500: '#4A423C' },
        fg: { DEFAULT: '#F4EFE8', soft: '#CFC7BD', mute: '#A0968B' },
        accent: { DEFAULT: '#FF6B35', ink: '#14110F' },
      },
      fontFamily: {
        sans: ['"Instrument Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Bricolage Grotesque"', '"Instrument Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
