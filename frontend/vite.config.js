import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const target = env.VITE_API_PROXY || 'http://localhost:5000'
  const proxy = {
    '/api': { target, changeOrigin: true },
    '/socket.io': { target, ws: true, changeOrigin: true },
  }
  return { plugins: [react()], server: { proxy }, preview: { proxy } }
})
