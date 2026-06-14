import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/splash.png'],
      manifest: {
        name: 'Treadmill Workout',
        short_name: 'Workout',
        description: 'Беговая дорожка — тренировки и статистика',
        start_url: './',
        scope: './',
        display: 'standalone',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'portrait',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/icon-180.png', sizes: '180x180', type: 'image/png' }
        ],
        screenshots: [],
        categories: ['health', 'fitness'],
        lang: 'ru'
      }
    })
  ],
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
    setupFiles: './src/test/setup.ts',
    globals: true,
    exclude: ['node_modules/**', 'dist/**', 'tests/**', '.worktrees/**']
  }
});
