import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['jsmediatags'],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  },
  build: {
    commonjsOptions: {
      include: [/jsmediatags/, /node_modules/],
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'jsmediatags'],
        },
      },
    },
  },
  resolve: {
    alias: {
      'jsmediatags': 'jsmediatags/dist/jsmediatags.min.js',
    },
  },
});