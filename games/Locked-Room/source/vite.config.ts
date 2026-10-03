import { defineConfig } from 'vite';
export default defineConfig({ base: '/Locked-Room/', build: { target: 'es2022', chunkSizeWarningLimit: 1800 } });
