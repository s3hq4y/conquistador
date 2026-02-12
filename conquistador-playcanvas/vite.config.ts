import { defineConfig } from 'vite';

export default defineConfig({
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
