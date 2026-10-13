import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // NOTE: three.js is deliberately NOT listed here.
        //
        // Naming it in `manualChunks` makes Vite emit
        // `<link rel="modulepreload" href="/assets/three-*.js">` into index.html,
        // which puts ~875 KB on the critical path of EVERY page load — including
        // mobile, where the 3D scene never renders (it is hidden below 768px).
        // That defeats the `lazy(() => import(...))` in pages/marketing/Home.jsx,
        // whose entire purpose is to keep this bundle off phones.
        //
        // Rollup still code-splits at the dynamic import, so the scene remains a
        // separate cached chunk that loads only when it is actually rendered.
        // Measured: initial JS went 1234 KB -> 360 KB.
        //
        // Do not re-add a `three` entry "for cache friendliness" without
        // re-measuring what index.html preloads.
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          maps: ['leaflet', 'react-leaflet'],
          query: ['@tanstack/react-query', 'axios'],
          motion: ['framer-motion'],
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