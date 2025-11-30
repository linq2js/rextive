import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { enableDevTools } from "rextive/devtools";
import { DevToolsPanel } from "rextive/devtools/panel";

// Enable devtools BEFORE any signals are created (must be before App import!)
enableDevTools({ name: "rextive-todo", logToConsole: false });

// Dynamic import to ensure devtools is enabled before signals are created
async function bootstrap() {
  // Start MirageJS mock server
  const { makeServer } = await import("./server/mirage");
  makeServer();

  // Now import App (which imports todoStore and creates signals)
  const { App } = await import("./App");

  // Render main app
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );

  // Render DevToolsPanel in a SEPARATE root (only in dev mode)
  // This isolates DevTools from the app's render cycle, preventing warnings
  if (import.meta.env.DEV) {
    const devtoolsRoot = document.createElement("div");
    devtoolsRoot.id = "rextive-devtools-root";
    document.body.appendChild(devtoolsRoot);
    createRoot(devtoolsRoot).render(<DevToolsPanel />);
  }
}

bootstrap();
