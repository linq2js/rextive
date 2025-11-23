# For Library Consumers

## Development Mode Detection

`rxblox` uses development utilities (`devLog`, `devWarn`, `devError`, `devOnly`, `devAssert`) that should be tree-shaken in production builds.

### Recommended Setup (for optimal tree-shaking)

To ensure development-only code is completely eliminated in your production builds, add this to your **Vite config**:

```ts
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  // ... other config
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
});
```

Or for **webpack**:

```js
// webpack.config.js
module.exports = {
  // ... other config
  plugins: [
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    }),
  ],
};
```

### Without Setup (fallback behavior)

If you don't define `__DEV__`, rxblox will fall back to runtime checks using `process.env.NODE_ENV`. This still works, but **won't be tree-shaken**, meaning development utilities will remain in your production bundle (though they won't execute).

## Why This Matters

- **With `__DEV__` defined**: Production bundle is smaller, all dev code is eliminated
- **Without `__DEV__`**: Production bundle includes dev utilities (but they're disabled at runtime)

For the best performance and smallest bundle size, we recommend defining `__DEV__` in your build configuration.

## How It Works

When you define `__DEV__`:

1. **Development build**: `__DEV__` → `true`, dev utilities work
2. **Production build**: `__DEV__` → `false`, bundler removes all `if (__DEV__)` blocks
3. **Result**: Zero runtime cost, smaller bundle

This is the same pattern used by React and other production libraries.

