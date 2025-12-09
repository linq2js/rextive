import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Point to source files for HMR during development
const rextiveSrc = resolve(__dirname, "../rextive/src");

export default defineConfig({
  plugins: [TanStackRouterVite(), react()],
  server: {
    port: 3003,
    open: true,
    watch: {
      // Watch rextive source files for changes
      ignored: ["!**/node_modules/rextive/**"],
    },
  },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: [
      // App alias
      {
        find: "@",
        replacement: resolve(__dirname, "./src"),
      },
      // Map rextive imports to SOURCE files (not dist) for HMR
      {
        find: "rextive/plugins",
        replacement: resolve(rextiveSrc, "plugins/index.ts"),
      },
      {
        find: "rextive/devtools-panel",
        replacement: resolve(rextiveSrc, "devtools-panel/index.ts"),
      },
      {
        find: "rextive/devtools",
        replacement: resolve(rextiveSrc, "devtools/index.ts"),
      },
      {
        find: "rextive/react",
        replacement: resolve(rextiveSrc, "react/index.ts"),
      },
      {
        find: "rextive/op",
        replacement: resolve(rextiveSrc, "op/index.ts"),
      },
      {
        find: "rextive/helpers",
        replacement: resolve(rextiveSrc, "helpers/index.ts"),
      },
      {
        find: /^rextive$/,
        replacement: resolve(rextiveSrc, "index.ts"),
      },
    ],
  },
  optimizeDeps: {
    // Exclude rextive from pre-bundling to enable HMR
    exclude: [
      "rextive",
      "rextive/plugins",
      "rextive/devtools",
      "rextive/devtools-panel",
      "rextive/react",
      "rextive/op",
      "rextive/helpers",
    ],
  },
});
