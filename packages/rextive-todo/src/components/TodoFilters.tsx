import { Fragment } from "react";
import { rx } from "rextive/react";
import type { TodoFilter } from "../types/todo";
import {
  filter,
  searchText,
  activeCount,
  completedCount,
  totalCount,
  clearCompleted,
} from "../store/todoStore";

const FILTERS: { value: TodoFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Done" },
];

export function TodoFilters() {
  return (
    <div className="todo-filters">
      <div className="filters-row">
        <div className="search-box">
          <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          {rx(() => (
            <input
              type="text"
              className="search-input"
              placeholder="Search todos..."
              value={searchText()}
              onChange={(e) => searchText.set(e.target.value)}
            />
          ))}
          {rx(() =>
            searchText() ? (
              <button className="search-clear" onClick={() => searchText.set("")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            ) : null
          )}
        </div>

        <div className="filter-buttons">
          {FILTERS.map((f) => (
            <Fragment key={f.value}>
              {rx(() => (
                <button
                  className={`filter-btn ${filter() === f.value ? "active" : ""}`}
                  onClick={() => filter.set(f.value)}
                >
                  {f.label}
                  <span className="filter-count">
                    {f.value === "all"
                      ? totalCount()
                      : f.value === "active"
                      ? activeCount()
                      : completedCount()}
                  </span>
                </button>
              ))}
            </Fragment>
          ))}
        </div>
      </div>

      <div className="filters-footer">
        {rx(() => (
          <span className="items-count">
            {activeCount()} item{activeCount() !== 1 ? "s" : ""} left
          </span>
        ))}
        {rx(() =>
          completedCount() > 0 ? (
            <button className="clear-completed-btn" onClick={clearCompleted}>
              Clear completed ({completedCount()})
            </button>
          ) : null
        )}
      </div>
    </div>
  );
}

