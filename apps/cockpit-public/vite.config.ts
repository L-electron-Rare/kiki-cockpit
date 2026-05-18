import path from 'node:path';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:9100', changeOrigin: false },
    },
  },
  plugins: [
    tanstackStart({
      srcDirectory: 'src',
      router: { routesDirectory: 'routes' },
    }),
    react(),
    nitro(),
  ],
});
