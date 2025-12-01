# Service Pattern for Rextive

A comprehensive guide for creating reusable, composable services that work everywhere.

## Table of Contents
1. [Basic Service Pattern](#basic-service-pattern)
2. [Service with Signals](#service-with-signals)
3. [Combining Services](#combining-services)
4. [React Integration](#react-integration)
5. [Global Services](#global-services)
6. [Advanced Patterns](#advanced-patterns)

---

## Basic Service Pattern

### Simple Service Class

```typescript
import { signal, disposable } from 'rextive';
import type { Disposable } from 'rextive';

// Base service with state and methods
class CounterService implements Disposable {
  // Public state
  count = signal(0);
  
  // Derived state
  doubled = signal({ count: this.count }, ({ deps }) => deps.count * 2);
  
  // Methods
  increment = () => {
    this.count.set(prev => prev + 1);
  };
  
  decrement = () => {
    this.count.set(prev => prev - 1);
  };
  
  reset = () => {
    this.count.reset();
  };
  
  // Cleanup
  dispose() {
    this.count.dispose();
    this.doubled.dispose();
  }
}
```

### Service Factory Pattern

```typescript
// Factory function for creating services
function createCounterService(initialValue = 0) {
  const count = signal(initialValue);
  const doubled = signal({ count }, ({ deps }) => deps.count * 2);
  
  return {
    // State
    count,
    doubled,
    
    // Actions
    increment: () => count.set(prev => prev + 1),
    decrement: () => count.set(prev => prev - 1),
    reset: () => count.reset(),
    
    // Cleanup
    dispose: () => {
      count.dispose();
      doubled.dispose();
    },
  };
}

type CounterService = ReturnType<typeof createCounterService>;
```

---

## Service with Signals

### Async Service with Loading States

```typescript
import { signal, task } from 'rextive';
import type { Disposable } from 'rextive';

interface User {
  id: number;
  name: string;
  email: string;
}

class UserService implements Disposable {
  // Query parameters
  userId = signal<number>();
  
  // Data fetching with automatic loading states
  user = signal({ userId: this.userId }, async ({ deps, abortSignal }) => {
    if (!deps.userId) return null;
    
    const res = await fetch(`/api/users/${deps.userId}`, { signal: abortSignal });
    if (!res.ok) throw new Error('Failed to fetch user');
    return res.json() as Promise<User>;
  });
  
  // Actions
  loadUser = (id: number) => {
    this.userId.set(id);
  };
  
  updateUser = async (updates: Partial<User>) => {
    const current = await this.user();
    if (!current) return;
    
    const res = await fetch(`/api/users/${current.id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    
    if (res.ok) {
      // Trigger refetch
      this.user.reset();
    }
  };
  
  dispose() {
    this.userId.dispose();
    this.user.dispose();
  }
}
```

### Service with Side Effects

```typescript
class LoggerService implements Disposable {
  private unsubscribes: Array<() => void> = [];
  
  // Track events
  events = signal<Array<{ type: string; data: any }>>([]);
  
  constructor() {
    // Set up persistent effects
    this.setupLogging();
  }
  
  private setupLogging() {
    // Subscribe to events and clean up on dispose
    const unsub = this.events.on(() => {
      console.log('Events updated:', this.events().length);
    });
    
    this.unsubscribes.push(unsub);
  }
  
  log(type: string, data: any) {
    this.events.set(prev => [...prev, { type, data }]);
  }
  
  clear() {
    this.events.set([]);
  }
  
  dispose() {
    this.unsubscribes.forEach(fn => fn());
    this.events.dispose();
  }
}
```

---

## Combining Services

### Using `disposable()` to Combine Services

`disposable()` supports two shapes: **array** (merges properties) and **object** (preserves names).

#### Option 1: Object Shape (Recommended) - Preserves Property Names

```typescript
import { disposable } from 'rextive';

function createAppServices() {
  const auth = new AuthService();
  const api = new ApiService();
  const storage = new StorageService();
  
  // ✅ Object shape: Preserves property names
  return disposable({ auth, api, storage });
}

type AppServices = ReturnType<typeof createAppServices>;

// Usage:
const services = createAppServices();

// ✅ Access services by name
services.auth.login('user@example.com', 'password');
services.api.get('/users');
services.storage.save('key', 'value');

// Dispose all services at once (in reverse order)
services.dispose();
```

**Benefits:**
- ✅ Clear, explicit service names
- ✅ Better TypeScript autocomplete
- ✅ No naming conflicts
- ✅ Easy to understand which service provides what

#### Option 2: Array Shape - Merges All Properties

```typescript
// ⚠️ Array shape: Merges all properties from all services
function createAppServices() {
  const auth = new AuthService();
  const api = new ApiService();
  const storage = new StorageService();
  
  return disposable([auth, api, storage], {
    merge: "error", // Throw if services have conflicting properties
  });
}

// Usage:
const services = createAppServices();

// All methods are merged into one object
services.login('user@example.com', 'password');  // From auth
services.get('/users');  // From api
services.save('key', 'value');  // From storage

services.dispose();
```

**Use Cases for Array Shape:**
- When services have no property conflicts
- When you want a flat API surface
- For backward compatibility

**Use Cases for Object Shape:**
- When you want clear service boundaries (recommended)
- When services might have conflicting method names
- For better code organization and discoverability

### Nested Service Composition

```typescript
// High-level service that uses other services
class TodoService implements Disposable {
  constructor(
    private auth: AuthService,
    private api: ApiService,
    private storage: StorageService
  ) {}
  
  todos = signal<Todo[]>([]);
  
  loadTodos = async () => {
    if (!this.auth.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    const todos = await this.api.get<Todo[]>('/todos');
    this.todos.set(todos);
    this.storage.save('todos', todos);
  };
  
  addTodo = async (title: string) => {
    const newTodo = await this.api.post<Todo>('/todos', { title });
    this.todos.set(prev => [...prev, newTodo]);
  };
  
  dispose() {
    this.todos.dispose();
    // Note: Don't dispose injected dependencies here
  }
}

// Create composed service
function createTodoApp() {
  const auth = new AuthService();
  const api = new ApiService();
  const storage = new StorageService();
  const todo = new TodoService(auth, api, storage);
  
  return disposable([auth, api, storage, todo]);
}
```

---

## React Integration

### Using Services with `useScope`

```tsx
import { rx, useScope } from 'rextive/react';
import { createAppServices } from './services';

function App() {
  // Create services scoped to this component
  const services = useScope(() => createAppServices());
  
  return rx({ user: services.user }, (awaited) => {
    if (!awaited.user) {
      return <LoginForm onLogin={services.login} />;
    }
    
    return <Dashboard user={awaited.user} onLogout={services.logout} />;
  });
}
```

### Shared Services Across Components

```tsx
import { createContext, useContext } from 'react';
import { useScope } from 'rextive/react';

// Create context for services
const ServicesContext = createContext<AppServices | null>(null);

// Provider component
export function ServicesProvider({ children }: { children: React.ReactNode }) {
  const services = useScope(() => createAppServices());
  
  return (
    <ServicesContext.Provider value={services}>
      {children}
    </ServicesContext.Provider>
  );
}

// Hook to access services
export function useServices() {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('useServices must be used within ServicesProvider');
  return services;
}

// Usage in any component:
function TodoList() {
  const services = useServices();
  
  return rx({ todos: services.todos }, (awaited) => (
    <ul>
      {awaited.todos.map(todo => (
        <li key={todo.id}>{todo.title}</li>
      ))}
    </ul>
  ));
}
```

### Service Hook Pattern

```tsx
// Custom hook that creates and manages a service
function useCounterService(initialValue = 0) {
  return useScope(() => createCounterService(initialValue));
}

function Counter() {
  const counter = useCounterService(10);
  
  return rx({ count: counter.count }, (awaited) => (
    <div>
      <p>Count: {awaited.count}</p>
      <button onClick={counter.increment}>+</button>
      <button onClick={counter.decrement}>-</button>
      <button onClick={counter.reset}>Reset</button>
    </div>
  ));
}
```

---

## Global Services

### Singleton Pattern

```typescript
// Global singleton service
let globalServices: AppServices | null = null;

export function getGlobalServices(): AppServices {
  if (!globalServices) {
    globalServices = createAppServices();
  }
  return globalServices;
}

export function disposeGlobalServices() {
  if (globalServices) {
    globalServices.dispose();
    globalServices = null;
  }
}

// Usage:
const services = getGlobalServices();
services.login('user@example.com', 'password');

// Cleanup when app unmounts
disposeGlobalServices();
```

### Hybrid: Global + React Context

```tsx
// Global services with React integration
const globalServices = createAppServices();

function App() {
  useEffect(() => {
    // Initialize global services
    return () => {
      // Cleanup on unmount
      globalServices.dispose();
    };
  }, []);
  
  return (
    <ServicesContext.Provider value={globalServices}>
      <Router />
    </ServicesContext.Provider>
  );
}
```

---

## Advanced Patterns

### Service with Lifecycle Callbacks

```typescript
class DataService implements Disposable {
  private onDispose?: () => void;
  
  data = signal<Data[]>([]);
  
  constructor(options?: { onDispose?: () => void }) {
    this.onDispose = options?.onDispose;
  }
  
  load = async () => {
    const data = await fetch('/api/data').then(r => r.json());
    this.data.set(data);
  };
  
  dispose() {
    this.data.dispose();
    this.onDispose?.();
  }
}

// Usage with callback
const service = new DataService({
  onDispose: () => console.log('Service disposed!'),
});
```

### Service with Dependencies

```typescript
interface ServiceDeps {
  auth: AuthService;
  api: ApiService;
}

class FeatureService implements Disposable {
  private deps: ServiceDeps;
  
  constructor(deps: ServiceDeps) {
    this.deps = deps;
  }
  
  data = signal<Data[]>([]);
  
  load = async () => {
    if (!this.deps.auth.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    const data = await this.deps.api.get<Data[]>('/data');
    this.data.set(data);
  };
  
  dispose() {
    this.data.dispose();
  }
}

// Factory with dependency injection
function createFeatureService(deps: ServiceDeps) {
  return new FeatureService(deps);
}
```

### Service Registry Pattern

```typescript
class ServiceRegistry implements Disposable {
  private services = new Map<string, Disposable>();
  
  register<T extends Disposable>(name: string, service: T): T {
    this.services.set(name, service);
    return service;
  }
  
  get<T extends Disposable>(name: string): T {
    const service = this.services.get(name);
    if (!service) throw new Error(`Service not found: ${name}`);
    return service as T;
  }
  
  dispose() {
    // Dispose all services in reverse order
    const services = Array.from(this.services.values()).reverse();
    for (const service of services) {
      service.dispose();
    }
    this.services.clear();
  }
}

// Usage:
const registry = new ServiceRegistry();

registry.register('auth', new AuthService());
registry.register('api', new ApiService());
registry.register('storage', new StorageService());

// Access services
const auth = registry.get<AuthService>('auth');
auth.login('user@example.com', 'password');

// Cleanup all
registry.dispose();
```

### Lazy Service Initialization

```typescript
class LazyService<T extends Disposable> implements Disposable {
  private instance?: T;
  
  constructor(private factory: () => T) {}
  
  get(): T {
    if (!this.instance) {
      this.instance = this.factory();
    }
    return this.instance;
  }
  
  dispose() {
    this.instance?.dispose();
  }
}

// Usage:
const lazyAuth = new LazyService(() => new AuthService());

// Service is only created when accessed
const auth = lazyAuth.get();
auth.login('user@example.com', 'password');
```

---

## Best Practices

### ✅ DO:

1. **Always implement `Disposable`** for services with signals
2. **Use factory functions** for better type inference
3. **Use `disposable()`** to combine services
4. **Use `useScope()`** for React component-scoped services
5. **Use context** for sharing services across component tree
6. **Dispose in reverse order** when manually managing services

### ❌ DON'T:

1. **Don't forget to call `dispose()`** on services
2. **Don't dispose injected dependencies** (owner should dispose)
3. **Don't create services in render** (use `useScope` or `useMemo`)
4. **Don't mix global and scoped services** without clear ownership

---

## Complete Example

```typescript
// services/index.ts
import { disposable } from 'rextive';

export function createAppServices() {
  const auth = new AuthService();
  const api = new ApiService();
  const storage = new StorageService();
  const logger = new LoggerService();
  const todos = new TodoService(auth, api, storage);
  
  return disposable([auth, api, storage, logger, todos], {
    onBefore: () => logger.log('dispose', 'Disposing services...'),
    onAfter: () => console.log('All services disposed'),
  });
}

// App.tsx
import { ServicesProvider } from './contexts/ServicesContext';

function App() {
  return (
    <ServicesProvider>
      <Router />
    </ServicesProvider>
  );
}

// TodoPage.tsx
import { useServices } from './contexts/ServicesContext';
import { rx } from 'rextive/react';

function TodoPage() {
  const services = useServices();
  
  useEffect(() => {
    services.loadTodos();
  }, []);
  
  return rx({ todos: services.todos }, (awaited) => (
    <div>
      <h1>Todos</h1>
      <ul>
        {awaited.todos.map(todo => (
          <li key={todo.id}>{todo.title}</li>
        ))}
      </ul>
      <button onClick={() => services.addTodo('New todo')}>
        Add Todo
      </button>
    </div>
  ));
}
```

---

## Summary

This pattern provides:

- ✅ **Reusable** - Services work everywhere (React, global, tests)
- ✅ **Composable** - Combine services with `disposable()`
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Reactive** - Built on signals for automatic updates
- ✅ **Testable** - Easy to mock and test
- ✅ **Clean** - Automatic cleanup with `dispose()`

