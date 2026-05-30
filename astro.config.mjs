// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://mauriziomontis.github.io',
  base: '/thisisme/',
  output: 'static',
  vite: {
    plugins: [tailwindcss()]
  }
});
