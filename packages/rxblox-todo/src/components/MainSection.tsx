import { blox, rx } from "rxblox";
import { todoStore } from "../store/todoStore";
import { TodoItem } from "./TodoItem";

export const MainSection = blox(function MainSection() {
  const toggleAllPart = rx(() => (
    <input
      id="toggle-all"
      className="toggle-all"
      type="checkbox"
      checked={todoStore.allCompleted()}
      onChange={todoStore.toggleAll}
    />
  ));
  const filteredTodosPart = rx(() => {
    const filter = todoStore.filter();
    const filteredTodos =
      filter === "all"
        ? todoStore.todos()
        : filter === "active"
        ? todoStore.activeTodos()
        : todoStore.completedTodos();

    return filteredTodos.map((todo) => <TodoItem key={todo.id} {...todo} />);
  });
  return (
    <>
      <section className="main">
        {toggleAllPart}
        <label htmlFor="toggle-all">Mark all as complete</label>
        <ul className="todo-list">{filteredTodosPart}</ul>
      </section>
    </>
  );
});
