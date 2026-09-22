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
        // The header/footer band: a fixed espresso color, the same in light and dark mode (never switched by the theme tokens above).
        chrome: { DEFAULT: '#16100D', raised: '#211812', line: '#3A2C25', fg: '#F6EFE8', soft: '#D8CCC0', mute: '#B0A296' },
      },
      fontFamily: {
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Bricolage Grotesque"', '"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Tabular data -- weights, reps, timers, counts -- so digits never jitter or jump as they update.
        mono: ['"Space Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: {
        // Capped well short of Tailwind's default xl/2xl/3xl/full: crisp tactile plates and rack pins, not bubbly pills.
        DEFAULT: '0.25rem',
        md: '0.25rem',
        lg: '0.5rem',
        xl: '0.5rem',
        full: '9999px',
      },
    },
  },
  plugins: [],
};
