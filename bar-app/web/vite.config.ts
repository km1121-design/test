import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 開発中は /api を Hono サーバー（:8787）へプロキシする。
// 本番（Cloudflare Pages）は同一オリジンの Functions/Worker が /api を処理する。
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  server: {
    proxy: {
      '/api': {
        target: process.env.API_TARGET ?? 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
