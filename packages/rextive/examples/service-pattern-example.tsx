/**
 * Complete Service Pattern Example
 * 
 * This example demonstrates:
 * - Creating reusable services with signals
 * - Combining multiple services
 * - Using services in React components
 * - Global vs scoped services
 */

import { signal, disposable } from 'rextive';
import { rx, useScope } from 'rextive/react';
import { createContext, useContext, useEffect } from 'react';
import type { Disposable } from 'rextive';

// =============================================================================
// 1. Define Service Interfaces
// =============================================================================

interface User {
  id: number;
  name: string;
  email: string;
}

interface Todo {
  id: number;
  userId: number;
  title: string;
  completed: boolean;
}

// =============================================================================
// 2. Create Individual Services
// =============================================================================

/**
 * Authentication Service
 * Manages user authentication state
 */
class AuthService implements Disposable {
  // State
  user = signal<User | null>(null);
  isAuthenticated = signal({ user: this.user }, ({ deps }) => !!deps.user);
  isLoading = signal(false);

  // Actions
  login = async (email: string, password: string) => {
    this.isLoading.set(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) throw new Error('Login failed');

      const user = await res.json();
      this.user.set(user);
    } finally {
      this.isLoading.set(false);
    }
  };

  logout = () => {
    this.user.set(null);
  };

  // Cleanup
  dispose() {
    this.user.dispose();
    this.isAuthenticated.dispose();
    this.isLoading.dispose();
  }
}

/**
 * API Service
 * Provides HTTP methods with automatic auth headers
 */
class ApiService implements Disposable {
  constructor(private auth: AuthService) {}

  private get headers() {
    const user = this.auth.user();
    return {
      'Content-Type': 'application/json',
      ...(user ? { Authorization: `Bearer ${user.id}` } : {}),
    };
  }

  async get<T>(path: string): Promise<T> {
    const res = await fetch(path, { headers: this.headers });
    if (!res.ok) throw new Error(`GET ${path} failed`);
    return res.json();
  }

  async post<T>(path: string, data: any): Promise<T> {
    const res = await fetch(path, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`POST ${path} failed`);
    return res.json();
  }

  async put<T>(path: string, data: any): Promise<T> {
    const res = await fetch(path, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`PUT ${path} failed`);
    return res.json();
  }

  async delete(path: string): Promise<void> {
    const res = await fetch(path, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!res.ok) throw new Error(`DELETE ${path} failed`);
  }

  dispose() {
    // No cleanup needed
  }
}

/**
 * Storage Service
 * Provides localStorage wrapper
 */
class StorageService implements Disposable {
  save<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to storage:', error);
    }
  }

  load<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Failed to load from storage:', error);
      return null;
    }
  }

  remove(key: string): void {
    localStorage.removeItem(key);
  }

  clear(): void {
    localStorage.clear();
  }

  dispose() {
    // No cleanup needed
  }
}

/**
 * Todo Service
 * Manages todo list with CRUD operations
 */
class TodoService implements Disposable {
  constructor(
    private auth: AuthService,
    private api: ApiService,
    private storage: StorageService
  ) {
    // Load cached todos on initialization
    const cached = storage.load<Todo[]>('todos');
    if (cached) {
      this.todos.set(cached);
    }

    // Subscribe to changes and persist to storage
    this.unsubscribe = this.todos.on(() => {
      this.storage.save('todos', this.todos());
    });
  }

  private unsubscribe: () => void;

  // State
  todos = signal<Todo[]>([]);
  isLoading = signal(false);
  filter = signal<'all' | 'active' | 'completed'>('all');

  // Derived state
  filteredTodos = signal(
    { todos: this.todos, filter: this.filter },
    ({ deps }) => {
      const todos = deps.todos;
      switch (deps.filter) {
        case 'active':
          return todos.filter(t => !t.completed);
        case 'completed':
          return todos.filter(t => t.completed);
        default:
          return todos;
      }
    }
  );

  activeCount = signal({ todos: this.todos }, ({ deps }) => {
    return deps.todos.filter(t => !t.completed).length;
  });

  // Actions
  loadTodos = async () => {
    if (!this.auth.isAuthenticated()) return;

    this.isLoading.set(true);
    try {
      const todos = await this.api.get<Todo[]>('/api/todos');
      this.todos.set(todos);
    } finally {
      this.isLoading.set(false);
    }
  };

  addTodo = async (title: string) => {
    const user = this.auth.user();
    if (!user) return;

    const newTodo = await this.api.post<Todo>('/api/todos', {
      title,
      userId: user.id,
      completed: false,
    });

    this.todos.set(prev => [...prev, newTodo]);
  };

  toggleTodo = async (id: number) => {
    const todo = this.todos().find(t => t.id === id);
    if (!todo) return;

    const updated = await this.api.put<Todo>(`/api/todos/${id}`, {
      ...todo,
      completed: !todo.completed,
    });

    this.todos.set(prev =>
      prev.map(t => (t.id === id ? updated : t))
    );
  };

  deleteTodo = async (id: number) => {
    await this.api.delete(`/api/todos/${id}`);
    this.todos.set(prev => prev.filter(t => t.id !== id));
  };

  setFilter = (filter: 'all' | 'active' | 'completed') => {
    this.filter.set(filter);
  };

  dispose() {
    this.unsubscribe();
    this.todos.dispose();
    this.isLoading.dispose();
    this.filter.dispose();
    this.filteredTodos.dispose();
    this.activeCount.dispose();
  }
}

// =============================================================================
// 3. Combine Services
// =============================================================================

export function createAppServices() {
  const auth = new AuthService();
  const api = new ApiService(auth);
  const storage = new StorageService();
  const todo = new TodoService(auth, api, storage);

  // ✅ Use object shape to preserve property names
  return disposable({ auth, api, storage, todo }, {
    onBefore: () => console.log('Disposing app services...'),
    onAfter: () => console.log('App services disposed'),
  });
}

export type AppServices = ReturnType<typeof createAppServices>;

// =============================================================================
// 4. React Context for Services
// =============================================================================

const ServicesContext = createContext<AppServices | null>(null);

export function ServicesProvider({ children }: { children: React.ReactNode }) {
  // Create services once for entire app
  const services = useScope(() => createAppServices());

  return (
    <ServicesContext.Provider value={services}>
      {children}
    </ServicesContext.Provider>
  );
}

export function useServices(): AppServices {
  const services = useContext(ServicesContext);
  if (!services) {
    throw new Error('useServices must be used within ServicesProvider');
  }
  return services;
}

// =============================================================================
// 5. React Components Using Services
// =============================================================================

function LoginForm() {
  const services = useServices();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    services.auth.login(email, password);
  };

  return rx({ isLoading: services.auth.isLoading }, (awaited) => (
    <form onSubmit={handleSubmit}>
      <h2>Login</h2>
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Password" required />
      <button type="submit" disabled={awaited.isLoading}>
        {awaited.isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  ));
}

function TodoList() {
  const services = useServices();

  useEffect(() => {
    services.todo.loadTodos();
  }, [services]);

  return rx(
    {
      todos: services.todo.filteredTodos,
      filter: services.todo.filter,
      activeCount: services.todo.activeCount,
      isLoading: services.todo.isLoading,
    },
    (awaited) => (
      <div>
        <h2>Todos</h2>

        {awaited.isLoading && <p>Loading...</p>}

        {/* Filter buttons */}
        <div>
          <button
            onClick={() => services.todo.setFilter('all')}
            disabled={awaited.filter === 'all'}
          >
            All
          </button>
          <button
            onClick={() => services.todo.setFilter('active')}
            disabled={awaited.filter === 'active'}
          >
            Active ({awaited.activeCount})
          </button>
          <button
            onClick={() => services.todo.setFilter('completed')}
            disabled={awaited.filter === 'completed'}
          >
            Completed
          </button>
        </div>

        {/* Todo list */}
        <ul>
          {awaited.todos.map(todo => (
            <li key={todo.id}>
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => services.todo.toggleTodo(todo.id)}
              />
              <span
                style={{
                  textDecoration: todo.completed ? 'line-through' : 'none',
                }}
              >
                {todo.title}
              </span>
              <button onClick={() => services.todo.deleteTodo(todo.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>

        {/* Add new todo */}
        <form
          onSubmit={e => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem('title') as HTMLInputElement;
            services.todo.addTodo(input.value);
            input.value = '';
          }}
        >
          <input name="title" placeholder="New todo..." required />
          <button type="submit">Add</button>
        </form>
      </div>
    )
  );
}

function Dashboard() {
  const services = useServices();

  return rx({ user: services.auth.user }, (awaited) => (
    <div>
      <header>
        <h1>Welcome, {awaited.user?.name}!</h1>
        <button onClick={services.auth.logout}>Logout</button>
      </header>

      <TodoList />
    </div>
  ));
}

// =============================================================================
// 6. Main App Component
// =============================================================================

export function App() {
  const services = useServices();

  return rx({ isAuthenticated: services.auth.isAuthenticated }, (awaited) => {
    if (!awaited.isAuthenticated) {
      return <LoginForm />;
    }

    return <Dashboard />;
  });
}

// Root component with provider
export function Root() {
  return (
    <ServicesProvider>
      <App />
    </ServicesProvider>
  );
}

// =============================================================================
// 7. Alternative: Global Singleton Pattern
// =============================================================================

// For non-React environments or global access
let globalServices: AppServices | null = null;

export function getGlobalServices(): AppServices {
  if (!globalServices) {
    globalServices = createAppServices();
  }
  return globalServices;
}

export function disposeGlobalServices(): void {
  if (globalServices) {
    globalServices.dispose();
    globalServices = null;
  }
}

// Usage outside React:
// const services = getGlobalServices();
// await services.auth.login('user@example.com', 'password');
// services.todo.loadTodos();

// =============================================================================
// 8. Testing Example
// =============================================================================

// Mock services for testing
export function createMockServices(): AppServices {
  const auth = new AuthService();
  const api = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    dispose: () => {},
  } as any;
  const storage = {
    save: vi.fn(),
    load: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    dispose: () => {},
  } as any;
  const todo = new TodoService(auth, api, storage);

  return disposable([auth, api, storage, todo]);
}

// Test example:
// const services = createMockServices();
// services.login('test@example.com', 'password');
// expect(services.isAuthenticated()).toBe(true);

