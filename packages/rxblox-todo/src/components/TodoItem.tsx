import { blox, rx, signal } from "rxblox";
import { Todo, removeTodo, toggleTodo, updateTodoText } from "../store/todos";

interface TodoItemProps {
  todo: Todo;
}

export const TodoItem = blox<TodoItemProps>(({ todo }) => {
  // Use signals instead of useState in blox components
  const editing = signal(false);
  const editText = signal("");

  const handleDoubleClick = () => {
    editing.set(true);
    editText.set(todo.text());
  };

  const handleSubmit = () => {
    const trimmed = editText().trim();
    if (trimmed) {
      updateTodoText(todo.id, trimmed);
      editing.set(false);
    } else {
      removeTodo(todo.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "Escape") {
      editText.set(todo.text());
      editing.set(false);
    }
  };

  const handleBlur = () => {
    handleSubmit();
  };

  return rx(() => {
    const completed = todo.completed();
    const text = todo.text();
    const isEditing = editing();
    const currentEditText = editText();
    const className = [completed && "completed", isEditing && "editing"]
      .filter(Boolean)
      .join(" ");

    return (
      <li className={className}>
        <div className="view">
          <input
            className="toggle"
            type="checkbox"
            checked={completed}
            onChange={() => toggleTodo(todo.id)}
          />
          <label onDoubleClick={handleDoubleClick}>{text}</label>
          <button className="destroy" onClick={() => removeTodo(todo.id)} />
        </div>
        {isEditing && (
          <input
            className="edit"
            value={currentEditText}
            onChange={(e) => editText.set(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            autoFocus
          />
        )}
      </li>
    );
  });
});
