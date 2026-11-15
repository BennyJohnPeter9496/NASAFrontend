import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Building while the dev server runs must not reload the page (dist/index.html would trigger it).
  server: { watch: { ignored: ['**/dist/**'] } },
  build: {
    chunkSizeWarningLimit: 1500,
  },
})
