import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    nodePolyfills({
      protocolImports: true,
      globals: {
        Buffer: true,
        process: true,
        global: true
      }
    }),
    react()
  ],
  resolve: {
    alias: {
      util: 'util/',           // Node util
      stream: 'stream-browserify',
      path: 'path-browserify',
      buffer: 'buffer/',
      crypto: 'crypto-browserify',
      process: 'process/browser'
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: [
      'util',
      'stream-browserify',
      'path-browserify',
      'buffer',
      'crypto-browserify',
      'process/browser'
    ]
  },
  build: {
    // bundle everything into a single file to avoid dynamic import errors on Arweave
    rollupOptions: {
      output: { inlineDynamicImports: true }
    }
  }
});
