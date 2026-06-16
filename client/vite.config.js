import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forward API calls to the Express server during development so the
    // browser only ever talks to one origin (no CORS setup needed).
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
