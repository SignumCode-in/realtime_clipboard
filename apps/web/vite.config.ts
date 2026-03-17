import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@realtime-clipboard/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  server: {
    port: 3000,
    open: false,
  },
  optimizeDeps: {
    include: ['@realtime-clipboard/shared']
  },
  build: {
    outDir: 'dist',
    commonjsOptions: {
      include: [/@realtime-clipboard\/shared/, /node_modules/]
    }
  }
});
