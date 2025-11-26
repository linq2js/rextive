# Type Improvements - Quick Reference

Quick reference for Rextive's type system improvements.

---

## AnySignal<T>

**Use for:** Generic functions accepting any signal type

```ts
import { AnySignal } from "rextive";

function logChanges<T>(s: AnySignal<T>) {
  s.on(() => console.log("Changed:", s()));
  s.when(trigger, (current) => current.refresh());
}

// Works with both
logChanges(signal(0));                     // MutableSignal ✓
logChanges(signal({ x }, ({ deps }) => ...)); // ComputedSignal ✓
```

**Type narrowing:**
```ts
if ('set' in signal) {
  signal.set(value); // TypeScript knows: MutableSignal
}
```

---

## Improved when()

**Before:** Callback received generic `Signal<T>`

**Now:** Callback receives exact type (`MutableSignal<T>` or `ComputedSignal<T>`)

```ts
// MutableSignal
count.when(trigger, (current) => {
  current.set(100); // ✅ .set() available
});

// ComputedSignal
userData.when(userId, (current) => {
  current.refresh(); // ✅ .refresh() available
  current.stale();   // ✅ .stale() available
  // current.set()   // ❌ Not available
});
```

---

## Tag Kinds

**Default:** Accepts both mutable and computed
```ts
const tag = tag<number>(); // Tag<number, "mutable" | "computed">
```

**Mutable-only:** Semantic constraint for writable state
```ts
const stateTag: Tag<number, "mutable"> = tag<number, "mutable">();
```

**Computed-only:** Semantic constraint for derived values
```ts
const viewTag: Tag<number, "computed"> = tag<number, "computed">();
```

---

## Signal Types Cheat Sheet

| Type | Use When | Methods |
|------|----------|---------|
| `Signal<T>` | Base interface | `.on()`, `()` |
| `MutableSignal<T>` | Need `.set()` | All + `.set()`, `.reset()` |
| `ComputedSignal<T>` | Need `.pause()` | All + `.pause()`, `.resume()` |
| `AnySignal<T>` | Generic utilities | Common methods + `.when()`, `.refresh()` |

---

## Best Practices

✅ **DO:**
- Use `AnySignal<T>` for generic functions
- Use type narrowing with `'set' in signal`
- Use general tags by default
- Leverage improved `when()` typing

❌ **DON'T:**
- Cast to `any` or use `as` unnecessarily
- Use specific tag kinds without semantic reason
- Assume signal is mutable without checking

---

## Examples

### Signal Registry
```ts
class Registry {
  private signals = new Map<string, AnySignal<any>>();
  
  register<T>(name: string, s: AnySignal<T>) {
    this.signals.set(name, s);
  }
}
```

### Type-Safe Tag Operations
```ts
const stateTag = tag<number, "mutable">();
stateTag.forEach(s => s.set(x => x + 1)); // All are mutable ✓
```

### Conditional Operations
```ts
function sync<T>(source: AnySignal<T>, target: AnySignal<T>) {
  source.on(value => {
    if ('set' in target) target.set(value);
  });
}
```

---

## See Also

- [Full Guide](./TYPE_IMPROVEMENTS.md)
- [Examples](../examples/type-improvements-example.tsx)
- [README](../README.md)

