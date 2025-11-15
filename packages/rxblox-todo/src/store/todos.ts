import { signal, MutableSignal } from "rxblox";

export type TodoFilter = "all" | "active" | "completed";

export interface Todo {
  id: string;
  text: MutableSignal<string>;
  completed: MutableSignal<boolean>;
}

// Create a signal for each todo to enable fine-grained reactivity
export function createTodo(text: string, completed = false): Todo {
  return {
    id: Math.random().toString(36).substring(7),
    text: signal(text),
    completed: signal(completed),
  };
}

// Todo list is also a signal
export const todos = signal<Todo[]>([]);

// Current filter
export const filter = signal<TodoFilter>("all");

// Computed signals for filtered todos
export const filteredTodos = signal(() => {
  const currentFilter = filter();
  const allTodos = todos();

  switch (currentFilter) {
    case "active":
      return allTodos.filter((todo) => !todo.completed());
    case "completed":
      return allTodos.filter((todo) => todo.completed());
    default:
      return allTodos;
  }
});

// Computed signal for active count
export const activeCount = signal(() => {
  return todos().filter((todo) => !todo.completed()).length;
});

// Computed signal for completed count
export const completedCount = signal(() => {
  return todos().filter((todo) => todo.completed()).length;
});

// Actions
export function addTodo(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;

  todos.set((prev) => [...prev, createTodo(trimmed)]);
}

export function removeTodo(id: string) {
  todos.set((prev) => prev.filter((todo) => todo.id !== id));
}

export function toggleTodo(id: string) {
  const todo = todos().find((t) => t.id === id);
  if (todo) {
    todo.completed.set(!todo.completed());
  }
}

export function updateTodoText(id: string, text: string) {
  const todo = todos().find((t) => t.id === id);
  if (todo) {
    todo.text.set(text);
  }
}

export function toggleAll() {
  const allCompleted = todos().every((todo) => todo.completed());
  todos().forEach((todo) => {
    todo.completed.set(!allCompleted);
  });
}

export function clearCompleted() {
  todos.set((prev) => prev.filter((todo) => !todo.completed()));
}

// Local storage persistence
const STORAGE_KEY = "rxblox-todos";

export function loadTodos() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      todos.set(
        data.map((item: { id: string; text: string; completed: boolean }) =>
          createTodo(item.text, item.completed)
        )
      );
    }
  } catch (error) {
    console.error("Failed to load todos:", error);
  }
}

export function saveTodos() {
  try {
    const data = todos().map((todo) => ({
      id: todo.id,
      text: todo.text(),
      completed: todo.completed(),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save todos:", error);
  }
}
