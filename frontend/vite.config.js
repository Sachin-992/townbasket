import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 300,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // React core
            if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/react-router')) {
              return 'vendor-react'
            }
            // Charting (recharts + d3)
            if (id.includes('/recharts/') || id.includes('/d3-')) {
              return 'vendor-charts'
            }
            // Data fetching
            if (id.includes('/@tanstack/')) {
              return 'vendor-query'
            }
            // Auth
            if (id.includes('/@supabase/')) {
              return 'vendor-supabase'
            }
            // UI libraries
            if (id.includes('/cmdk/')) {
              return 'vendor-ui'
            }
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})
