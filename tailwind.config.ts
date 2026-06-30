import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        jfs: {
          primary: '#0b4ea2',
          accent: '#ff8a00',
          bg: '#f5f7fb',
        },
      },
    },
  },
  plugins: [],
};

export default config;
