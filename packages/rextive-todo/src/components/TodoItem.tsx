import { useState, useRef, useEffect } from "react";
import { rx } from "rextive/react";
import type { Todo } from "../types/todo";
import { toggleTodo, deleteTodo, updateTodoText, offlineChanges } from "../store/todoStore";

interface TodoItemProps {
  todo: Todo;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return new Date(timestamp).toLocaleDateString();
}

export function TodoItem({ todo }: TodoItemProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSubmit = () => {
    const trimmed = editText.trim();
    if (trimmed) {
      updateTodoText(todo.id, trimmed);
      setEditing(false);
    } else {
      setEditText(todo.text);
      setEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "Escape") {
      setEditText(todo.text);
      setEditing(false);
    }
  };

  return rx(() => {
    const hasPendingChange = offlineChanges().some((c) => c.todoId === todo.id);
    
    const classNames = [
      "todo-item",
      todo.completed ? "completed" : "",
      editing ? "editing" : "",
      hasPendingChange ? "pending" : "",
    ].filter(Boolean).join(" ");

    return (
      <li className={classNames}>
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            className="todo-edit-input"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleSubmit}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <>
            <button
              className="todo-toggle"
              onClick={() => toggleTodo(todo.id)}
              aria-label={todo.completed ? "Mark as incomplete" : "Mark as complete"}
            >
              <span className="todo-checkbox">
                {todo.completed && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                )}
              </span>
            </button>
            <div className="todo-content" onDoubleClick={() => setEditing(true)}>
              <span className="todo-text">{todo.text}</span>
              <span className="todo-modified">
                {hasPendingChange ? "Local change • " : ""}
                Modified {formatRelativeTime(todo.modifiedAt)}
              </span>
            </div>
            {hasPendingChange && (
              <span className="todo-pending-badge" title="Pending sync">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              </span>
            )}
            <button
              className="todo-delete"
              onClick={() => deleteTodo(todo.id)}
              aria-label="Delete todo"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </>
        )}
      </li>
    );
  });
}
