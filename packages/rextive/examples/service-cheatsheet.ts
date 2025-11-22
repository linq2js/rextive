/**
 * Service Pattern Cheatsheet
 * Quick reference for common service patterns
 */

import { signal, disposable } from 'rextive';
import { rx, useScope } from 'rextive/react';
import type { Disposable } from 'rextive';

// =============================================================================
// Pattern 1: Basic Service (Factory Function)
// =============================================================================

function createCounterService(initial = 0) {
  const count = signal(initial);
  
  return {
    count,
    increment: () => count.set(prev => prev + 1),
    decrement: () => count.set(prev => prev - 1),
    reset: () => count.reset(),
    dispose: () => count.dispose(),
  };
}

// Usage:
const counter = createCounterService(10);
counter.increment();
counter.dispose();

// =============================================================================
// Pattern 2: Service Class
// =============================================================================

class UserService implements Disposable {
  userId = signal<number>();
  user = signal({ userId: this.userId }, async ({ deps }) => {
    if (!deps.userId) return null;
    const res = await fetch(`/api/users/${deps.userId}`);
    return res.json();
  });
  
  loadUser = (id: number) => this.userId.set(id);
  
  dispose() {
    this.userId.dispose();
    this.user.dispose();
  }
}

// Usage:
const userService = new UserService();
userService.loadUser(123);
userService.dispose();

// =============================================================================
// Pattern 3: Combine Multiple Services (Object Shape - Recommended)
// =============================================================================

function createAppServices() {
  const auth = new AuthService();
  const api = new ApiService();
  const user = new UserService(auth, api);
  
  // ✅ Object shape: Preserves property names
  return disposable({ auth, api, user });
}

// Usage:
const services = createAppServices();
services.auth.login('user@example.com', 'password'); // ✅ Clear service boundary
services.api.get('/data'); // ✅ Easy to see which service
services.user.loadUser(123); // ✅ Better autocomplete
services.dispose(); // Disposes all services

// =============================================================================
// Pattern 3b: Combine Multiple Services (Array Shape)
// =============================================================================

function createAppServicesFlat() {
  const auth = new AuthService();
  const api = new ApiService();
  const user = new UserService(auth, api);
  
  // Array shape: Merges all properties (use if no conflicts)
  return disposable([auth, api, user], { merge: "error" });
}

// Usage:
const flatServices = createAppServicesFlat();
flatServices.login('user@example.com', 'password'); // From auth
flatServices.get('/data'); // From api
flatServices.loadUser(123); // From user
flatServices.dispose(); // Disposes all services

// =============================================================================
// Pattern 4: React - Component Scoped Service
// =============================================================================

function MyComponent() {
  // Service scoped to this component (auto-disposed on unmount)
  const counter = useScope(() => createCounterService());
  
  return rx({ count: counter.count }, (awaited) => (
    <div>
      <p>{awaited.count}</p>
      <button onClick={counter.increment}>+</button>
    </div>
  ));
}

// =============================================================================
// Pattern 5: React - Shared Services via Context
// =============================================================================

import { createContext, useContext } from 'react';

const ServicesContext = createContext<AppServices | null>(null);

function ServicesProvider({ children }: { children: React.ReactNode }) {
  const services = useScope(() => createAppServices());
  return (
    <ServicesContext.Provider value={services}>
      {children}
    </ServicesContext.Provider>
  );
}

function useServices() {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('useServices must be within ServicesProvider');
  return services;
}

// Usage in any child component:
function TodoList() {
  const services = useServices();
  return rx({ todos: services.todos }, (awaited) => (
    <ul>
      {awaited.todos.map(todo => <li key={todo.id}>{todo.title}</li>)}
    </ul>
  ));
}

// =============================================================================
// Pattern 6: Global Singleton Service
// =============================================================================

let globalServices: AppServices | null = null;

export function getGlobalServices() {
  if (!globalServices) {
    globalServices = createAppServices();
  }
  return globalServices;
}

export function disposeGlobalServices() {
  globalServices?.dispose();
  globalServices = null;
}

// Usage:
const services = getGlobalServices();
services.login('user@example.com', 'password');

// Cleanup (e.g., on app unmount):
disposeGlobalServices();

// =============================================================================
// Pattern 7: Service with Dependency Injection
// =============================================================================

interface ServiceDeps {
  auth: AuthService;
  api: ApiService;
}

class TodoService implements Disposable {
  constructor(private deps: ServiceDeps) {}
  
  todos = signal<Todo[]>([]);
  
  loadTodos = async () => {
    if (!this.deps.auth.isAuthenticated()) return;
    const todos = await this.deps.api.get<Todo[]>('/todos');
    this.todos.set(todos);
  };
  
  dispose() {
    this.todos.dispose();
  }
}

// Usage:
const auth = new AuthService();
const api = new ApiService();
const todo = new TodoService({ auth, api });

// =============================================================================
// Pattern 8: Service with Lifecycle Callbacks
// =============================================================================

function createDataService() {
  const data = signal<Data[]>([]);
  const isLoading = signal(false);
  
  const load = async () => {
    isLoading.set(true);
    try {
      const result = await fetch('/api/data').then(r => r.json());
      data.set(result);
    } finally {
      isLoading.set(false);
    }
  };
  
  return disposable([
    {
      data,
      isLoading,
      load,
      dispose: () => {
        data.dispose();
        isLoading.dispose();
      }
    }
  ], {
    onBefore: () => console.log('Cleaning up...'),
    onAfter: () => console.log('Done!'),
  });
}

// =============================================================================
// Pattern 9: Service with Persistent State
// =============================================================================

function createPersistedService() {
  const data = signal<Data[]>([]);
  
  // Load from localStorage on init
  const cached = localStorage.getItem('data');
  if (cached) data.set(JSON.parse(cached));
  
  // Save to localStorage on change
  const unsub = data.on(() => {
    localStorage.setItem('data', JSON.stringify(data()));
  });
  
  return {
    data,
    dispose: () => {
      unsub();
      data.dispose();
    },
  };
}

// =============================================================================
// Pattern 10: Lazy Service Initialization
// =============================================================================

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
const auth = lazyAuth.get(); // Created on first access
auth.login('user@example.com', 'password');

// =============================================================================
// Quick Tips
// =============================================================================

// ✅ DO:
// - Always implement Disposable for services with signals
// - Use factory functions for better type inference
// - Use disposable() to combine services
// - Use useScope() for React component-scoped services
// - Use context for sharing services across component tree

// ❌ DON'T:
// - Don't forget to call dispose() on services
// - Don't dispose injected dependencies (owner should dispose)
// - Don't create services in render (use useScope or useMemo)
// - Don't mix global and scoped services without clear ownership

