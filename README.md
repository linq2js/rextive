## Rextive

**Rextive** is a signal-based reactive state management library with explicit dependencies.

### Key Features

- 🎯 **One unified primitive** - `signal()` for all reactive needs (state, computed, async)
- 📦 **Explicit dependencies** - Dependencies are always declared, never auto-tracked
- ⚡ **Lazy tracking** - Only subscribes to signals that are actually accessed
- 🔄 **Unified sync/async** - Same API handles both synchronous and asynchronous values
- 🧹 **Built-in cleanup** - Automatic disposal and memory management
- ⚛️ **React-first** - Seamless integration with React via `rx()` and `useScope()`

### Quick Example

```tsx
import { signal, rx, useScope } from "rextive/react";

// Create reactive state
const count = signal(0);
const doubled = count.to((x) => x * 2);

// React component
function Counter() {
  return (
    <div>
      <p>Count: {rx(count)}</p>
      <p>Doubled: {rx(doubled)}</p>
      <button onClick={() => count.set((x) => x + 1)}>+1</button>
    </div>
  );
}
```

### 📚 Full Documentation

See **[packages/rextive/README.md](./packages/rextive/README.md)** for complete documentation including:

- Getting started guide
- API reference
- React integration
- Operators (`to`, `filter`, `scan`, `debounce`, `throttle`, etc.)
- Advanced patterns
- DevTools integration

---

## Repository Structure

### Active Package

- **[packages/rextive](./packages/rextive)** - Modern reactive state management (publishable to NPM)

### Demo App

- **[packages/rextive-todo](./packages/rextive-todo)** - Todo app demonstrating rextive patterns

---

## Getting Started

### Install Dependencies

```bash
pnpm install
```

### Development

```bash
# Build library
pnpm build

# Run tests
pnpm test
```

### Working with rextive

```bash
cd packages/rextive

# Build in watch mode
pnpm build:watch

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage
```

---

## Publishing

To publish the `rextive` package:

```bash
cd packages/rextive

# Dry run (check what would be published)
pnpm dry

# Version bump and publish
pnpm pu:pa   # patch version
pnpm pu:mi   # minor version
pnpm pu:ma   # major version
```

---

## Documentation

- **[rextive README](./packages/rextive/README.md)** - Complete documentation for the active package
- **[Migration Guide](./ARCHIVED_PACKAGES.md)** - Information about archived packages

## Legacy Documentation

Documentation for archived packages can be found in the `archived/` directory.
