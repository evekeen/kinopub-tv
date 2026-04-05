import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: 'chrome 47',
    }),
  ],
  build: {
    target: 'chrome47',
    minify: 'terser',
    sourcemap: false,
  },
  resolve: {
    alias: {
      'hls.js': 'hls.js/dist/hls.light.js',
    },
  },
});
