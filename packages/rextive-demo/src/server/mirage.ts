import { createServer, Model, Response } from "miragejs";
import type { Todo } from "../types/todo";

// Simulate network latency (2 seconds)
const LATENCY = 2000;

// localStorage key for server data
const SERVER_STORAGE_KEY = "rextive-demo:server-data";

// Fixed base timestamp for seed data (to ensure consistent ordering)
const SEED_BASE_TIME = 1700000000000; // Fixed point in time

// Initial seed data with fixed timestamps
function getSeedTodos(): Todo[] {
  return [
    {
      id: "1",
      text: "Learn Rextive signals",
      completed: true,
      createdAt: SEED_BASE_TIME - 86400000,
      modifiedAt: SEED_BASE_TIME - 86400000,
    },
    {
      id: "2",
      text: "Build offline-first todo app",
      completed: false,
      createdAt: SEED_BASE_TIME - 3600000,
      modifiedAt: SEED_BASE_TIME - 3600000,
    },
    {
      id: "3",
      text: "Implement sync mechanism",
      completed: false,
      createdAt: SEED_BASE_TIME,
      modifiedAt: SEED_BASE_TIME,
    },
  ];
}

// Load server data from localStorage
function loadServerData(): Todo[] {
  try {
    const stored = localStorage.getItem(SERVER_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load server data:", error);
  }
  // No stored data - create and persist seed data
  const seedData = getSeedTodos();
  saveServerData(seedData);
  return seedData;
}

// Save server data to localStorage
function saveServerData(todos: Todo[]): void {
  try {
    localStorage.setItem(SERVER_STORAGE_KEY, JSON.stringify(todos));
  } catch (error) {
    console.error("Failed to save server data:", error);
  }
}

// Reset server data to initial state
export function resetServerData(): void {
  localStorage.removeItem(SERVER_STORAGE_KEY);
}

export function makeServer() {
  return createServer({
    models: {
      todo: Model,
    },

    seeds(server) {
      // Load persisted data or use seed data
      const todos = loadServerData();
      todos.forEach((todo) => {
        server.create("todo", todo as object);
      });
    },

    routes() {
      this.namespace = "api";
      this.timing = LATENCY;

      // Allow external API requests to pass through
      this.passthrough("https://pokeapi.co/**");

      // Helper to persist current state
      const persistState = (schema: any) => {
        const todos = schema.all("todo").models.map((m: any) => m.attrs);
        saveServerData(todos);
      };

      // GET /api/todos - Fetch all todos
      this.get("/todos", (schema) => {
        return schema.all("todo").models;
      });

      // POST /api/todos - Create a new todo
      this.post("/todos", (schema, request) => {
        const attrs = JSON.parse(request.requestBody);
        const todo = schema.create("todo", {
          ...attrs,
          createdAt: Date.now(),
          modifiedAt: Date.now(),
        });
        persistState(schema);
        return todo.attrs;
      });

      // PUT /api/todos/:id - Update a todo
      this.put("/todos/:id", (schema, request) => {
        const id = request.params.id;
        const attrs = JSON.parse(request.requestBody);
        const todo = schema.find("todo", id);

        if (!todo) {
          return new Response(404, {}, { error: "Todo not found" });
        }

        todo.update({
          ...attrs,
          modifiedAt: Date.now(),
        });

        persistState(schema);
        return todo.attrs;
      });

      // DELETE /api/todos/:id - Delete a todo
      this.delete("/todos/:id", (schema, request) => {
        const id = request.params.id;
        const todo = schema.find("todo", id);

        if (!todo) {
          return new Response(404, {}, { error: "Todo not found" });
        }

        todo.destroy();
        persistState(schema);
        return new Response(204);
      });

      // POST /api/sync - Bulk sync changes from offline
      this.post("/sync", (schema, request) => {
        const changes = JSON.parse(request.requestBody);
        const results: { success: boolean; todoId: string; error?: string }[] =
          [];

        for (const change of changes) {
          try {
            switch (change.type) {
              case "create": {
                const todo = schema.create("todo", {
                  id: change.todoId,
                  ...change.data,
                  createdAt: change.data?.createdAt || Date.now(),
                  modifiedAt: Date.now(),
                });
                results.push({
                  success: true,
                  todoId: (todo.attrs as Todo).id as string,
                });
                break;
              }
              case "update": {
                const todo = schema.find("todo", change.todoId);
                if (todo) {
                  todo.update({
                    ...change.data,
                    modifiedAt: Date.now(),
                  });
                  results.push({ success: true, todoId: change.todoId });
                } else {
                  results.push({
                    success: false,
                    todoId: change.todoId,
                    error: "Not found",
                  });
                }
                break;
              }
              case "delete": {
                const todo = schema.find("todo", change.todoId);
                if (todo) {
                  todo.destroy();
                }
                results.push({ success: true, todoId: change.todoId });
                break;
              }
            }
          } catch (error) {
            results.push({
              success: false,
              todoId: change.todoId,
              error: String(error),
            });
          }
        }

        // Persist after all changes
        persistState(schema);

        return { results };
      });

      // POST /api/reset - Reset server to initial state
      this.post("/reset", (schema) => {
        // Delete all existing todos
        schema.all("todo").models.forEach((todo: any) => todo.destroy());

        // Recreate seed data
        const seedTodos = getSeedTodos();
        seedTodos.forEach((todo) => {
          schema.create("todo", todo as object);
        });

        // Clear localStorage
        resetServerData();

        return { success: true, message: "Server data reset to initial state" };
      });
    },
  });
}
