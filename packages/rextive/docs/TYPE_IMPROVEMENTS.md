# Type System Improvements

This document describes the recent improvements to Rextive's type system that enhance type safety and developer experience.

## Summary of Changes

1. **Removed `"any"` from `SignalKind`** - Now uses union type `"mutable" | "computed"` instead
2. **Added `AnySignal<T>` type** - For generic functions accepting any signal type
3. **Improved `when()` typing** - Moved from base `Signal` to specific types with better inference
4. **Enhanced Tag type safety** - Added brand properties for better compile-time checking

---

## 1. SignalKind Type Refinement

### Before

```ts
type SignalKind = "any" | "mutable" | "computed";

// Tags defaulted to "any"
const tag = tag<number>(); // Tag<number, "any">
```

### After

```ts
type SignalKind = "mutable" | "computed";

// Tags default to SignalKind (union of both)
const tag = tag<number>(); // Tag<number, "mutable" | "computed">
```

### Why This Change?

- **More precise semantics**: `SignalKind` is now a union type, not a string literal
- **Better TypeScript inference**: Union types work better with generic constraints
- **Clearer intent**: Tags accept "both kinds" rather than "any kind"

### Migration

No code changes needed. If you explicitly used `"any"`:

```ts
// Before
const tag = tag<number, "any">();

// After - use SignalKind or omit for default
const tag = tag<number>(); // Same behavior
```

---

## 2. AnySignal Type

### Overview

`AnySignal<T>` is a union type representing any signal (mutable or computed):

```ts
type AnySignal<TValue, TInit = TValue> =
  | MutableSignal<TValue, TInit>
  | ComputedSignal<TValue, TInit>;
```

### When to Use

Use `AnySignal<T>` for **generic utility functions** that work with all signal types:

```ts
// ✅ Generic function with AnySignal
function watchSignal<T>(s: AnySignal<T>) {
  s.on(() => console.log("Changed:", s()));
  s.when(trigger, (current) => current.refresh());
}

// Works with both types
watchSignal(signal(0)); // MutableSignal
watchSignal(signal({ dep }, ({ deps }) => deps.dep)); // ComputedSignal
```

### Difference from Signal<T>

| Type                | Description                                      | Use Case                      |
| ------------------- | ------------------------------------------------ | ----------------------------- |
| `Signal<T>`         | Base interface with minimal methods              | Type declarations, interfaces |
| `AnySignal<T>`      | Union of `MutableSignal<T> \| ComputedSignal<T>` | Generic functions, utilities  |
| `MutableSignal<T>`  | Specific mutable signal                          | When you need `.set()`        |
| `ComputedSignal<T>` | Specific computed signal                         | When you need `.pause()`      |

### Type Narrowing

Use type narrowing for mutable-specific operations:

```ts
function updateIfMutable<T>(s: AnySignal<T>, value: T) {
  if ("set" in s) {
    // TypeScript narrows to MutableSignal
    s.set(value); // ✅ .set() available
  }
}
```

### Use Cases

**1. Signal Registry**

```ts
class SignalRegistry {
  private signals = new Map<string, AnySignal<any>>();

  register<T>(name: string, signal: AnySignal<T>) {
    this.signals.set(name, signal);
    signal.on(() => console.log(`${name} changed`));
  }

  dispose(name: string) {
    this.signals.get(name)?.dispose(); // Works for all types
  }
}
```

**2. Array of Mixed Signals**

```ts
const signals: AnySignal<number>[] = [
  signal(1),
  signal(2),
  signal({ dep }, ({ deps }) => deps.dep),
];

// Subscribe to all
signals.forEach((s) => s.on(() => console.log("Changed")));
```

**3. Conditional Operations**

```ts
function conditionalRefresh<T>(s: AnySignal<T>, force: boolean) {
  if (force) {
    s.refresh(); // Works for all
  } else if ("set" in s) {
    // Mutable - no refresh needed
  } else {
    s.stale(); // Computed - mark stale
  }
}
```

---

## 3. Improved when() Typing

### Overview

The `when()` method was moved from the base `Signal` type to specific signal types (`MutableSignal` and `ComputedSignal`) for better type inference.

### Before

```ts
// Base Signal interface had when()
interface Signal<T> {
  when(target, callback): Signal<T>;
}

// Callback received generic Signal<T>
userData.when(userId, (current) => {
  current.refresh(); // Type: Signal<T> (base interface)
});
```

### After

```ts
// Helper type for type-safe when()
type When<TCurrent> = <const TOther extends Signal<any>>(
  target: TOther | readonly TOther[],
  callback: (current: TCurrent, trigger: TOther) => void
) => TCurrent;

// Each signal type has its own when()
interface MutableSignal<T> {
  when: When<MutableSignal<T>>;
}

interface ComputedSignal<T> {
  when: When<ComputedSignal<T>>;
}

// Callback receives exact signal type
userData.when(userId, (current) => {
  current.refresh(); // Type: ComputedSignal<T> ✓
});
```

### Benefits

**1. Type-Safe Callbacks**

```ts
// MutableSignal: callback receives MutableSignal
const count = signal(0);
count.when(trigger, (current) => {
  current.set(100); // ✅ .set() available
});

// ComputedSignal: callback receives ComputedSignal
const user = signal(async () => fetchUser());
user.when(userId, (current) => {
  current.refresh(); // ✅ .refresh() available
  current.stale(); // ✅ .stale() available
  // current.set()   // ❌ Not available - computed is read-only
});
```

**2. Better IDE Autocomplete**

The callback parameter now shows the exact methods available for that signal type.

**3. Compile-Time Safety**

TypeScript catches incorrect method usage:

```ts
const computed = signal({ dep }, ({ deps }) => deps.dep);
computed.when(trigger, (current) => {
  current.set(123); // ❌ Type error: .set() not on ComputedSignal
});
```

### Migration

No code changes needed! The new typing is backward compatible:

```ts
// This works exactly as before, but with better types
signal.when(target, (current, trigger) => {
  current.refresh();
});
```

---

## 4. Enhanced Tag Type Safety

### Overview

Tags now use **brand properties** with unique symbols to prevent cross-kind assignments:

```ts
type Tag<TValue, TKind extends SignalKind = SignalKind> = {
  // Brand for compile-time discrimination
  readonly __brand: TKind extends "mutable"
    ? typeof MUTABLE_TAG_BRAND
    : TKind extends "computed"
    ? typeof COMPUTED_TAG_BRAND
    : typeof MUTABLE_TAG_BRAND | typeof COMPUTED_TAG_BRAND;

  kind: TKind;
  // ... other properties
};
```

### Why Brands?

Without brands, TypeScript's structural typing allows incorrect assignments:

```ts
// Without brands (BAD)
const mutableTag: Tag<number, "mutable"> = computedTag; // No error!

// With brands (GOOD)
const mutableTag: Tag<number, "mutable"> = computedTag; // ❌ Type error!
// Error: Type 'typeof COMPUTED_TAG_BRAND' is not assignable to 'typeof MUTABLE_TAG_BRAND'
```

### Tag Kinds

```ts
// Default: accepts both mutable and computed
const mixedTag = tag<number>(); // Tag<number, "mutable" | "computed">

// Mutable-only: semantic constraint for writable state
const stateTag: Tag<number, "mutable"> = tag<number, "mutable">();

// Computed-only: semantic constraint for derived values
const viewTag: Tag<number, "computed"> = tag<number, "computed">();
```

### Type Safety Rules

Tags with specific kinds provide compile-time guarantees:

```ts
// ✅ Same kind assignment
const t1: Tag<number, "mutable"> = mutableTag;
const t2: Tag<number, "computed"> = computedTag;

// ❌ Cross-kind assignment (compile error)
const t3: Tag<number, "mutable"> = computedTag; // Error!
const t4: Tag<number, "computed"> = mutableTag; // Error!

// ✅ Specific to general (upcasting OK)
const t5: Tag<number, SignalKind> = mutableTag;
const t6: Tag<number, SignalKind> = computedTag;
```

### UseList Type Safety

The `UseList<T, TKind>` type now properly restricts plugins and tags:

```ts
type UseList<TValue, TKind> = ReadonlyArray<
  [TKind] extends ["mutable"]
    ?
        | Plugin<TValue, "mutable">
        | Plugin<TValue, SignalKind>
        | Tag<TValue, "mutable">
        | Tag<TValue, SignalKind>
    : [TKind] extends ["computed"]
    ?
        | Plugin<TValue, "computed">
        | Plugin<TValue, SignalKind>
        | Tag<TValue, "computed">
        | Tag<TValue, SignalKind>
    : Plugin<TValue, SignalKind> | Tag<TValue, SignalKind>
>;
```

**Rules:**

- Mutable signals/tags accept: mutable-specific OR general plugins/tags
- Computed signals/tags accept: computed-specific OR general plugins/tags
- Mixed signals/tags accept: general plugins/tags only

### Known Limitations

⚠️ **Array literal contexts** may not catch all cross-kind errors:

```ts
const computedTag = tag<number, "computed">();

// ⚠️ This doesn't error (but is logically wrong)
const mutableSig = signal(0, { use: [computedTag] });
```

**Why?** TypeScript's structural typing in array literal contexts.

**Runtime behavior:** The signal IS added to the tag, but violates the semantic contract.

**Best practice:**

- Use general tags `tag<T>()` by default
- Use specific kinds only when you have strong semantic reasons
- Use code reviews and linting to catch logical errors

### Use Cases

**1. Type-Safe Tag Operations**

```ts
const stateTag = tag<number, "mutable">();
const count1 = signal(0, { tags: [stateTag] });
const count2 = signal(5, { tags: [stateTag] });

// All signals in this tag are guaranteed to be mutable
stateTag.forEach((s) => {
  s.set((x) => x + 1); // ✅ Safe - all are MutableSignal
});
```

**2. Semantic Grouping**

```ts
class AppState {
  // Tags for different purposes
  private stateTag = tag<any, "mutable">(); // Writable state
  private viewTag = tag<any, "computed">(); // Computed views

  resetState() {
    this.stateTag.forEach((s) => s.reset()); // Only affects state
  }

  refreshViews() {
    this.viewTag.forEach((s) => s.refresh()); // Only affects views
  }
}
```

---

## Best Practices

### 1. Use AnySignal for Generic Functions

```ts
// ✅ GOOD: Accepts all signal types
function logChanges<T>(s: AnySignal<T>) {
  s.on(() => console.log("Changed"));
}

// ❌ BAD: Too restrictive
function logChanges<T>(s: MutableSignal<T>) {
  // Only works with mutable signals
}
```

### 2. Use Type Narrowing When Needed

```ts
// ✅ GOOD: Check before using set()
if ("set" in signal) {
  signal.set(newValue);
}

// ❌ BAD: Assuming it's mutable
(signal as MutableSignal<T>).set(newValue); // Runtime error if computed!
```

### 3. Prefer General Tags by Default

```ts
// ✅ GOOD: Works with all signals
const allCounters = tag<number>();

// ⚠️ USE SPARINGLY: Only when semantically meaningful
const mutableState = tag<number, "mutable">();
```

### 4. Leverage Improved when() Typing

```ts
// ✅ GOOD: Type-safe callback
userData.when(userId, (current) => {
  current.refresh(); // TypeScript knows methods available
});

// ❌ BAD: Casting loses type safety
userData.when(userId, (current) => {
  (current as any).set(123); // No type checking!
});
```

---

## Migration Guide

### No Breaking Changes

All changes are **backward compatible**! Existing code works without modifications.

### Optional Improvements

Consider these updates for better type safety:

**1. Use AnySignal in generic utilities:**

```ts
// Before
function helper(s: Signal<number>) { ... }

// After
function helper(s: AnySignal<number>) { ... }
```

**2. Leverage improved when() types:**

```ts
// Before - no changes needed, but you get better autocomplete now
signal.when(trigger, (current) => current.refresh());

// After - same code, better types automatically!
```

**3. Consider specific tag kinds for semantic grouping:**

```ts
// Before
const stateTag = tag<AppState>();

// After - if you want to restrict to mutable
const stateTag: Tag<AppState, "mutable"> = tag<AppState, "mutable">();
```

---

## TypeScript Version

These improvements work best with **TypeScript 5.0+**. Earlier versions may have limited type inference.

---

## See Also

- [README.md](../README.md) - Main documentation
- [Examples](../examples/type-improvements-example.tsx) - Type improvements examples
- [API Reference](../README.md#complete-api-reference) - Full API documentation
