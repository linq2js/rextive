# Advanced Patterns

## Pattern 1: Chain Multiple Transformations

For complex transformations, chain multiple operators together:

```tsx
import { signal } from "rextive";
import { to, filter, scan } from "rextive/op";

const count = signal(1);

// Chain multiple operators (executed left-to-right)
const result = count.pipe(
  filter((x) => x > 0),     // Step 1: Only positive numbers
  to((x) => x * 2),          // Step 2: Double the value
  scan((acc, x) => acc + x, 0) // Step 3: Running sum
);

count.set(5);  // result = 10 (5 * 2)
count.set(3);  // result = 16 (10 + 3 * 2)
count.set(-1); // result = 16 (filtered out)
count.set(2);  // result = 20 (16 + 2 * 2)
```

### Create Reusable Operator Pipelines

```tsx
import { to, filter, scan } from "rextive/op";

// Define reusable operators
const positiveOnly = filter((x: number) => x > 0);
const double = to((x: number) => x * 2);
const runningSum = scan((acc: number, x: number) => acc + x, 0);

// Apply to multiple signals
const result1 = signal1.pipe(positiveOnly, double, runningSum);
const result2 = signal2.pipe(positiveOnly, double, runningSum);
```

---

## Pattern 2: Group Signals with Tags

Tags let you group related signals and perform batch operations:

```tsx
import { signal } from "rextive";

// Create a tag to group form signals
const formTag = signal.tag();

// Create signals with the tag
const name = signal("", { use: [formTag] });
const email = signal("", { use: [formTag] });
const message = signal("", { use: [formTag] });

// Batch operations (preferred)
formTag.resetAll();       // Reset all form fields
formTag.refreshAll();     // Force recomputation on all
formTag.disposeAll();     // Cleanup all signals

// Manual iteration (for custom logic)
formTag.forEach((s) => s.reset());
formTag.map((s) => s.get());  // Collect all values

// Get count of signals
console.log(`Form has ${formTag.size} fields`);
```

### Type-Safe Tags

```tsx
import { tag } from "rextive";

// General tag - accepts both mutable and computed signals
const mixedTag = tag<number>();

// Mutable-only tag
const stateTag = tag<number, "mutable">();

// Computed-only tag  
const viewTag = tag<number, "computed">();

const count = signal(0, { use: [stateTag] }); // ✅
const doubled = signal({ count }, ({ deps }) => deps.count * 2, {
  use: [viewTag], // ✅
});
```

---

## Pattern 3: Plugins - Extend Signal Behavior

Plugins let you extend signal behavior with reusable logic:

```tsx
import { signal } from "rextive";
import type { Plugin } from "rextive";

// Logger plugin
const logger: Plugin<number> = (sig) => {
  const name = sig.displayName || "unnamed";
  console.log(`[${name}] created: ${sig()}`);

  return sig.on(() => {
    console.log(`[${name}] changed: ${sig()}`);
  });
};

const count = signal(0, { name: "count", use: [logger] });
```

### Built-in Plugins

**Persistor - Auto-save to localStorage:**

```tsx
import { persistor } from "rextive/plugins";

const persist = persistor({
  load: () => JSON.parse(localStorage.getItem("app") || "{}"),
  save: (args) => {
    const existing = JSON.parse(localStorage.getItem("app") || "{}");
    localStorage.setItem("app", JSON.stringify({ ...existing, ...args.values }));
  },
});

const theme = signal("dark", { use: [persist("theme")] });
```

**When - React to other signals:**

```tsx
import { when } from "rextive/plugins";

const refreshTrigger = signal(0);
const userData = signal(async () => fetchUser(), {
  use: [when(refreshTrigger, (sig) => sig.refresh())],
});

// Trigger refresh
refreshTrigger.set((n) => n + 1);
```

### Tags vs Plugins

| Feature | Tag | Plugin |
|---------|-----|--------|
| **Purpose** | Group signals | Extend behavior |
| **Iteration** | `forEach`, `map`, `size` | No iteration |
| **Batch ops** | `refreshAll`, `resetAll`, `staleAll`, `disposeAll` | N/A |
| **Lifecycle** | `onAdd`, `onDelete` | Cleanup function |

---

## Pattern 4: Generic Functions with `AnySignal`

Write functions that work with both mutable and computed signals:

```tsx
import { signal, AnySignal } from "rextive";

function logChanges<T>(s: AnySignal<T>, label: string) {
  s.on(() => console.log(`[${label}]`, s()));
}

// Works with any signal type
const count = signal(0);
const doubled = signal({ count }, ({ deps }) => deps.count * 2);

logChanges(count, "Counter");
logChanges(doubled, "Doubled");
```

### Type Narrowing

```tsx
import { is } from "rextive";

function maybeSet<T>(s: AnySignal<T>, value: T) {
  if (is(s, "mutable")) {
    s.set(value); // ✅ TypeScript knows it's mutable
  }
}
```

---

## Pattern 5: Component-Scoped State with useScope

```tsx
import { signal, useScope, rx } from "rextive/react";

function Counter() {
  const scope = useScope("counter", () => {
    const count = signal(0);
    const doubled = count.to((x) => x * 2);
    
    return {
      count,
      doubled,
      increment: () => count.set((c) => c + 1),
    };
  });

  return (
    <div>
      <p>Count: {rx(scope.count)}</p>
      <p>Doubled: {rx(scope.doubled)}</p>
      <button onClick={scope.increment}>+1</button>
    </div>
  );
}
```

### Key Features

| Feature | Description |
|---------|-------------|
| **Keyed caching** | Same key = same instance (handles StrictMode) |
| **Auto-dispose** | Signals inside factory are automatically disposed |
| **Args support** | `useScope(key, factory, [args])` - recreates when args change |

---

## Pattern 6: Effect-like Signal in Logic

Use a computed signal as an effect for side effects that need cleanup. Auto-disposes when the logic scope is disposed.

```tsx
import { signal, useScope } from "rextive/react";

function gameLogic() {
  const gameState = signal<"menu" | "playing">("menu");
  const timeLeft = signal(60);

  // Effect-like signal - auto-disposed with the logic scope
  signal(
    { state: gameState },
    ({ deps, onCleanup, safe }) => {
      if (deps.state !== "playing") return;

      const interval = setInterval(() => {
        // safe() avoids execution if signal is disposed
        safe(() => {
          timeLeft.set((t) => {
            if (t <= 1) {
              gameState.set("menu"); // Game over
              return 0;
            }
            return t - 1;
          });
        });
      }, 1000);

      // onCleanup runs when deps change or signal disposes
      onCleanup(() => clearInterval(interval));
    },
    { lazy: true, name: "game.timer" }
  );

  return { gameState, timeLeft };
}

// Component - no manual cleanup needed!
function Game() {
  const $game = useScope(gameLogic);
  // When component unmounts, all signals including the effect are disposed
  return <div>Time: {rx($game.timeLeft)}</div>;
}
```

### Key Takeaways

| Aspect | Description |
|--------|-------------|
| **Auto-dispose** | Signal disposed when logic scope is disposed (no manual cleanup) |
| **`safe()`** | Wrap state updates to avoid errors if signal is disposed mid-interval |
| **`onCleanup()`** | Runs when dependencies change OR when signal disposes |
| **`lazy: true`** | Effect only runs when accessed (recommended for effects) |

### When to Use

- ✅ Timers/intervals that depend on state
- ✅ WebSocket subscriptions
- ✅ Event listeners that need cleanup
- ✅ Any side effect tied to signal lifecycle

---

## Pattern 7: Tuple Setter with Computed Derived Values

Use `.tuple` to get both signal and setter separately, then compute derived values:

```tsx
import { signal } from "rextive";

function settingsLogic() {
  // Tuple pattern: get signal + setter separately
  const [difficulty, setDifficulty] = signal<"easy" | "medium" | "hard">("easy", {
    name: "settings.difficulty",
  }).tuple;

  // Computed derived from the signal - auto-updates when difficulty changes
  const wordsToComplete = signal(
    { difficulty },
    ({ deps }) =>
      deps.difficulty === "easy" ? 15 : deps.difficulty === "medium" ? 12 : 10,
    { name: "settings.wordsToComplete" }
  );

  const timeLimit = signal(
    { difficulty },
    ({ deps }) =>
      deps.difficulty === "easy" ? 120 : deps.difficulty === "medium" ? 90 : 60,
    { name: "settings.timeLimit" }
  );

  return {
    difficulty,      // Read-only signal
    setDifficulty,   // Setter function
    wordsToComplete, // Auto-computed from difficulty
    timeLimit,       // Auto-computed from difficulty
  };
}
```

### Usage

```tsx
const $settings = settingsLogic();

// Read values
$settings.difficulty();        // "easy"
$settings.wordsToComplete();   // 15
$settings.timeLimit();         // 120

// Change difficulty - derived values auto-update
$settings.setDifficulty("hard");
$settings.wordsToComplete();   // 10
$settings.timeLimit();         // 60
```

### Benefits

| Benefit | Description |
|---------|-------------|
| **Cleaner API** | `setDifficulty("hard")` instead of `difficulty.set("hard")` |
| **Auto-derived** | Computed values update automatically when source changes |
| **Controlled exposure** | Return read-only signal + setter separately |
| **Type safety** | Setter is properly typed to the signal's value type |

### Comparison

```tsx
// ❌ Without tuple - exposes full mutable signal
return {
  difficulty: signal("easy"),  // Consumer can call .set(), .reset(), etc.
};

// ✅ With tuple - controlled access
const [difficulty, setDifficulty] = signal("easy").tuple;
return {
  difficulty,     // Read-only (no .set exposed)
  setDifficulty,  // Controlled setter
};
```

---

## Pattern 8: Data Polling with Auto-Refresh

Use `context.refresh()` to implement automatic data polling. The refresh triggers a recomputation, which cancels the previous request (via `abortSignal`) and starts a new one.

### Basic Polling

```tsx
import { signal } from "rextive";

// Poll API every 10 seconds
const pollingData = signal(async ({ abortSignal, refresh }) => {
  // Schedule next refresh BEFORE the fetch
  // This ensures polling continues even if fetch fails
  setTimeout(refresh, 10 * 1000);

  const response = await fetch("/api/data", { signal: abortSignal });
  return response.json();
});
```

**How it works:**

1. Signal computes initially, fetching data and scheduling a refresh
2. After 10 seconds, `refresh()` is called
3. Previous computation is cancelled (abortSignal fires)
4. New computation starts, fetching fresh data
5. Cycle repeats

### Polling After Success

If you only want to poll after a successful fetch (not on errors):

```tsx
const pollingData = signal(async ({ abortSignal, refresh }) => {
  const response = await fetch("/api/data", { signal: abortSignal });
  const data = await response.json();

  // Only schedule next poll after successful fetch
  setTimeout(refresh, 10 * 1000);

  return data;
});
```

### Polling with Cleanup

For more control, schedule refresh after the promise settles:

```tsx
const pollingData = signal(async ({ abortSignal, refresh }) => {
  const result = fetch("/api/data", { signal: abortSignal })
    .then((res) => res.json());

  // Schedule next refresh after completion (success or failure)
  result.finally(() => {
    setTimeout(refresh, 10 * 1000);
  });

  return result;
});
```

### Conditional Polling

Poll only when certain conditions are met:

```tsx
const isActive = signal(true);
const userId = signal(123);

const userData = signal({ isActive, userId }, async ({ deps, abortSignal, refresh }) => {
  // Only poll when active
  if (deps.isActive) {
    setTimeout(refresh, 30 * 1000);
  }

  const response = await fetch(`/api/users/${deps.userId}`, {
    signal: abortSignal,
  });
  return response.json();
});

// Stop polling
isActive.set(false);

// Resume polling (triggers immediate refresh + schedules next)
isActive.set(true);
```

### Manual Refresh Control

Combine auto-polling with manual refresh:

```tsx
import { signal, useScope, rx, task } from "rextive/react";

function Dashboard() {
  const scope = useScope("dashboard", () => {
    const data = signal(async ({ abortSignal, refresh }) => {
      setTimeout(refresh, 60 * 1000); // Auto-refresh every minute

      const res = await fetch("/api/dashboard", { signal: abortSignal });
      return res.json();
    });

    return { data };
  });

  return (
    <div>
      {rx(() => {
        const state = task.from(scope.data);
        if (state.loading) return <Spinner />;
        return <DashboardView data={state.value} />;
      })}

      {/* Manual refresh button */}
      <button onClick={() => scope.data.refresh()}>
        Refresh Now
      </button>
    </div>
  );
}
```

### Key Points

| Aspect | Recommendation |
|--------|----------------|
| **Schedule timing** | Before fetch = continuous polling; After fetch = success-only polling |
| **Cancellation** | Always pass `abortSignal` to fetch - previous requests auto-cancel |
| **Error handling** | Use `finally` for reliable scheduling regardless of success/failure |
| **Stop polling** | Dispose the signal or use conditional logic |
| **Interval** | Consider server load; typical: 10s-60s for dashboards |

---

## Pattern 9: Logic Export Patterns

When creating logic modules, choose the appropriate export pattern based on consumer needs.

### Pattern A: Export Signal Only (Consumer Controls Read/Write)

Export the state signal and let consumers decide how to access fields. Consumers can use `focus.lens()` inside `rx()` for fine-grained reactivity on large states.

```tsx
import { signal, useScope, rx, inputValue } from "rextive/react";
import { focus } from "rextive/op";

// Logic: expose state signal
function formLogic() {
  const state = signal({
    username: "",
    password: "",
    error: "",
  });

  async function submit() {
    // validation and submission logic
  }

  return {
    state,  // Consumer controls read/write
    submit,
  };
}

// Component: use lens inside rx() for fine-grained updates
function LoginForm() {
  const $form = useScope(formLogic);

  return (
    <form onSubmit={(e) => { e.preventDefault(); $form.submit(); }}>
      {rx(() => {
        // Create lens inside rx() - cheap, disposed per render
        const [get, set] = focus.lens($form.state, "username").map(inputValue);
        return <input value={get()} onChange={set} />;
      })}
      
      {rx(() => {
        const [get, set] = focus.lens($form.state, "password").map(inputValue);
        return <input type="password" value={get()} onChange={set} />;
      })}
      
      {rx(() => {
        const error = $form.state().error;
        return error ? <p className="error">{error}</p> : null;
      })}
    </form>
  );
}
```

**When to use:**
- Consumer needs full control over read/write
- State is complex and benefits from `focus.lens()` for partial updates
- Simple API surface (just expose state)

### Pattern B: Export Getters/Setters Only (Controlled Access)

Export separate getter and setter functions when you want controlled access. This is easier to mock in tests.

```tsx
// Logic: expose controlled getters/setters
function userLogic() {
  const state = signal({ name: "", email: "" });

  return {
    // Controlled read
    getName: () => state().name,
    getEmail: () => state().email,
    
    // Controlled write (can include validation)
    setName: (v: string) => state.set((s) => ({ ...s, name: v.trim() })),
    setEmail: (v: string) => state.set((s) => ({ ...s, email: v.toLowerCase() })),
    
    // Derived read-only
    getDisplayName: () => state().name || state().email,
  };
}

// Component: use getters/setters directly
function UserProfile() {
  const $user = useScope(userLogic);

  return rx(() => (
    <div>
      <h2>{$user.getDisplayName()}</h2>
      <input 
        value={$user.getName()} 
        onChange={(e) => $user.setName(e.currentTarget.value)} 
      />
    </div>
  ));
}

// Test: easy to mock
describe("UserProfile", () => {
  it("displays user name", () => {
    const mockUser = {
      getName: vi.fn(() => "Test User"),
      setName: vi.fn(),
      getEmail: vi.fn(() => "test@example.com"),
      setEmail: vi.fn(),
      getDisplayName: vi.fn(() => "Test User"),
    };
    
    // Use mockUser in tests
  });
});
```

**When to use:**
- Logic needs to validate/transform on read or write
- Better testability with mockable functions
- Want to hide internal state structure

### ❌ Don't Export Lens Tuples

```tsx
// ❌ Bad: Lens tuples are hard to mock
function formLogic() {
  const state = signal({ username: "" });
  return {
    username: focus.lens(state, "username"),  // Hard to mock!
  };
}

// ✅ Good: Export signal (Pattern A)
return { state };

// ✅ Good: Export getters/setters (Pattern B)
return {
  getUsername: () => state().username,
  setUsername: (v: string) => state.set((s) => ({ ...s, username: v })),
};
```

### Summary

| Pattern | Export | Consumer | Testability | Use Case |
|---------|--------|----------|-------------|----------|
| **A: Signal** | `state` signal | Uses `focus.lens()` in `rx()` | Mock signal | Full control, large states |
| **B: Getters/Setters** | `getFoo`, `setFoo` | Calls functions | Mock functions | Controlled access, easy mocking |
| **❌ Lens** | Lens tuples | Destructure | Hard to mock | **Don't use** |

---

## Pattern 10: Async Action State

Handle async actions (form submit, API calls) with loading/error states.

### Naming Convention

Use `{action}State` for signals that track async action state:

```tsx
const loginState = useScope(() => signal<Promise<void>>());
const submitState = useScope(() => signal<Promise<Result>>());
const deleteState = useScope(() => signal<Promise<void>>());
```

### Pattern A: Logic-Level State (Shared)

When multiple parts of UI need to react to the same action:

```tsx
// logic/authLogic.ts
export const authLogic = logic("authLogic", () => {
  const user = signal<User | null>(null);
  const loginState = signal<Promise<void>>();  // Exposed for consumers
  
  async function login(credentials: Credentials) {
    const promise = (async () => {
      const result = await authApi.login(credentials);
      user.set(result.user);
    })();
    
    loginState.set(promise);
    return promise;
  }

  return {
    user,
    loginState,  // Consumers can track this
    login,
  };
});

// components/LoginForm.tsx
function LoginForm() {
  const $auth = authLogic();

  return rx(() => {
    const state = task.from($auth.loginState());
    
    return (
      <form onSubmit={(e) => {
        e.preventDefault();
        $auth.login({ email, password });
      }}>
        <button disabled={state?.loading}>
          {state?.loading ? "Logging in..." : "Login"}
        </button>
      </form>
    );
  });
}

// components/Header.tsx - ALSO reacts to login state
function Header() {
  const $auth = authLogic();

  return rx(() => {
    const state = task.from($auth.loginState());
    
    return (
      <header>
        {state?.loading && <Spinner size="sm" />}
        {rx(() => $auth.user() ? <Avatar /> : <GuestIcon />)}
      </header>
    );
  });
}
```

**When to use:**
- Multiple components need to show loading/error state
- Global actions (login, logout, sync)
- Action state is part of domain logic

### Pattern B: Component-Level State (Local)

When only one component handles the action:

```tsx
// logic/formLogic.ts - Logic exposes action only, no state
export function contactFormLogic() {
  async function submit(data: ContactData) {
    await api.sendContact(data);
  }

  return { submit };
}

// components/ContactForm.tsx
function ContactForm() {
  const $form = useScope(contactFormLogic);
  const submitState = useScope(() => signal<Promise<void>>());

  return rx(() => {
    const state = task.from(submitState());
    
    if (state?.value !== undefined) {
      return <SuccessMessage />;
    }
    
    return (
      <form onSubmit={(e) => {
        e.preventDefault();
        submitState.set($form.submit(formData));
      }}>
        {state?.error && <ErrorMessage error={state.error} />}
        
        <button disabled={state?.loading}>
          {state?.loading ? "Sending..." : "Send Message"}
        </button>
      </form>
    );
  });
}
```

**When to use:**
- Single component handles the action
- Action is UI-specific (form submit, modal confirm)
- Don't want to pollute logic with UI state

### Comparison

| Aspect | Pattern A: Logic-Level | Pattern B: Component-Level |
|--------|------------------------|---------------------------|
| State location | In logic | In component |
| Sharing | ✅ Multiple consumers | ❌ Single component |
| Logic complexity | Higher | Lower |
| Reusability | Action + state together | Action only, state separate |

---

## Pattern 11: Component Effects

**Component effects** allow logic to communicate with component-level concerns (refs, hooks, DOM, local state) while maintaining proper cleanup on unmount.

### The Problem

Logic should stay pure and framework-agnostic, but sometimes you need to:
- Auto-focus an input when game state changes
- Trigger animations when data updates
- Play sounds on specific events
- Scroll to an element when a list changes

These are **component concerns** (DOM, refs, hooks) that shouldn't live in pure logic.

### The Solution: Component Effect Pattern

Logic exposes methods that accept a callback from the component. The callback can access refs, hooks, and DOM, while logic handles the subscription lifecycle.

```tsx
import { signal, useScope } from "rextive/react";
import { useRef } from "react";

// ============================================================
// Logic: Expose component effects
// ============================================================
export function typingGameLogic() {
  const gameState = signal<"menu" | "playing" | "paused">("menu");
  const currentWord = signal("");
  const message = signal("");

  // ... game logic ...

  // Component effect: Subscribe to state changes
  function onStateChange(listener: (state: string) => void) {
    listener(gameState()); // Immediate call with current value
    return { dispose: gameState.on(() => listener(gameState())) };
  }

  // Component effect: Subscribe to word changes
  function onWordChange(listener: (word: string) => void) {
    listener(currentWord());
    return { dispose: currentWord.on(() => listener(currentWord())) };
  }

  // Component effect: Subscribe to messages
  function onMessage(listener: (msg: string, isCorrect: boolean) => void) {
    return {
      dispose: message.on(() => {
        const msg = message();
        if (msg) listener(msg, msg.includes("Great"));
      }),
    };
  }

  return {
    gameState,
    currentWord,
    message,
    startGame: () => gameState.set("playing"),
    // Component effects
    onStateChange,
    onWordChange,
    onMessage,
  };
}

// ============================================================
// Component: Bind component effects
// ============================================================
function TypingGame() {
  const $game = useScope(typingGameLogic);
  const inputRef = useRef<HTMLInputElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);

  // Effect 1: Auto-focus input when playing
  useScope($game.onStateChange, [
    (state) => {
      if (state === "playing") {
        inputRef.current?.focus();
      }
    },
  ]);

  // Effect 2: Animate word changes
  useScope($game.onWordChange, [
    (word) => {
      wordRef.current?.classList.add("animate-pop");
      setTimeout(() => wordRef.current?.classList.remove("animate-pop"), 200);
    },
  ]);

  // Effect 3: Shake on wrong answer
  useScope($game.onMessage, [
    (msg, isCorrect) => {
      if (!isCorrect) {
        wordRef.current?.classList.add("animate-shake");
        setTimeout(() => wordRef.current?.classList.remove("animate-shake"), 300);
      }
    },
  ]);

  return (
    <div>
      <div ref={wordRef}>{rx(() => $game.currentWord())}</div>
      <input ref={inputRef} />
    </div>
  );
}
```

### Pattern Structure

**In Logic:**

```tsx
function myLogic() {
  const state = signal("idle");

  // Component effect method
  function onStateChange(listener: (state: string) => void) {
    // 1. Immediate call with current value (optional)
    listener(state());
    
    // 2. Subscribe to future changes
    const unsubscribe = state.on(() => listener(state()));
    
    // 3. Return disposable for cleanup
    return { dispose: unsubscribe };
  }

  return {
    state,
    onStateChange, // Expose for components
  };
}
```

**In Component:**

```tsx
function MyComponent() {
  const $logic = useScope(myLogic);
  const ref = useRef<HTMLElement>(null);

  // Bind component effect
  useScope($logic.onStateChange, [
    (state) => {
      // Access refs, hooks, DOM, local state
      if (state === "active") {
        ref.current?.focus();
      }
    },
  ]);

  return <div ref={ref}>...</div>;
}
```

### Key Benefits

| Benefit | Description |
|---------|-------------|
| **Separation of concerns** | Logic stays pure, component handles DOM/UI |
| **Auto-cleanup** | `useScope` disposes on unmount automatically |
| **Stable callbacks** | `useScope` keeps args stable across renders |
| **Multiple effects** | One logic can expose many component effects |
| **Reusable** | Same logic, different component behaviors |

### Multiple Component Effects

One logic can expose multiple component effects for different concerns:

```tsx
export function gameLogic() {
  const score = signal(0);
  const lives = signal(3);
  const level = signal(1);

  return {
    // State
    score,
    lives,
    level,
    
    // Component effects (multiple!)
    onScoreChange: (listener: (score: number) => void) => ({
      dispose: score.on(() => listener(score())),
    }),
    
    onLivesChange: (listener: (lives: number) => void) => ({
      dispose: lives.on(() => listener(lives())),
    }),
    
    onLevelUp: (listener: (level: number) => void) => ({
      dispose: level.on((trigger) => {
        if (trigger() > level.peek()) listener(level());
      }),
    }),
  };
}
```

```tsx
function GameScreen() {
  const $game = useScope(gameLogic);
  const { playCoin, playHurt, playLevelUp } = useSound();

  // Effect 1: Play sound on score
  useScope($game.onScoreChange, [(score) => playCoin()]);

  // Effect 2: Play sound + shake on damage
  useScope($game.onLivesChange, [(lives) => {
    playHurt();
    document.body.classList.add("shake");
    setTimeout(() => document.body.classList.remove("shake"), 500);
  }]);

  // Effect 3: Show level up modal
  useScope($game.onLevelUp, [(level) => {
    playLevelUp();
    setShowLevelUpModal(true);
  }]);

  return ...;
}
```

### Naming Convention

| Pattern | Example | Description |
|---------|---------|-------------|
| **Event style** | `onStateChange`, `onMessage` | Mirrors React event handlers |
| **Return type** | `{ dispose: () => void }` | Compatible with `useScope` disposal |
| **Immediate call** | `listener(state())` first | Sync with current state |

### When to Use

| Use Case | Component Effect | Direct `.on()` in Component |
|----------|-----------------|----------------------------|
| Access refs/DOM | ✅ Use component effect | ❌ Leaks refs to logic |
| Play sounds/animations | ✅ Use component effect | ❌ Hard to test |
| Show modals/alerts | ✅ Use component effect | ❌ Couples logic to UI |
| Pure logic side effects | ❌ Keep in logic | ✅ Use `.on()` in logic |

### Comparison with Other Patterns

| Pattern | Logic → Component | Component → Logic |
|---------|------------------|-------------------|
| **Component Effect** | Logic exposes `onXxx(callback)` | Component provides callback |
| **Direct Signal Access** | Component reads signal | Component calls methods |
| **Props** | Parent passes to child | Child emits events up |

---

## Pattern Quick Reference

| Pattern | Use When | Example |
|---------|----------|---------|
| **Single value** | Simple state | `signal(0)` |
| **With equality** | Objects/arrays | `signal({...}, "shallow")` |
| **`.to()`** | Transform one signal | `count.to(x => x * 2)` |
| **Multiple deps** | Combine signals | `signal({ a, b }, ...)` |
| **`.pipe()`** | Chain operators | `count.pipe(filter(...), to(...))` |
| **Tags** | Group signals | `signal.tag()` |
| **Plugins** | Extend behavior | `{ use: [logger] }` |
| **Async** | Data fetching | `signal(async () => ...)` |
| **Polling** | Auto-refresh data | `signal(async ({ refresh }) => ...)` |
| **Effect-like signal** | Timers/intervals in logic | `signal({ state }, ({ onCleanup, safe }) => ...)` |
| **Tuple setter** | Controlled state + derived | `const [val, setVal] = signal(x).tuple` |
| **Export signal** | Consumer controls access | `return { state }` |
| **Export getters/setters** | Controlled access, easy mocking | `return { getName, setName }` |
| **Async state (logic)** | Shared action state | `loginState` in logic |
| **Async state (local)** | Single component action | `useScope(() => signal<Promise>())` |
| **Component effects** | Logic → component communication | `useScope($logic.onStateChange, [callback])` |

---

## Next Steps

- **[Error Handling](./ERROR_HANDLING.md)** - Error handling & tracing
- **[API Reference](./API_REFERENCE.md)** - Complete API documentation
- **[Operators](./OPERATORS.md)** - Full operators reference


