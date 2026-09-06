import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Dev-only proxy to the Express backend (localhost:3000) so the browser never has
// to deal with CORS. The backend mounts everything under /api, so a single rule
// covers it and there's no clash with client-side routes like /schedule.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
