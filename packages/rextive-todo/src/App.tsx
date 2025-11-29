import { useEffect } from "react";
import { DevToolsPanel } from "rextive/devtools/panel";
import { TodoInput } from "./components/TodoInput";
import { TodoList } from "./components/TodoList";
import { TodoFilters } from "./components/TodoFilters";
import { SyncControls } from "./components/SyncControls";
import { ScopeTest } from "./components/ScopeTest";
import { ErrorDemo } from "./components/ErrorDemo";
import { CounterDemo } from "./components/CounterDemo";
import { initializeStore } from "./store/todoStore";
import "./App.css";

export function App() {
  useEffect(() => {
    initializeStore();
  }, []);

  return (
    <div className="app">
      <div className="app-bg">
        <div className="bg-gradient" />
        <div className="bg-pattern" />
      </div>

      <main className="app-main">
        <header className="app-header">
          <div className="logo">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="10" fill="url(#gradient)" />
              <path
                d="M12 20L17 25L28 14"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="40" y2="40">
                  <stop stopColor="#6366f1" />
                  <stop offset="1" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
            <h1>Reactive Live Demo</h1>
          </div>
          <span className="subtitle">Signal-powered</span>
        </header>

        <div className="todo-card">
          <h3 className="todo-card-title">📝 Todo Demo</h3>
          <SyncControls />
          <TodoInput />
          <TodoFilters />
          <TodoList />
        </div>
        <ErrorDemo />

        <CounterDemo />

        <ScopeTest />

        <footer className="app-footer">
          <p>Built with Rextive signals</p>
        </footer>
      </main>

      {/* DevTools Panel - only in development */}
      {import.meta.env.DEV && <DevToolsPanel />}
    </div>
  );
}
