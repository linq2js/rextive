# Archived Packages Notice

## Summary

On **November 23, 2025**, the following packages were archived and moved to the `archived/` directory:

- **rxblox** (v1.37.0) - The original reactive state management library
- **rxblox-demo** - Demo application for rxblox  
- **rxblox-todo** - TodoMVC implementation using rxblox

## Why Archived?

These packages have been superseded by **[rextive](./packages/rextive)**, which offers:

- ✅ Better performance with explicit dependency tracking
- ✅ Improved TypeScript support and type inference
- ✅ Cleaner API design based on lessons learned
- ✅ Active development and maintenance
- ✅ Better documentation and examples

## What Changed?

### Directory Structure
```
Before:
packages/
  ├── rxblox/
  ├── rxblox-demo/
  ├── rxblox-todo/
  ├── rextive/
  └── rxasync/

After:
packages/
  ├── rextive/        ← Active
  └── rxasync/        ← Active

archived/
  ├── rxblox/         ← Preserved but not built/tested
  ├── rxblox-demo/
  └── rxblox-todo/
```

### Workspace Configuration

The `pnpm-workspace.yaml` still includes `packages/*`, which now only contains active packages (`rextive` and `rxasync`). The archived packages are excluded automatically.

### Scripts Updated

Root `package.json` scripts have been simplified:

**Before:**
```json
{
  "dev": "pnpm --filter rxblox-demo dev",
  "dev:todo": "concurrently ...",
  "build": "pnpm --filter rxblox build",
  "build:all": "pnpm --filter rxblox build && pnpm --filter rextive build",
  "test": "pnpm --filter rxblox test",
  "test:rextive": "pnpm --filter rextive test"
}
```

**After:**
```json
{
  "build": "pnpm --filter rextive build",
  "test": "pnpm --filter rextive test"
}
```

## For Users

### If You're Using rxblox

Please migrate to `rextive`:

```bash
npm uninstall rxblox
npm install rextive
```

See the [rextive README](./packages/rextive/README.md) for documentation and migration guidance.

### If You Need the Old Code

The archived packages remain in the repository at `archived/rxblox` for:
- Historical reference
- Understanding the evolution of the library  
- Helping users who may still be on older versions

However, they are **not maintained**, **not built**, and **not tested** as part of the active workspace.

## Technical Details

- **Archived Date:** November 23, 2025
- **Last rxblox Version:** 1.37.0  
- **Current rextive Version:** 2.2.0
- **Packages Removed from Workspace:** 3 (rxblox, rxblox-demo, rxblox-todo)
- **Dependencies Cleaned:** ~75 packages removed from workspace

## Questions?

- See [rextive documentation](./packages/rextive/README.md)
- Check [archived/README.md](./archived/README.md) for more details
- Open an issue if you need migration assistance

