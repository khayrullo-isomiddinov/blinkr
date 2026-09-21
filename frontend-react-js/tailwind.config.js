/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // Values live in styles/index.css so light and dark are one switch on <html class="dark">.
      colors: {
        ink: { 950: token('ink-950'), 900: token('ink-900'), 800: token('ink-800'), 700: token('ink-700'), 600: token('ink-600'), 500: token('ink-500') },
        fg: { DEFAULT: token('fg'), soft: token('fg-soft'), mute: token('fg-mute') },
        accent: { DEFAULT: token('accent'), ink: token('accent-ink') },
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
