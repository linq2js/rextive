# Disposable Shapes: Array vs Object

The `disposable()` function now supports **two shapes** for combining services: **array** and **object**.

## TL;DR

```typescript
// ✅ RECOMMENDED: Object shape - preserves property names
const services = disposable({
  auth: new AuthService(),
  api: new ApiService(),
});

services.auth.login();  // Clear, explicit
services.api.get();     // Easy to understand

// Array shape - merges all properties
const services = disposable([
  new AuthService(),
  new ApiService(),
]);

services.login();  // Flat, concise
services.get();    // But less clear where methods come from
```

---

## Object Shape (Recommended)

### Syntax

```typescript
disposable({
  propertyName: service,
  // ...more services
})
```

### Example

```typescript
const services = disposable({
  auth: new AuthService(),
  api: new ApiService(),
  storage: new StorageService(),
});

// Access services by name
services.auth.login('user@example.com', 'password');
services.api.get('/users');
services.storage.save('token', 'abc123');

// Dispose all (in reverse order: storage → api → auth)
services.dispose();
```

### Type Inference

```typescript
type Services = {
  auth: AuthService;
  api: ApiService;
  storage: StorageService;
  dispose: () => void;
};
```

### Benefits

- ✅ **Clear service boundaries** - Easy to see which service provides what
- ✅ **No naming conflicts** - Each service has its own namespace
- ✅ **Better TypeScript autocomplete** - IDE knows about service properties
- ✅ **Better code organization** - Services are explicitly named
- ✅ **Easier maintenance** - Adding/removing services doesn't affect others

### Best For

- Large applications with many services
- When services might have overlapping method names
- When you want explicit, self-documenting code
- Team projects where clarity is important

---

## Array Shape

### Syntax

```typescript
disposable([service1, service2, ...], options?)
```

### Example

```typescript
const services = disposable([
  new AuthService(),
  new ApiService(),
  new StorageService(),
], {
  merge: "error"  // Optional: throw on property conflicts
});

// All methods merged into flat object
services.login('user@example.com', 'password');  // From AuthService
services.get('/users');  // From ApiService
services.save('token', 'abc123');  // From StorageService

// Dispose all (in reverse order)
services.dispose();
```

### Type Inference

```typescript
type Services = {
  // All methods from all services merged
  login: (email: string, password: string) => void;
  logout: () => void;
  get: (path: string) => void;
  post: (path: string, data: any) => void;
  save: (key: string, value: any) => void;
  load: (key: string) => any;
  dispose: () => void;
};
```

### Benefits

- ✅ **Flat API surface** - Fewer dots in code
- ✅ **Concise** - Less verbose for simple use cases
- ✅ **Flexible merging** - Control how conflicts are handled

### Merge Strategies

```typescript
// Strategy 1: Overwrite (default)
disposable([s1, s2], { merge: "overwrite" });
// Later services overwrite earlier ones

// Strategy 2: Error on conflict
disposable([s1, s2], { merge: "error" });
// Throws if services have conflicting property names
```

### Best For

- Small, focused services with unique method names
- Utility libraries where flat API is preferred
- When you need backward compatibility
- Simple applications with few services

---

## Comparison Table

| Feature | Object Shape | Array Shape |
|---------|-------------|-------------|
| **Access Pattern** | `services.auth.login()` | `services.login()` |
| **Naming Conflicts** | Never (namespaced) | Possible (merged) |
| **Autocomplete** | Excellent | Good |
| **Code Clarity** | Very clear | Less clear |
| **Verbosity** | More dots | Fewer dots |
| **Type Safety** | Excellent | Good |
| **Best For** | Large apps | Small apps |

---

## Migration Guide

### From Array to Object Shape

**Before (Array):**

```typescript
const services = disposable([
  new AuthService(),
  new ApiService(),
]);

services.login('user@example.com', 'password');
services.get('/data');
```

**After (Object):**

```typescript
const services = disposable({
  auth: new AuthService(),
  api: new ApiService(),
});

services.auth.login('user@example.com', 'password');
services.api.get('/data');
```

### From Object to Array Shape

**Before (Object):**

```typescript
const services = disposable({
  auth: new AuthService(),
  api: new ApiService(),
});

services.auth.login('user@example.com', 'password');
services.api.get('/data');
```

**After (Array):**

```typescript
const services = disposable([
  new AuthService(),
  new ApiService(),
]);

services.login('user@example.com', 'password');
services.get('/data');
```

---

## Common Patterns

### Pattern 1: Object Shape with Nested Services

```typescript
function createAppServices() {
  // Create individual services
  const auth = new AuthService();
  const api = new ApiService(auth);
  const user = new UserService(auth, api);
  
  // Combine with object shape
  return disposable({ auth, api, user });
}

const app = createAppServices();

// Clear access patterns
app.auth.login('user@example.com', 'password');
app.api.get('/data');
app.user.loadProfile();

// Cleanup
app.dispose();
```

### Pattern 2: Array Shape for Utilities

```typescript
function createUtils() {
  return disposable([
    { log: console.log, dispose: () => {} },
    { save: (data) => localStorage.setItem('data', data), dispose: () => {} },
  ]);
}

const utils = createUtils();
utils.log('Hello');
utils.save('value');
```

### Pattern 3: Mixed - Object with Merged Sub-services

```typescript
const services = disposable({
  // Keep auth as separate service
  auth: new AuthService(),
  
  // Merge data-related services
  data: disposable([
    new ApiService(),
    new CacheService(),
    new StorageService(),
  ]),
});

services.auth.login();
services.data.get('/users');  // From merged services
services.data.cache('key');   // From merged services
```

---

## Best Practices

### ✅ DO

1. **Use object shape for large applications**
   ```typescript
   disposable({ auth, api, storage, analytics, ... })
   ```

2. **Use array shape for small utilities**
   ```typescript
   disposable([logger, validator])
   ```

3. **Be consistent within a project**
   - Pick one shape and stick with it

4. **Use meaningful property names (object shape)**
   ```typescript
   disposable({ auth, api, db })  // ✅ Clear
   disposable({ a, b, c })        // ❌ Unclear
   ```

5. **Use merge: "error" to catch conflicts (array shape)**
   ```typescript
   disposable([s1, s2], { merge: "error" })
   ```

### ❌ DON'T

1. **Don't mix shapes unnecessarily**
   ```typescript
   // ❌ Confusing
   const a = disposable({ auth });
   const b = disposable([api]);
   ```

2. **Don't use array shape with many services**
   ```typescript
   // ❌ Hard to track what comes from where
   disposable([s1, s2, s3, s4, s5, s6, s7, s8])
   ```

3. **Don't use object shape if you need flat API**
   ```typescript
   // If you want `utils.log()` not `utils.logger.log()`
   // Use array shape instead
   ```

---

## Real-World Example

```typescript
// Large React application
function createAppServices() {
  const auth = new AuthService();
  const api = new ApiService(auth);
  const storage = new StorageService();
  const analytics = new AnalyticsService(auth);
  const notifications = new NotificationService(auth, api);
  const todo = new TodoService(auth, api, storage);
  
  // Object shape: Clear service boundaries
  return disposable({
    auth,
    api,
    storage,
    analytics,
    notifications,
    todo,
  }, {
    onBefore: () => analytics.log('app:disposing'),
    onAfter: () => console.log('App services disposed'),
  });
}

// Usage in React
function App() {
  const services = useScope(() => createAppServices());
  
  return rx({ user: services.auth.user }, (awaited) => {
    if (!awaited.user) {
      return <LoginForm onLogin={services.auth.login} />;
    }
    
    return (
      <Dashboard
        todos={services.todo.todos}
        onAddTodo={services.todo.addTodo}
        onLogout={services.auth.logout}
      />
    );
  });
}
```

---

## Summary

- **Object shape** = Explicit, clear, scalable (recommended for most cases)
- **Array shape** = Concise, flat, good for small utilities
- Both shapes support the same disposal order (LIFO) and error handling
- Choose based on your application size and team preferences

