import { defineConfig } from 'vite'
import honox from 'honox/vite'
import build from '@hono/vite-build/cloudflare-workers'

export default defineConfig({
  plugins: [
    honox({
      client: {
        input: ['./app/client/dashboard.ts', './app/client/share.ts']
      }
    }),
    build()
  ]
})
