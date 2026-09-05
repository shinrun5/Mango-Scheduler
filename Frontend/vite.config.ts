import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Dev-only proxy to the Express backend (localhost:3000) so the browser
// never has to deal with CORS. One entry per router mounted in Backend/src/index.ts.
const backendRoutes = [
  '/employees',
  '/stores',
  '/shifts',
  '/shiftrequirements',
  '/employeeStores',
  '/availability',
  '/schedule',
]

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: Object.fromEntries(
      backendRoutes.map((path) => [path, 'http://localhost:3000']),
    ),
  },
})
