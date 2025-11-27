import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { makeServer } from "./server/mirage";
import { App } from "./App";

// Start MirageJS mock server
makeServer();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

