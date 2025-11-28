import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { enableDevTools } from "rextive/devtools";

// Enable devtools BEFORE any signals are created (must be before App import!)
enableDevTools({ name: "rextive-todo", logToConsole: false });

// Dynamic import to ensure devtools is enabled before signals are created
async function bootstrap() {
  // Start MirageJS mock server
  const { makeServer } = await import("./server/mirage");
  makeServer();

  // Now import App (which imports todoStore and creates signals)
  const { App } = await import("./App");

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

bootstrap();
