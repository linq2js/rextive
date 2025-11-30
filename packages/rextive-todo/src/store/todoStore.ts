import { signal, validate } from "rextive";
import { persistor } from "rextive/plugins";
import { debounce, to } from "rextive/operators";
import { z } from "zod";
import type { Todo, TodoFilter, OfflineChange } from "../types/todo";

// Generate unique ID
const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// ==================== PERSISTOR ====================

const STORAGE_KEY = "rextive-todo";
const numberTag = signal.tag<number>({ name: "numbers" });
const stringTag = signal.tag<string>({ name: "strings" });

type PersistedData = {
  offlineChanges: OfflineChange[];
  lastSyncTime: number | null;
};

const persist = persistor<PersistedData>({
  load: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  },
  save: (args) => {
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...existing, ...args.values })
      );
    } catch (error) {
      console.error("Failed to save to localStorage:", error);
    }
  },
  onError: (error, type) => {
    console.error(`Persistence ${type} failed:`, error);
  },
});

// ==================== SIGNALS ====================

// Test signals without names (auto-generated) - for testing DevTools "Show all" toggle
// These will appear as #mutable-X in devtools
const _tempSignal1 = signal(0, { use: [numberTag] }); // #mutable-X
const _tempSignal2 = signal("test", { use: [stringTag] }); // #mutable-X
const _tempComputed = signal(
  { _tempSignal1 },
  ({ deps }) => deps._tempSignal1 * 2
); // #computed-X

// Remote todos from server
export const remoteTodos = signal<Todo[]>([], { name: "remoteTodos" });

// Offline changes queue - persisted to localStorage
export const offlineChanges = signal<OfflineChange[]>([], {
  name: "offlineChanges",
  use: [persist("offlineChanges")],
});

// Current filter
export const filter = signal<TodoFilter>("all", {
  name: "filter",
});

// Search text
export const searchText = signal("", { name: "searchText", use: [stringTag] });

// Search text validation schema
// - Empty string is valid (no error shown)
// - Non-empty string must be at least 5 characters
const searchTextSchema = z
  .string()
  .refine((val) => val === "" || val.length >= 5, {
    message: "Search text must be at least 5 characters",
  });

// Validated search text - debounced and validated
export const searchTextValidated = searchText.pipe(
  debounce(300),
  to(
    validate(searchTextSchema.safeParse),
    // return first error message
    (x) => x.error?.errors?.[0]?.message
  )
);

// Sync status
export const syncStatus = signal<"idle" | "syncing" | "error">("idle", {
  name: "syncStatus",
});
export const lastSyncTime = signal<number | null>(null, {
  name: "lastSyncTime",
  use: [persist("lastSyncTime")],
});
export const syncError = signal<string | null>(null, { name: "syncError" });

// ==================== COMPUTED SIGNALS ====================

// Local todos: remote + pending creates - pending deletes + pending updates
export const localTodos = signal(
  { remoteTodos, offlineChanges },
  ({ deps }): Todo[] => {
    const remote = deps.remoteTodos;
    const changes = deps.offlineChanges;

    // Start with remote todos
    let todos = [...remote];

    // Apply offline changes
    for (const change of changes) {
      switch (change.type) {
        case "create": {
          // Add new todo if not already exists
          if (!todos.some((t) => t.id === change.todoId) && change.data) {
            todos.push({
              id: change.todoId,
              text: change.data.text || "",
              completed: change.data.completed || false,
              createdAt: change.data.createdAt || change.timestamp,
              modifiedAt: change.timestamp,
            });
          }
          break;
        }
        case "update": {
          // Update existing todo
          const index = todos.findIndex((t) => t.id === change.todoId);
          if (index !== -1 && change.data) {
            todos[index] = {
              ...todos[index],
              ...change.data,
              modifiedAt: change.timestamp,
            };
          }
          break;
        }
        case "delete": {
          // Remove todo
          todos = todos.filter((t) => t.id !== change.todoId);
          break;
        }
      }
    }

    // Sort by createdAt (most recently created first)
    return todos.sort((a, b) => b.createdAt - a.createdAt);
  },
  { name: "localTodos" }
);

// Filtered todos
export const filteredTodos = signal(
  { localTodos, filter, searchText },
  ({ deps }): Todo[] => {
    let todos = deps.localTodos;

    // Apply status filter
    switch (deps.filter) {
      case "active":
        todos = todos.filter((t) => !t.completed);
        break;
      case "completed":
        todos = todos.filter((t) => t.completed);
        break;
    }

    // Apply text search
    const search = deps.searchText.trim().toLowerCase();
    if (search) {
      todos = todos.filter((t) => t.text.toLowerCase().includes(search));
    }

    return todos;
  },
  { name: "filteredTodos" }
);

// Counts
export const totalCount = signal(
  { localTodos },
  ({ deps }) => deps.localTodos.length,
  { name: "totalCount" }
);
export const activeCount = signal(
  { localTodos },
  ({ deps }) => deps.localTodos.filter((t) => !t.completed).length,
  { name: "activeCount" }
);
export const completedCount = signal(
  { localTodos },
  ({ deps }) => deps.localTodos.filter((t) => t.completed).length,
  { name: "completedCount" }
);
export const pendingChangesCount = signal(
  { offlineChanges },
  ({ deps }) => deps.offlineChanges.length,
  { name: "pendingChangesCount" }
);

// ==================== ACTIONS ====================

export function addTodo(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const todoId = generateId();
  const change: OfflineChange = {
    id: generateId(),
    type: "create",
    todoId,
    data: {
      id: todoId,
      text: trimmed,
      completed: false,
      createdAt: Date.now(),
    },
    timestamp: Date.now(),
  };

  offlineChanges.set((prev) => [...prev, change]);
}

// Update stored modifiedAt when making offline changes
function updateStoredModifiedAt(todoId: string, timestamp: number): void {
  const map = loadModifiedAtMap();
  map[todoId] = timestamp;
  saveModifiedAtMap(map);
}

export function toggleTodo(id: string) {
  const todo = localTodos().find((t) => t.id === id);
  if (!todo) return;

  const timestamp = Date.now();
  const change: OfflineChange = {
    id: generateId(),
    type: "update",
    todoId: id,
    data: { completed: !todo.completed },
    timestamp,
  };

  offlineChanges.set((prev) => [...prev, change]);
  updateStoredModifiedAt(id, timestamp);
}

export function updateTodoText(id: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const timestamp = Date.now();
  const change: OfflineChange = {
    id: generateId(),
    type: "update",
    todoId: id,
    data: { text: trimmed },
    timestamp,
  };

  offlineChanges.set((prev) => [...prev, change]);
  updateStoredModifiedAt(id, timestamp);
}

export function deleteTodo(id: string) {
  const change: OfflineChange = {
    id: generateId(),
    type: "delete",
    todoId: id,
    timestamp: Date.now(),
  };

  offlineChanges.set((prev) => [...prev, change]);
}

export function clearCompleted() {
  const completed = localTodos().filter((t) => t.completed);
  const changes: OfflineChange[] = completed.map((todo) => ({
    id: generateId(),
    type: "delete" as const,
    todoId: todo.id,
    timestamp: Date.now(),
  }));

  offlineChanges.set((prev) => [...prev, ...changes]);
}

// ==================== SYNC ====================

// Storage key for random modifiedAt values
const MODIFIED_AT_KEY = "rextive-todo:modified-at";

// MirageJS server storage key
const SERVER_STORAGE_KEY = "rextive-todo:server-data";

// Load stored modifiedAt values
function loadModifiedAtMap(): Record<string, number> {
  try {
    const stored = localStorage.getItem(MODIFIED_AT_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// Save modifiedAt values
function saveModifiedAtMap(map: Record<string, number>): void {
  try {
    localStorage.setItem(MODIFIED_AT_KEY, JSON.stringify(map));
  } catch {
    // Ignore errors
  }
}

// Generate random modifiedAt within last 7 days
function generateRandomModifiedAt(): number {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  return sevenDaysAgo + Math.random() * (now - sevenDaysAgo);
}

// Apply stored or generate new modifiedAt values for todos
function applyModifiedAtValues(todos: Todo[]): Todo[] {
  const modifiedAtMap = loadModifiedAtMap();
  let updated = false;

  const result = todos.map((todo) => {
    if (modifiedAtMap[todo.id]) {
      // Use stored value
      return { ...todo, modifiedAt: modifiedAtMap[todo.id] };
    } else {
      // Generate new random value
      const randomModifiedAt = generateRandomModifiedAt();
      modifiedAtMap[todo.id] = randomModifiedAt;
      updated = true;
      return { ...todo, modifiedAt: randomModifiedAt };
    }
  });

  // Save if we generated new values
  if (updated) {
    saveModifiedAtMap(modifiedAtMap);
  }

  return result;
}

export async function syncPull() {
  try {
    console.log("syncPull");
    syncStatus.set("syncing");
    syncError.set(null);

    const response = await fetch("/api/todos");
    if (!response.ok) throw new Error("Failed to fetch todos");

    const todos: Todo[] = await response.json();
    // Apply stored or generate new modifiedAt values
    const todosWithModifiedAt = applyModifiedAtValues(todos);
    remoteTodos.set(todosWithModifiedAt);
    lastSyncTime.set(Date.now());
    syncStatus.set("idle");
  } catch (error) {
    syncStatus.set("error");
    syncError.set(error instanceof Error ? error.message : "Unknown error");
    throw error;
  }
}

// Background pull - doesn't show syncing status
async function backgroundPull() {
  try {
    const response = await fetch("/api/todos");
    if (!response.ok) return;

    const todos: Todo[] = await response.json();
    // Apply stored or generate new modifiedAt values
    const todosWithModifiedAt = applyModifiedAtValues(todos);
    remoteTodos.set(todosWithModifiedAt);
    lastSyncTime.set(Date.now());
  } catch {
    // Silently ignore background pull errors
  }
}

export async function syncPush() {
  const changes = offlineChanges();
  if (changes.length === 0) return;

  try {
    syncStatus.set("syncing");
    syncError.set(null);

    const response = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });

    if (!response.ok) throw new Error("Failed to sync changes");

    // Clear ALL offline changes after successful push
    // Server data becomes the source of truth
    offlineChanges.set([]);

    // Set status to idle immediately
    syncStatus.set("idle");
    lastSyncTime.set(Date.now());

    // Invalidate remote list in background (fire and forget)
    backgroundPull();
  } catch (error) {
    syncStatus.set("error");
    syncError.set(error instanceof Error ? error.message : "Unknown error");
    throw error;
  }
}

// Reset server to initial state
export async function resetServer() {
  // Clear all persisted data
  localStorage.removeItem(STORAGE_KEY);

  // Clear stored modifiedAt values (will regenerate on pull)
  localStorage.removeItem(MODIFIED_AT_KEY);

  // Clear MirageJS server data (will regenerate seed data)
  localStorage.removeItem(SERVER_STORAGE_KEY);

  location.reload();
}

// Initial pull on app start
export function initializeStore() {
  syncPull().catch(console.error);
}
