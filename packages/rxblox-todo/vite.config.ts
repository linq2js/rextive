import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // Define __DEV__ flag for rxblox development utilities
    // In production builds, code inside `if (__DEV__)` is eliminated
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
})

