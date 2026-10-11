import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          maps: ['leaflet', 'react-leaflet'],
          query: ['@tanstack/react-query', 'axios'],
          motion: ['framer-motion'],
          three: ['three', '@react-three/fiber', '@react-three/drei', 'gsap'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Point at a different backend with VITE_PROXY_TARGET when port 5001 is
      // taken (e.g. by another local project): VITE_PROXY_TARGET=http://localhost:5002
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:5001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:5001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});