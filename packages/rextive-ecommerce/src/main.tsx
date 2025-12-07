import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { enableDevTools } from "rextive/devtools";
import { DevToolsPanel } from "rextive/devtools-panel";
import "./index.css";

// Enable DevTools before any signals are created
enableDevTools({ name: "rextive-ecommerce", logToConsole: false });

// Dynamic import to ensure devtools is enabled before signals
async function bootstrap() {
  const { App } = await import("./App");

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );

  // Render DevTools in separate root
  const devtoolsRoot = document.createElement("div");
  devtoolsRoot.id = "rextive-devtools-root";
  document.body.appendChild(devtoolsRoot);
  createRoot(devtoolsRoot).render(<DevToolsPanel />);
}

bootstrap();
