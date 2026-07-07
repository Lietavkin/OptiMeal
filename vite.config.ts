import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (/node_modules[\\/](react|react-dom|react-router|scheduler|@remix-run)/.test(id)) {
            return 'vendor-react'
          }

          if (id.includes('node_modules/@supabase/')) {
            return 'vendor-supabase'
          }

          if (/node_modules[\\/](framer-motion|lucide-react)/.test(id)) {
            return 'vendor-ui-motion'
          }

          return 'vendor-misc'
        },
      },
    },
  },
})
