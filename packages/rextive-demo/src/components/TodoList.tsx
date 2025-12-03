import { rx } from "rextive/react";
import { TodoItem } from "./TodoItem";
import { filteredTodos, searchText } from "../store/todoStore";

export function TodoList() {
  return (
    <div className="todo-list-container">
      {rx(() => {
        const todos = filteredTodos();
        const search = searchText();

        if (todos.length === 0) {
          return (
            <div className="todo-empty">
              <div className="todo-empty-icon">
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  opacity="0.3"
                >
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                  <rect x="9" y="3" width="6" height="4" rx="2" />
                  <line x1="9" y1="12" x2="15" y2="12" />
                  <line x1="9" y1="16" x2="15" y2="16" />
                </svg>
              </div>
              <p className="todo-empty-text">
                {search
                  ? "No matching todos found"
                  : "No todos yet. Add one above!"}
              </p>
            </div>
          );
        }

        return (
          <ul className="todo-list">
            {todos.map((todo) => (
              <TodoItem key={todo.id} todo={todo} />
            ))}
          </ul>
        );
      })}
    </div>
  );
}
