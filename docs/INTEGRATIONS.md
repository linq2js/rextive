# Integrations

Optional integrations for enhanced functionality.

---

## Immer Integration (`rextive/immer`)

Immutable updates with a mutable API.

```bash
npm install immer
```

### `produce()`

Create immutable updates using Immer:

```tsx
import { signal } from "rextive";
import { produce } from "rextive/immer";

const state = signal({ count: 0, user: { name: "John" } });

// Write "mutations" that are actually immutable
state.set(produce((draft) => {
  draft.count++;
  draft.user.name = "Jane";
}));
```

### Array Operations

```tsx
const todos = signal([
  { id: 1, text: "Learn React", done: false },
  { id: 2, text: "Learn Immer", done: false },
]);

// Add item
todos.set(produce((draft) => {
  draft.push({ id: 3, text: "Build app", done: false });
}));

// Toggle item
todos.set(produce((draft) => {
  draft[0].done = !draft[0].done;
}));

// Remove item
todos.set(produce((draft) => {
  draft.splice(0, 1);
}));
```

### Complex Nested Updates

```tsx
const app = signal({
  user: { name: "John", settings: { theme: "dark" } },
  posts: [],
});

app.set(produce((draft) => {
  draft.user.settings.theme = "light";
  draft.posts.push({ id: 1, title: "Hello" });
}));
```

### Benefits

- ✅ **Simpler updates** - No spread operators
- ✅ **Fewer bugs** - Can't accidentally mutate
- ✅ **More readable** - Clear intent
- ✅ **Type-safe** - Full TypeScript support

---

## Data Caching (`rextive/cache`)

Keyed data cache with reference counting and lifecycle management.

```tsx
import { cache, staleOn, evictOn, lru, hydrate } from "rextive/cache";
```

### Basic Usage

```tsx
// Create a cache with factory function
const getUser = cache("users", async (userId: string) => {
  const res = await fetch(`/api/users/${userId}`);
  return res.json();
});

// Access cached data
const { value, unref } = getUser("123");
const user = await value;
console.log(user.name);

// Release reference when done
unref();

// Cache methods
getUser.stale("123");   // Mark stale (lazy re-fetch)
getUser.refresh("123"); // Force re-fetch
getUser.delete("123");  // Remove from cache
getUser.clear();        // Clear all
getUser.peek("123");    // Get without creating
getUser.has("123");     // Check existence
```

### Strategies

#### `staleOn` - Mark Entries Stale

```tsx
import { staleOn } from "rextive/cache";

const getUser = cache(
  "users",
  async (id: string) => fetchUser(id),
  [
    staleOn({ ttl: 5 * 60 * 1000 }),       // Stale after 5 minutes
    staleOn({ trigger: refreshSignal }),   // Stale when signal changes
    staleOn({ windowFocus: true }),        // Stale on window focus
  ]
);
```

#### `evictOn` - Auto-Evict Entries

```tsx
import { evictOn } from "rextive/cache";

const getUser = cache(
  "users",
  async (id: string) => fetchUser(id),
  [
    evictOn({ ttl: 30 * 60 * 1000 }),   // Evict after 30 minutes
    evictOn({ trigger: logoutSignal }), // Evict on logout
    evictOn({ refCount: 0 }),           // Evict when no references
  ]
);
```

#### `lru` - Least Recently Used

```tsx
import { lru } from "rextive/cache";

const getUser = cache(
  "users",
  async (id: string) => fetchUser(id),
  [lru(100)] // Keep at most 100 entries
);
```

#### `hydrate` - Initial Data

```tsx
import { hydrate } from "rextive/cache";

const initialData = {
  "123": { id: "123", name: "Alice" },
  "456": { id: "456", name: "Bob" },
};

const getUser = cache(
  "users",
  async (id: string) => fetchUser(id),
  [hydrate(initialData)]
);
```

### React Integration

```tsx
function UserProfile({ userId }: { userId: string }) {
  const scope = useScope(() => {
    const { value, unref } = getUser(userId);
    return { value, dispose: unref };
  }, { watch: [userId] });

  return rx(() => {
    const state = task.from(scope.value);
    if (state.loading) return <Loading />;
    if (state.error) return <Error error={state.error} />;
    return <div>{state.value.name}</div>;
  });
}
```

---

## DevTools (`rextive/devtools`)

Visual debugging panel for signals.

### Setup

```tsx
import { enableDevTools, DevToolsPanel } from "rextive/devtools";

// Enable devtools (call once at app startup)
enableDevTools();

// Add panel to your app
function App() {
  return (
    <div>
      <YourApp />
      {process.env.NODE_ENV === "development" && <DevToolsPanel />}
    </div>
  );
}
```

### Signal Naming

Name your signals for easier debugging:

```tsx
const count = signal(0, { name: "counter" });
const user = signal(null, { name: "currentUser" });

const doubled = signal(
  { count },
  ({ deps }) => deps.count * 2,
  { name: "doubledCount" }
);
```

### DevToolsPanel Features

- **Signal List** - View all named signals
- **Real-time Values** - See current values update live
- **Dependency Graph** - Visualize signal relationships
- **Change History** - Track value changes over time
- **Manual Updates** - Set values directly for testing

### Error Tracing

Use `signal.trace()` in DevTools:

```tsx
try {
  dashboard();
} catch (error) {
  const traces = signal.trace(error);
  console.table(traces);
  // Shows: signal name, when (compute:initial, etc.), async, timestamp
}
```

### Options

```tsx
<DevToolsPanel
  position="bottom-right" // Position: "bottom-right" | "bottom-left" | "top-right" | "top-left"
  collapsed={false}       // Start collapsed?
  maxHistory={100}        // Max history entries
  filter={(name) => !name.startsWith("internal:")} // Filter signals
/>
```

---

## Plugins (`rextive/plugins`)

Built-in plugins for common patterns.

### `persistor` - Auto-Persistence

```tsx
import { persistor } from "rextive/plugins";

const persist = persistor<{ theme: string; fontSize: number }>({
  load: () => JSON.parse(localStorage.getItem("settings") || "{}"),
  save: (args) => {
    const existing = JSON.parse(localStorage.getItem("settings") || "{}");
    localStorage.setItem("settings", JSON.stringify({ ...existing, ...args.values }));
  },
});

const theme = signal("dark", { use: [persist("theme")] });
const fontSize = signal(16, { use: [persist("fontSize")] });
```

### `when` - React to Other Signals

```tsx
import { when } from "rextive/plugins";

const refreshTrigger = signal(0);

const userData = signal(async () => fetchUser(), {
  use: [when(refreshTrigger, (sig) => sig.refresh())],
});

// Trigger refresh
refreshTrigger.set((n) => n + 1);
```

---

## Next Steps

- **[Examples](./EXAMPLES.md)** - Real-world examples
- **[API Reference](./API_REFERENCE.md)** - Complete API documentation


