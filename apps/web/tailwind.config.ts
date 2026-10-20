import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#111214',
        surface: '#1A1B1F',
        'surface-2': '#23252A',
        line: '#30333A',
        // El color principal sale de las variables de src/index.css (--primary-rgb...).
        primary: 'rgb(var(--primary-rgb) / <alpha-value>)',
        'primary-soft': 'rgb(var(--primary-soft-rgb) / <alpha-value>)',
        'primary-tint': 'var(--primary-tint)',
        'on-primary': 'var(--on-primary)',
        warning: '#F2A93B',
        'warning-soft': '#F7C371',
        'warning-tint': '#2B2417',
        secondary: '#8FB4FF',
        accent: '#B79CFF',
        muted: '#A6A39D',
      },
      fontFamily: {
        sans: ['Figtree', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Figtree', 'ui-sans-serif', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        soft: '0 12px 32px rgba(0,0,0,0.32)',
      },
    },
  },
  plugins: [],
};

export default config;
