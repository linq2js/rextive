# RxBlox Monorepo

A monorepo containing the RxBlox state management library and demo application.

## Structure

- `packages/rxblox` - The main library package (publishable to NPM)
- `packages/rxblox-demo` - Demo application using the library

## Getting Started

### Install Dependencies

```bash
pnpm install
```

### Development

```bash
# Run demo app
pnpm dev

# Build library
pnpm build

# Run tests
pnpm test
```

## Publishing

To publish the `rxblox` package:

```bash
cd packages/rxblox

# Dry run (check what would be published)
pnpm dry

# Version bump
pnpm version:minor  # or version:major

# Build and publish
pnpm build
npm publish
```
