# RxBlox Monorepo

> **⚠️ IMPORTANT:** The `rxblox` package has been deprecated and archived. This repository now focuses on **[rextive](./packages/rextive)** - a modern reactive state management library for React.

## Active Package

- **[packages/rextive](./packages/rextive)** - Modern reactive state management with explicit dependencies (publishable to NPM)

## Archived Packages

Legacy packages have been moved to the `archived/` directory. See [ARCHIVED_PACKAGES.md](./ARCHIVED_PACKAGES.md) for details.

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

## Documentation

- [rextive README](./packages/rextive/README.md) - Complete documentation for the active package
- [Migration Guide](./ARCHIVED_PACKAGES.md) - Information about archived packages

## Legacy Documentation

Documentation for archived packages can be found in the `archived/` directory.
