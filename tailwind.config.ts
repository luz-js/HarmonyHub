import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './apps/web/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#050b12',
        surface: '#0a1420',
        primary: '#18e0ae',
        secondary: '#17a7f2',
        accent: '#8157ff',
        muted: '#8da2b4',
      },
      boxShadow: {
        soft: '0 18px 50px rgba(0,0,0,0.28)',
      },
    },
  },
  plugins: [],
};

export default config;
