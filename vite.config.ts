import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({ resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } }, plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwind()], server: { proxy: { '/api': 'http://127.0.0.1:4317' } } });
