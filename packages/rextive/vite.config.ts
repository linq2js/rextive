/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dts from "vite-plugin-dts";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
    }),
  ],
  // Don't define __DEV__ at library build time - let the consuming application
  // define it based on their build mode. This ensures proper tree-shaking
  // in the consumer's production build, not the library's build.
  build: {
    lib: {
      entry: {
        rextive: resolve(__dirname, "src/index.ts"),
        "react/index": resolve(__dirname, "src/react/index.ts"),
        "immer/index": resolve(__dirname, "src/immer/index.ts"),
        "cache/index": resolve(__dirname, "src/cache/index.ts"),
        "plugins/index": resolve(__dirname, "src/plugins/index.ts"),
        "devtools/index": resolve(__dirname, "src/devtools/index.ts"),
        "devtools-panel/index": resolve(
          __dirname,
          "src/devtools-panel/index.ts"
        ),
        "operators/index": resolve(__dirname, "src/operators/index.ts"),
        op: resolve(__dirname, "src/op.ts"),
      },
      formats: ["es"],
    },
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true,
        passes: 2,
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime", "immer"],
      output: {
        entryFileNames: (chunkInfo) => {
          // Main entry: rextive.js
          if (chunkInfo.name === "rextive") {
            return "rextive.js";
          }
          // Sub-exports: keep path structure
          return "[name].js";
        },
        exports: "named",
      },
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.type.check.ts",
        "**/*.type.check.tsx",
        "**/test/**",
        "**/examples/**",
        "**/src/index.ts",
        "**/src/react/index.ts",
        "**/src/typeCheck.tsx", // Type-only tests
        "**/src/op.ts", // Re-export only
        "**/src/cache/index.ts", // Re-export only
        "**/src/immer/index.ts", // Re-export only
        "**/src/plugins/index.ts", // Re-export only
        "**/.eslintrc.cjs", // Config file
        "**/*.mjs", // Compiled output
        "**/test-op-*.ts", // Test utility files
        "**/src/utils/createSignalAccessProxy.ts", // Internal utility
        "**/src/utils/createProxy.ts", // Internal utility
        "**/src/createSignalContext.ts", // Complex internal context with many edge cases
        "**/src/wait.ts", // Complex async handling with many edge case branches
      ],
    },
    onConsoleLog(log, type) {
      // Suppress React warning about functions not being valid children in tests
      if (
        type === "stderr" &&
        log.includes("Functions are not valid as a React child")
      ) {
        return false;
      }
      return true;
    },
  },
});
