import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// FinPilot build configuration
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    open: false,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
