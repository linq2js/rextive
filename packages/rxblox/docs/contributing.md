# Contributing

Contributions are welcome! Please follow these guidelines to ensure quality and consistency.

## Table of Contents

- [Before Submitting a PR](#before-submitting-a-pr)
- [Development Workflow](#development-workflow)
- [Pull Request Checklist](#pull-request-checklist)
- [Reporting Issues](#reporting-issues)
- [License](#license)

---

## Before Submitting a PR

**Required:**

1. ✅ **Tests** - Write comprehensive tests for new features

   - Unit tests for new signal APIs
   - Integration tests for React component behavior
   - SSR compatibility tests if applicable

2. ✅ **TypeScript** - Maintain full type safety

   - All public APIs must be fully typed
   - No `any` types without explicit justification
   - Export types for public consumption

3. ✅ **Documentation** - Update README.md

   - Add examples for new features
   - Update API Reference section
   - Add JSDoc comments to public APIs

4. ✅ **Code Style** - Follow existing patterns

   - Run `pnpm lint` and fix all issues
   - Follow naming conventions (signals, withXXX for providers, etc.)
   - Keep functions small and focused

5. ✅ **React Compatibility** - Test across React versions
   - Verify behavior in Strict Mode
   - Test SSR if your change affects rendering
   - Verify no console warnings in development

---

## Development Workflow

```bash
# Install dependencies
pnpm install

# Run tests in watch mode
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests with UI
pnpm test:ui

# Build library
pnpm build

# Lint and type-check
pnpm lint
```

---

## Pull Request Checklist

- [ ] Tests added/updated and passing
- [ ] Types are correct and exported
- [ ] Documentation updated (README + JSDoc)
- [ ] No console warnings in development
- [ ] Strict Mode compatible
- [ ] SSR compatible (if applicable)
- [ ] Examples added for new features
- [ ] Backward compatible (or breaking change noted)

---

## Reporting Issues

When reporting bugs, please include:

- rxblox version
- React version
- Minimal reproduction (CodeSandbox or repo)
- Expected vs actual behavior
- Browser/environment details

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

[Back to Main Documentation](../README.md)

