import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('@react-pdf') || id.includes('html2canvas')) {
            return 'pdf-tools';
          }

          if (id.includes('apexcharts') || id.includes('react-apexcharts')) {
            return 'charts';
          }

          return undefined;
        },
      },
    },
  },
})
