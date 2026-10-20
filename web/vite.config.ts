import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          forms: ['react-hook-form', 'zod', '@hookform/resolvers/zod'],
          ui: ['@base-ui/react', 'radix-ui', 'sonner'],
          motion: ['motion/react'],
          data: ['axios', 'zustand', '@tanstack/react-query'],
        },
      },
    },
  },
  server: {
    proxy: Object.fromEntries(
      ['/user', '/product', '/order', '/favorite', '/category', '/upload', '/hello', '/review', '/admin/product', '/admin/user']
        .map((prefix) => [prefix, { target: 'http://localhost:8080', changeOrigin: true }]),
    ),
  },
})
