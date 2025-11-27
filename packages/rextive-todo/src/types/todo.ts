export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  modifiedAt: number;
}

export type TodoFilter = "all" | "active" | "completed";

export interface OfflineChange {
  id: string;
  type: "create" | "update" | "delete";
  todoId: string;
  data?: Partial<Todo>;
  timestamp: number;
}

