import { defineConfig } from 'vite'
import honox from 'honox/vite'
import build from '@hono/vite-build/cloudflare-workers'

const client = {
  input: ['./app/client/dashboard.ts', './app/client/share.ts']
}

export default defineConfig(({ mode }) => {
  if (mode === 'client') {
    return {
      plugins: [honox({ client })],
      build: {
        outDir: 'dist/static',
        emptyOutDir: true,
        rollupOptions: {
          output: {
            entryFileNames: '[name].js',
            chunkFileNames: '[name]-[hash].js',
            assetFileNames: '[name]-[hash][extname]'
          }
        }
      }
    }
  }

  return {
    plugins: [honox({ client }), build()],
    build: { emptyOutDir: false }
  }
})
