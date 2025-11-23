# Archived Packages

This directory contains packages that are no longer actively maintained but are preserved for historical reference.

## Contents

### rxblox
**Status:** ⚠️ DEPRECATED (archived on 2025-11-23)

The `rxblox` package has been superseded by [`rextive`](../packages/rextive).

### rxblox-demo
Demo application for rxblox (archived with the package)

### rxblox-todo  
TodoMVC implementation using rxblox (archived with the package) 

### Why deprecated?

- `rextive` offers improved performance with explicit dependency tracking
- Better TypeScript support and type inference
- Cleaner API design based on lessons learned from rxblox
- Active maintenance and development

### Migration

If you're using rxblox, please migrate to rextive:

```bash
npm uninstall rxblox
npm install rextive
```

See the [rextive README](../packages/rextive/README.md) for migration guidance.

---

**Note:** These archived packages are kept in the repository for:
- Historical reference
- Understanding the evolution of the library
- Helping users who may still be on older versions

They are **not** part of the active workspace and will not be built or tested.

