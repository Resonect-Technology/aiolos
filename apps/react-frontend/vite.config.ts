import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy API requests to the Adonis backend
      '/api': {
        target: 'http://localhost:33891',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      // Proxy SSE requests to the Adonis backend
      '/__transmit': {
        target: 'http://localhost:33891',
        changeOrigin: true,
        ws: true,
      }
    }
  }
})
