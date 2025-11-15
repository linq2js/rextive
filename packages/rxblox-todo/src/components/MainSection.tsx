import { rx } from "rxblox";
import { filteredTodos, todos, toggleAll } from "../store/todos";
import { TodoItem } from "./TodoItem";

export function MainSection() {
  return rx(() => {
    const todoList = filteredTodos();
    const allTodos = todos();

    if (allTodos.length === 0) {
      return null;
    }

    const allCompleted = allTodos.every((todo) => todo.completed());

    return (
      <section className="main">
        <input
          id="toggle-all"
          className="toggle-all"
          type="checkbox"
          checked={allCompleted}
          onChange={toggleAll}
        />
        <label htmlFor="toggle-all">Mark all as complete</label>
        <ul className="todo-list">
          {todoList.map((todo) => (
            <TodoItem key={todo.id} todo={todo} />
          ))}
        </ul>
      </section>
    );
  });
}

