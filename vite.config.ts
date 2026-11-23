import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        '/api/v1/drone-journey': {
          target: env.VITE_DRONE_API_BASE_URL?.trim() || 'http://172.105.33.237:8000',
          changeOrigin: true,
          proxyTimeout: 15000,
          timeout: 15000,
        },
      },
    },
  }
})
