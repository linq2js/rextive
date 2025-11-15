# Comparison with Other Solutions

How does rxblox stack up against popular React state management libraries?

## Table of Contents

- [Feature Matrix](#feature-matrix)
- [Boilerplate Comparisons](#boilerplate-comparisons)
  - [Redux Toolkit](#redux-toolkit-35-lines-across-3-files)
  - [Zustand](#zustand-20-lines-1-file)
  - [Jotai](#jotai-25-lines-1-file--provider)
  - [rxblox](#rxblox-12-lines-1-file)
- [Summary](#summary-lines-of-code)

---

## Feature Matrix

| Feature                  | rxblox | React | Zustand | Jotai | Solid Signals |
| ------------------------ | ------ | ----- | ------- | ----- | ------------- |
| Fine-grained reactivity  | ✅     | ❌    | ❌      | ✅    | ✅            |
| Computed values          | ✅     | ❌    | ❌      | ✅    | ✅            |
| Auto dependency tracking | ✅     | ❌    | ❌      | ✅    | ✅            |
| No hooks rules           | ✅     | ❌    | ❌      | ❌    | ✅            |
| Works in React           | ✅     | ✅    | ✅      | ✅    | ❌            |
| Built-in DI              | ✅     | ❌    | ❌      | ❌    | ✅            |
| Zero boilerplate         | ✅     | ✅    | ❌      | ❌    | ✅            |

---

## Boilerplate Comparisons

Here's how rxblox compares to other popular state management solutions for a simple counter with increment functionality.

### Redux Toolkit (~35 lines across 3 files)

**Redux Toolkit** reduces Redux boilerplate but still requires slice setup, store configuration, and causes component re-renders.

```tsx
// counterSlice.ts
import { createSlice } from "@reduxjs/toolkit";

const counterSlice = createSlice({
  name: "counter",
  initialState: { count: 0 },
  reducers: {
    increment: (state) => {
      state.count += 1;
    },
  },
});

export const { increment } = counterSlice.actions;
export default counterSlice.reducer;

// store.ts
import { configureStore } from "@reduxjs/toolkit";
import counterReducer from "./counterSlice";

export const store = configureStore({
  reducer: { counter: counterReducer },
});

// Component.tsx
import { useSelector, useDispatch } from "react-redux";
import { increment } from "./counterSlice";

function Counter() {
  const count = useSelector((state) => state.counter.count);
  const dispatch = useDispatch();
  console.log("Component rendered"); // Logs on every state change
  return (
    <div>
      <div>Count: {count}</div>
      <button onClick={() => dispatch(increment())}>+</button>
    </div>
  );
}
```

**Issues:** Still requires slice creation and store setup, multiple files needed, component re-renders on every state change, hook-based (rules of hooks apply).

### Zustand (~20 lines, 1 file)

**Zustand** is simpler than Redux but still requires store setup and causes full component re-renders.

```tsx
import create from "zustand";

const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

function Counter() {
  const { count, increment } = useStore();
  console.log("Component rendered"); // Logs on every state change
  return (
    <div>
      <div>Count: {count}</div>
      <button onClick={increment}>+</button>
    </div>
  );
}
```

**Issues:** Store setup required, component re-renders on every state change, hook-based (rules of hooks apply).

### Jotai (~25 lines, 1 file + Provider)

**Jotai** uses atoms but requires Provider wrapper and is subject to hooks rules.

```tsx
import { atom, useAtom, Provider } from "jotai";

const countAtom = atom(0);

function App() {
  return (
    <Provider>
      <Counter />
    </Provider>
  );
}

function Counter() {
  const [count, setCount] = useAtom(countAtom);
  console.log("Component rendered"); // Logs on every state change
  return (
    <div>
      <div>Count: {count}</div>
      <button onClick={() => setCount((c) => c + 1)}>+</button>
    </div>
  );
}
```

**Issues:** Provider required, component re-renders on every state change, hook-based (rules of hooks apply).

### rxblox (~12 lines, 1 file)

**rxblox** provides the simplest API with fine-grained reactivity - only the exact UI that depends on state updates.

```tsx
import { signal, rx } from "rxblox";

const count = signal(0);

function Counter() {
  console.log("Component rendered"); // Logs ONCE
  return (
    <div>
      <div>{rx(() => `Count: ${count()}`)}</div>
      <button onClick={() => count.set(count() + 1)}>+</button>
    </div>
  );
}
```

**Benefits:** Zero boilerplate, no store setup, no Provider, fine-grained updates (component doesn't re-render), no hooks rules.

---

## Summary: Lines of Code

For a simple counter with increment functionality:

| Solution          | Lines of Code | Files Required                    |
| ----------------- | ------------- | --------------------------------- |
| **Redux Toolkit** | ~35 lines     | 3 files (slice, store, component) |
| **Zustand**       | ~20 lines     | 1 file                            |
| **Jotai**         | ~25 lines     | 1 file + Provider wrapper         |
| **rxblox**        | ~12 lines     | 1 file                            |

**rxblox wins on simplicity** with the least code, zero configuration, and fine-grained reactivity! 🎯

---

[Back to Main Documentation](../README.md)

