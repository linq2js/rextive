import { rx } from "rxblox";
import {
  activeCount,
  completedCount,
  clearCompleted,
  filter,
  TodoFilter,
} from "../store/todos";

export function Footer() {
  const setFilter = (newFilter: TodoFilter) => {
    filter.set(newFilter);
  };

  return rx(() => {
    const active = activeCount();
    const completed = completedCount();
    const currentFilter = filter();

    return (
      <footer className="footer">
        <span className="todo-count">
          <strong>{active}</strong> {active === 1 ? "item" : "items"} left
        </span>
        <ul className="filters">
          <li>
            <a
              className={currentFilter === "all" ? "selected" : ""}
              onClick={() => setFilter("all")}
              style={{ cursor: "pointer" }}
            >
              All
            </a>
          </li>
          <li>
            <a
              className={currentFilter === "active" ? "selected" : ""}
              onClick={() => setFilter("active")}
              style={{ cursor: "pointer" }}
            >
              Active
            </a>
          </li>
          <li>
            <a
              className={currentFilter === "completed" ? "selected" : ""}
              onClick={() => setFilter("completed")}
              style={{ cursor: "pointer" }}
            >
              Completed
            </a>
          </li>
        </ul>
        {completed > 0 && (
          <button className="clear-completed" onClick={clearCompleted}>
            Clear completed
          </button>
        )}
      </footer>
    );
  });
}

