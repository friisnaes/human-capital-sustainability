/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serverer projektet fra /<repository-navn>/.
// Workflowet sætter BASE_PATH til netop den sti. Lokalt og i andre statiske
// miljøer bruges en relativ base ('./'), som virker fra enhver undermappe,
// fordi applikationen anvender hash-baseret routing.
const base = process.env.BASE_PATH ?? './';

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
