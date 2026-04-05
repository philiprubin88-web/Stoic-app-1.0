import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    // Ensure assets are hashed for cache busting
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
