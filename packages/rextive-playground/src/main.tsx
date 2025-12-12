import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";

// Dynamic import to ensure devtools is enabled before signals/logics are created
async function bootstrap(preSetup?: () => void | Promise<void>) {
  await preSetup?.();

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
}

bootstrap(
  import.meta.env.DEV
    ? async () => {
        const { enableDevTools } = await import("rextive/devtools");
        const { DevToolsPanel } = await import("rextive/devtools-panel");

        enableDevTools({ name: "rextive-playground", logToConsole: false });
        const devtoolsRoot = document.createElement("div");
        devtoolsRoot.id = "rextive-devtools-root";
        document.body.appendChild(devtoolsRoot);
        createRoot(devtoolsRoot).render(<DevToolsPanel />);
      }
    : undefined
);
