import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    {
      // Stamp the SW cache name with a build timestamp so every deploy
      // invalidates the old service worker cache for existing users.
      name: 'inject-sw-version',
      closeBundle() {
        const swPath = resolve(__dirname, 'dist', 'sw.js')
        if (existsSync(swPath)) {
          const src = readFileSync(swPath, 'utf8').replace(/__BUILD_TIME__/g, Date.now().toString())
          writeFileSync(swPath, src)
          console.log('[vite] SW cache version stamped.')
        }
      }
    }
  ],
  build: {
    outDir: 'dist'
  }
})
