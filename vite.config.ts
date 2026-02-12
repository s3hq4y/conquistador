import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'playcanvas': ['playcanvas']
        }
      }
    }
  },
  server: {
    host: true,
    port: 3000,
    open: true
  }
});
