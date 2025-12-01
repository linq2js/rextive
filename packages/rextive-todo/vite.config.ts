import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4000,
  },
  resolve: {
    alias: [
      // Ensure workspace package subpath exports resolve correctly
      {
        find: "rextive/devtools/panel",
        replacement: resolve(__dirname, "../rextive/dist/devtools/panel/index.js"),
      },
      {
        find: "rextive/devtools",
        replacement: resolve(__dirname, "../rextive/dist/devtools/index.js"),
      },
    ],
  },
  optimizeDeps: {
    include: ["rextive/devtools", "rextive/devtools/panel"],
  },
});

