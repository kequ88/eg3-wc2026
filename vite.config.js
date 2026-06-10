// vite.config.js
//
// Vite is your BUILD TOOL. It does two things:
//   1. In development (npm run dev):   serves files with hot reload
//   2. In production (npm run build):  bundles everything into /dist
//
// The /dist folder is what Netlify actually deploys to the world.
// Your source files in /src never go to production directly.

import { defineConfig } from 'vite';

export default defineConfig({
  // Root is where index.html lives
  root: '.',

  // Build output goes to /dist — Netlify reads from here
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },

  // During dev, Vite serves on localhost:5173 by default
  server: {
    port: 5173,
    open: true, // automatically opens browser on npm run dev
  },
});
