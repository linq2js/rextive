# Naming Conventions

This guide covers naming conventions for all Rextive constructs to ensure consistent, readable, and maintainable code.

## Quick Reference

| Type | Postfix | Consumer Pattern | Example |
|------|---------|------------------|---------|
| Primitive | None | `signal()` | `count`, `filter`, `selectedId` |
| Boolean | `is` prefix | `isOpen()` | `isLoading`, `hasError` |
| Async | None | `task.from(signal())` or `wait()` | `user`, `products` |
| Task | `Task` | `signal()` directly → `TaskState` | `userTask`, `productsTask` |
| Dispatcher | Verb | `login(payload)` | `login`, `logout`, `addToCart` |
| Result (if needed) | `Result` | `task.from(loginResult())` | `loginResult` |
| Result as Task | `ResultTask` | `loginResultTask()` | `loginResultTask` |
| Logic definition | `Logic` | - | `authLogic`, `cartLogic` |
| Logic instance | `$` prefix | `$auth.user()` | `$auth`, `$cart` |

---

## Signal Naming

### Primitive/Simple Signals (No Postfix)

For simple state values, use descriptive names without postfixes:

```tsx
// ✅ GOOD - Clear, simple names
const count = signal(0);
const filter = signal("all");
const selectedId = signal<number | null>(null);
const currentPage = signal(1);
```

### Boolean Signals (`is`/`has` Prefix)

Boolean signals should use `is` or `has` prefix for clarity:

```tsx
// ✅ GOOD - Boolean prefixes
const isOpen = signal(false);
const isLoading = signal(true);
const hasError = signal(false);
const isAuthenticated = signal(false);

// ❌ BAD - Unclear boolean intent
const open = signal(false);
const loading = signal(true);
const error = signal(false);
```

### Async Signals (No Postfix)

Async signals that return Promises **do not need a postfix**. TypeScript guides consumers on how to access the value.

```tsx
// ✅ GOOD - No postfix for async signals
const user = signal({ userId }, async ({ deps, abortSignal }) => {
  return fetchUser(deps.userId, { signal: abortSignal });
});

const products = signal(async () => fetchProducts());
const orderHistory = signal({ userId }, async ({ deps }) => fetchOrders(deps.userId));
```

**Consumer usage:**

```tsx
// Option A: task.from() for manual state handling
rx(() => {
  const state = task.from(user()); // TypeScript shows it's a Promise
  if (state.loading) return <Spinner />;
  if (state.error) return <Error error={state.error} />;
  return <div>{state.value?.name}</div>;
});

// Option B: wait() for Suspense integration
rx(() => {
  const userData = wait(user()); // throws to Suspense/ErrorBoundary
  return <div>{userData.name}</div>;
});
```

**Rationale:** Async signals may evolve (e.g., add task operator later) without breaking consumers. Let types guide usage instead of naming.

### Task Signals (`Task` Postfix)

Signals wrapped with the `task()` operator **use `Task` postfix**. This indicates stale-while-revalidate behavior where `value` is always defined.

```tsx
import { task } from "rextive/op";

// Base async signal (no postfix)
const user = signal({ userId }, async ({ deps }) => fetchUser(deps.userId));

// Task-wrapped signal (Task postfix)
const userTask = user.pipe(task({ id: 0, name: "Loading..." }));
```

**Consumer usage - no `task.from()` needed:**

```tsx
rx(() => {
  const { loading, error, value } = userTask(); // value is ALWAYS defined
  return (
    <div>
      {loading && <Spinner />}
      <span>{value.name}</span> {/* Safe - never undefined */}
      {error && <Toast error={error} />}
    </div>
  );
});
```

### When to Use Task vs Async

| Use Case | Pattern | Consumer |
|----------|---------|----------|
| Accept `undefined` during loading | No postfix (async) | `task.from(signal())` |
| Suspense/ErrorBoundary | No postfix (async) | `wait(signal())` |
| Stale-while-revalidate | `Task` postfix | `signal()` directly |
| Guaranteed non-undefined value | `Task` postfix | `signal()` directly |

---

## Action Naming

Actions created via `signal.action()` or `.tuple` follow these conventions.

### Dispatcher (Verb Name)

Expose dispatchers with semantic verb names:

```tsx
const loginAction = signal.action<Credentials, User>(async (creds) => {
  return authApi.login(creds);
});

// ✅ GOOD - Semantic verb names for dispatchers
export const login = loginAction.dispatch;
export const logout = logoutAction.dispatch;
export const addToCart = cartAction.dispatch;
export const refresh = refreshAction.dispatch;
export const submitOrder = orderAction.dispatch;
```

### Action Results (Only Expose When Needed)

**Default behavior:** Don't expose results - just use `await dispatch()`:

```tsx
// Most common pattern - no result signal needed
const handleSubmit = async () => {
  try {
    const user = await $auth.login(credentials);
    navigate('/dashboard');
  } catch (error) {
    setLocalError(error);
  }
};
```

**When to expose results:**

- Multiple unrelated components need to react to the action state
- You need to show loading/error in a different component than where dispatch is called
- Building a dashboard/status page that monitors all actions

**Result naming:**

| Result Type | Naming | Consumer Pattern |
|-------------|--------|------------------|
| Sync result | `loginResult` | `loginResult()` |
| Async result | `loginResult` | `task.from(loginResult())` |
| Task result | `loginResultTask` | `loginResultTask()` directly |

```tsx
export const authLogic = logic("authLogic", () => {
  const loginAction = signal.action<Credentials, User>(async (creds) => {
    const user = await authApi.login(creds);
    currentUser.set(user);
    return user;
  });

  return {
    // Dispatcher - always expose
    login: loginAction.dispatch,

    // Result - only expose if needed reactively
    loginResult: loginAction.result,
    
    // Or with task pattern for stale-while-revalidate
    loginResultTask: loginAction.result.pipe(task(null)),
  };
});
```

---

## Logic Naming

### Logic Definition (`Logic` Postfix)

Always use `Logic` postfix in the logic name string and export:

```tsx
// ✅ GOOD
export const authLogic = logic("authLogic", () => { ... });
export const cartLogic = logic("cartLogic", () => { ... });
export const checkoutLogic = logic("checkoutLogic", () => { ... });

// ❌ BAD - Missing Logic postfix
export const auth = logic("auth", () => { ... });
export const cart = logic("cart", () => { ... });
```

### File Naming

Use `Logic` postfix in file names:

```
✅ GOOD
src/logic/authLogic.ts
src/logic/cartLogic.ts
src/logic/checkout/shippingLogic.ts
src/logic/checkout/paymentLogic.ts

❌ BAD
src/logic/auth.ts
src/logic/cart.ts
src/logic/shipping.ts
```

### Consumer Convention (`$` Prefix)

When consuming logic instances, use `$` prefix to distinguish from local variables:

```tsx
// ✅ GOOD - Clear distinction with $ prefix
export function UserMenu() {
  const $auth = authLogic();
  const $cart = cartLogic();

  return rx(() => {
    const user = $auth.user();
    const itemCount = $cart.itemCount();
    return (
      <div>
        {user?.name} ({itemCount})
      </div>
    );
  });
}

// ❌ BAD - Ambiguous naming
export function UserMenu() {
  const auth = authLogic(); // Easy to confuse with local 'auth' object
  const cart = cartLogic();
  // ...
}
```

**When to use `$` prefix:**

- ✅ When storing the full logic instance: `const $auth = authLogic();`
- ❌ NOT when destructuring: `const { user, logout } = authLogic();`

**Mixed usage:**

```tsx
// ✅ GOOD - $prefix for full instance, no prefix for destructured
export function OrderReview() {
  const $shipping = shippingLogic();
  const $payment = paymentLogic();
  const { goToStep, prevStep } = checkoutLogic(); // Destructured actions

  return rx(() => {
    const info = $shipping.info();
    const method = $payment.method();
    // ...
  });
}
```

---

## Complete Example

Here's a complete logic example following all conventions:

```tsx
export const authLogic = logic("authLogic", () => {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STATE - Using naming conventions
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  // Primitive signals - no postfix
  const currentUser = signal<User | null>(null);
  
  // Boolean signals - is/has prefix
  const isRestoring = signal(true);
  const isLoginModalOpen = signal(false);
  
  // Async signals - no postfix (consumer uses task.from or wait)
  const profile = signal({ currentUser }, async ({ deps }) => {
    if (!deps.currentUser) return null;
    return fetchProfile(deps.currentUser.id);
  });
  
  // Task signals - Task postfix (consumer gets TaskState directly)
  const profileTask = profile.pipe(task({ avatar: "/default.png" }));
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ACTIONS - Verb names for dispatchers
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  const loginAction = signal.action<Credentials, User>(async (creds) => {
    const user = await authApi.login(creds);
    currentUser.set(user);
    return user;
  });

  const logoutAction = signal.action(async () => {
    await authApi.logout();
    currentUser.set(null);
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RETURN - Public API
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  return {
    // State
    currentUser,
    isRestoring,
    isLoginModalOpen,
    
    // Async (consumer uses task.from)
    profile,
    
    // Task (consumer gets TaskState directly)
    profileTask,
    
    // Dispatchers (verb names)
    login: loginAction.dispatch,
    logout: logoutAction.dispatch,
    openLoginModal: () => isLoginModalOpen.set(true),
    closeLoginModal: () => isLoginModalOpen.set(false),
    
    // Result (only if needed reactively elsewhere)
    loginResult: loginAction.result,
  };
});
```

**Consumer:**

```tsx
function UserMenu() {
  const $auth = authLogic(); // $ prefix for logic instance
  
  return rx(() => {
    // Task signal - direct access (value always defined)
    const { value: profile, loading } = $auth.profileTask();
    
    // Boolean signals - is prefix
    if ($auth.isRestoring()) return <Skeleton />;
    
    // Primitive signals
    const user = $auth.currentUser();
    
    if (!user) {
      return <button onClick={$auth.openLoginModal}>Sign In</button>;
    }
    
    return (
      <div>
        <img src={profile.avatar} />
        {loading && <RefreshIndicator />}
        <span>{user.name}</span>
        <button onClick={$auth.logout}>Logout</button>
      </div>
    );
  });
}
```

---

## Summary

1. **Primitive signals:** No postfix (`count`, `filter`, `selectedId`)
2. **Boolean signals:** `is`/`has` prefix (`isOpen`, `isLoading`, `hasError`)
3. **Async signals:** No postfix - let types guide usage
4. **Task signals:** `Task` postfix for stale-while-revalidate (`userTask`)
5. **Dispatchers:** Verb names (`login`, `logout`, `addToCart`)
6. **Results:** `Result` postfix only when needed (`loginResult`, `loginResultTask`)
7. **Logic:** `Logic` postfix in name, variable, and file
8. **Logic instances:** `$` prefix (`$auth`, `$cart`)

---

## Next Steps

- **[Logic](./LOGIC.md)** - Logic patterns and structure
- **[Patterns](./PATTERNS.md)** - Advanced usage patterns
- **[API Reference](./API_REFERENCE.md)** - Complete API documentation

