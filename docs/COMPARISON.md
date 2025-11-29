# Comparison

How Rextive compares to other state management solutions.

---

## Feature Matrix

| Feature | Rextive | Zustand | Jotai | Recoil | React Query | Redux |
|---------|---------|---------|-------|--------|-------------|-------|
| **Learning Curve** | 🟢 One concept | 🟢 Simple | 🟢 Simple | 🟡 Medium | 🟡 Medium | 🔴 Complex |
| **Bundle Size** | 🟢 ~5KB | 🟢 ~3KB | 🟢 ~5KB | 🔴 ~20KB | 🟡 ~15KB | 🔴 ~40KB |
| **Lazy Tracking** | 🟢 Auto | 🔴 Manual | 🟡 Partial | 🟡 Partial | 🟢 Auto | 🔴 Manual |
| **Async Support** | 🟢 Built-in | 🟡 Manual | 🟡 Async atoms | 🟡 Selectors | 🟢 Core feature | 🔴 Thunks |
| **Auto Cancel** | 🟢 Built-in | 🔴 Manual | 🔴 Manual | 🔴 Manual | 🟢 Built-in | 🔴 Manual |
| **DevTools** | 🟢 Built-in | 🟢 Redux DT | 🟡 Basic | 🟡 Basic | 🟢 Built-in | 🟢 Full |
| **TypeScript** | 🟢 Perfect | 🟢 Good | 🟢 Good | 🟡 OK | 🟢 Good | 🟡 OK |
| **Framework Agnostic** | 🟢 Yes | 🔴 React | 🔴 React | 🔴 React | 🔴 React | 🟡 Mostly |

**Legend:** 🟢 Excellent | 🟡 Acceptable | 🔴 Needs improvement

---

## Code Comparisons

### Simple Counter

**Rextive:**

```tsx
const count = signal(0);
const increment = () => count.set((x) => x + 1);

function Counter() {
  return <h1 onClick={increment}>{rx(count)}</h1>;
}
```

**Zustand:**

```tsx
const useStore = create((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
}));

function Counter() {
  const { count, increment } = useStore();
  return <h1 onClick={increment}>{count}</h1>;
}
```

**Jotai:**

```tsx
const countAtom = atom(0);

function Counter() {
  const [count, setCount] = useAtom(countAtom);
  return <h1 onClick={() => setCount((x) => x + 1)}>{count}</h1>;
}
```

---

### Derived State

**Rextive:**

```tsx
const count = signal(0);
const doubled = count.to((x) => x * 2);
const formatted = signal(
  { count, doubled },
  ({ deps }) => `${deps.count} × 2 = ${deps.doubled}`
);
```

**Zustand:**

```tsx
const useStore = create((set, get) => ({
  count: 0,
  get doubled() { return get().count * 2; },
  get formatted() { return `${get().count} × 2 = ${get().doubled}`; },
}));
```

**Jotai:**

```tsx
const countAtom = atom(0);
const doubledAtom = atom((get) => get(countAtom) * 2);
const formattedAtom = atom((get) => 
  `${get(countAtom)} × 2 = ${get(doubledAtom)}`
);
```

---

### Async Data Fetching

**Rextive:**

```tsx
const userId = signal(1);
const user = signal({ userId }, async ({ deps, abortSignal }) => {
  const res = await fetch(`/users/${deps.userId}`, { signal: abortSignal });
  return res.json();
});

// Auto-cancels on userId change!
```

**React Query:**

```tsx
function useUser(userId) {
  return useQuery({
    queryKey: ["user", userId],
    queryFn: ({ signal }) => 
      fetch(`/users/${userId}`, { signal }).then(r => r.json()),
  });
}
```

**Zustand (manual):**

```tsx
const useStore = create((set) => ({
  user: null,
  loading: false,
  error: null,
  fetchUser: async (userId) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/users/${userId}`);
      set({ user: await res.json(), loading: false });
    } catch (error) {
      set({ error, loading: false });
    }
  },
}));
```

---

## When to Choose Rextive

### Choose Rextive When:

- ✅ You want **one API** for state, computed, and async
- ✅ You need **automatic request cancellation**
- ✅ You want **fine-grained reactivity** (lazy tracking)
- ✅ You need **framework-agnostic** state management
- ✅ You prefer **explicit dependencies** over auto-tracking magic
- ✅ You want **minimal boilerplate**

### Consider Alternatives When:

- **Zustand**: You want the simplest possible API for basic global state
- **React Query**: Your focus is purely on server state with complex caching
- **Jotai**: You prefer atom-based composition over signals
- **Redux**: You need time-travel debugging and strict unidirectional data flow

---

## Migration Guides

### From Zustand

```tsx
// Zustand
const useStore = create((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
}));

// Rextive
const count = signal(0);
const increment = () => count.set((x) => x + 1);
```

### From Jotai

```tsx
// Jotai
const countAtom = atom(0);
const doubledAtom = atom((get) => get(countAtom) * 2);

// Rextive
const count = signal(0);
const doubled = count.to((x) => x * 2);
```

### From React Query

```tsx
// React Query
const { data, isLoading, error } = useQuery({
  queryKey: ["user", userId],
  queryFn: () => fetchUser(userId),
});

// Rextive
const userIdSignal = signal(userId);
const user = signal({ userIdSignal }, async ({ deps, abortSignal }) => {
  return fetchUser(deps.userIdSignal, { signal: abortSignal });
});

// In component
rx(() => {
  const state = loadable(user());
  if (state.loading) return <Loading />;
  if (state.error) return <Error />;
  return <User data={state.value} />;
});
```

---

## Next Steps

- **[Getting Started](./GETTING_STARTED.md)** - Quick start guide
- **[Examples](./EXAMPLES.md)** - Real-world examples


