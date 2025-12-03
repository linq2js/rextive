import { useEffect, useRef, useState } from "react";
import { TodoInput } from "./components/TodoInput";
import { TodoList } from "./components/TodoList";
import { TodoFilters } from "./components/TodoFilters";
import { SyncControls } from "./components/SyncControls";
import { ScopeTest } from "./components/ScopeTest";
import { ErrorDemo } from "./components/ErrorDemo";
import { CounterDemo } from "./components/CounterDemo";
import { FormEditor } from "./components/FormEditor";
import { PokemonSearch } from "./components/PokemonSearch";
import { initializeStore } from "./store/todoStore";
import "./App.css";

// Table of Contents data
const tocItems = [
  { id: "todo-demo", label: "📝 Todo Demo", desc: "CRUD with sync" },
  { id: "pokemon-demo", label: "🔍 Pokemon Search", desc: "debounce + task" },
  { id: "error-demo", label: "⚠️ Error Demo", desc: "Error boundaries" },
  { id: "counter-demo", label: "🔢 Counter Demo", desc: "Basic signals" },
  { id: "form-demo", label: "📋 Form Editor", desc: "Complex forms" },
  { id: "scope-demo", label: "🔬 Scope Test", desc: "useScope lifecycle" },
];

function TableOfContents() {
  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav className="toc-nav">
      <div className="toc-title">Quick Navigation</div>
      <div className="toc-links">
        {tocItems.map((item) => (
          <button
            key={item.id}
            className="toc-link"
            onClick={() => handleClick(item.id)}
          >
            <span className="toc-link-label">{item.label}</span>
            <span className="toc-link-desc">{item.desc}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      className={`back-to-top ${visible ? "visible" : ""}`}
      onClick={scrollToTop}
      aria-label="Back to top"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 15l-6-6-6 6" />
      </svg>
    </button>
  );
}

export function App() {
  const initializedRef = useRef(false);
  
  useEffect(() => {
    // Prevent double initialization in StrictMode
    if (initializedRef.current) return;
    initializedRef.current = true;
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

        <TableOfContents />

        <div id="todo-demo" className="todo-card">
          <h3 className="todo-card-title">📝 Todo Demo</h3>
          <SyncControls />
          <TodoInput />
          <TodoFilters />
          <TodoList />
        </div>

        <div id="pokemon-demo">
          <PokemonSearch />
        </div>

        <div id="error-demo">
          <ErrorDemo />
        </div>

        <div id="counter-demo">
          <CounterDemo />
        </div>

        <div id="form-demo">
          <FormEditor />
        </div>

        <div id="scope-demo">
          <ScopeTest />
        </div>

        <footer className="app-footer">
          <p>Built with Rextive signals</p>
        </footer>
      </main>

      <BackToTopButton />

      {/* DevTools rendered in separate root - see main.tsx */}
    </div>
  );
}
