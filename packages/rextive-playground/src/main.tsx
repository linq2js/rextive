import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { DevToolsPanel } from "rextive/devtools-panel";
import "./index.css";

if (import.meta.env.DEV) {
  import("rextive/devtools").then(({ enableDevTools }) => {
    enableDevTools({ name: "rextive-playground", logToConsole: false });
  });
}

// Dynamic import to ensure devtools is enabled before signals/logics are created
async function bootstrap() {
  const { RouterProvider, createRouter } =
    await import("@tanstack/react-router");
  const { routeTree } = await import("./routeTree.gen");

  const router = createRouter({ routeTree });

  // Render main app
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  );

  // Render DevToolsPanel in a SEPARATE root (only in dev mode)
  if (import.meta.env.DEV) {
    const devtoolsRoot = document.createElement("div");
    devtoolsRoot.id = "rextive-devtools-root";
    document.body.appendChild(devtoolsRoot);
    createRoot(devtoolsRoot).render(<DevToolsPanel />);
  }
}

bootstrap();
