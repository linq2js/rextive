import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { logic } from "rextive";

// Cleanup after each test
afterEach(() => {
  cleanup();
  logic.clear(); // Clear all logic overrides and dispose tracked instances
});

