import { useEffect } from "react";
import { effect } from "rxblox";
import { Header } from "./components/Header";
import { MainSection } from "./components/MainSection";
import { Footer } from "./components/Footer";
import { loadTodos, saveTodos, todos } from "./store/todos";

export function App() {
  useEffect(() => {
    // Load todos from localStorage on mount
    loadTodos();

    // Save todos whenever they change
    const cleanup = effect(() => {
      todos(); // Track the todos signal
      saveTodos();
    }).run();

    return cleanup;
  }, []);

  return (
    <>
      <Header />
      <MainSection />
      <Footer />
    </>
  );
}

