import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DevToolsPanel } from "./DevToolsPanel";
import { enableDevTools, disableDevTools } from "../index";
import { signal } from "../../signal";
import { tag } from "../../tag";

describe("DevToolsPanel", () => {
  beforeEach(() => {
    disableDevTools();
    // Clear DevTools config from localStorage
    localStorage.removeItem("rextive-devtools-config");
  });

  afterEach(() => {
    disableDevTools();
    localStorage.removeItem("rextive-devtools-config");
  });

  it("should render panel header", () => {
    render(<DevToolsPanel />);

    // Should show Rextive title (rotated in left position when collapsed)
    // and expand button
    expect(screen.getByTitle("Expand")).toBeInTheDocument();
  });

  it("should toggle panel expansion", () => {
    enableDevTools();
    render(<DevToolsPanel />);

    // Panel should be collapsed initially - no tabs visible
    expect(screen.queryByText(/Signals/)).not.toBeInTheDocument();

    // Expand panel
    fireEvent.click(screen.getByTitle("Expand"));

    // Tabs should now be visible
    expect(screen.getByText(/Signals/)).toBeInTheDocument();

    // Collapse panel
    fireEvent.click(screen.getByTitle("Collapse"));

    // Tabs should be hidden again
    expect(screen.queryByText(/Signals/)).not.toBeInTheDocument();
  });

  it("should show warning when devtools not enabled", () => {
    render(<DevToolsPanel />);
    fireEvent.click(screen.getByTitle("Expand"));

    expect(screen.getByText("⚠️ DevTools not enabled")).toBeInTheDocument();
  });

  it("should show signals when devtools enabled", async () => {
    enableDevTools();
    signal(42, { name: "testSignal" });

    render(<DevToolsPanel />);
    fireEvent.click(screen.getByTitle("Expand"));

    // Wait for refresh
    await new Promise((resolve) => setTimeout(resolve, 600));

    expect(screen.getByText("testSignal")).toBeInTheDocument();
  });

  it("should show tags when devtools enabled", async () => {
    enableDevTools();
    tag<number>({ name: "testTag" });

    render(<DevToolsPanel />);
    fireEvent.click(screen.getByTitle("Expand"));

    // Switch to tags tab
    fireEvent.click(screen.getByText(/Tags/));

    // Wait for refresh
    await new Promise((resolve) => setTimeout(resolve, 600));

    expect(screen.getByText("testTag")).toBeInTheDocument();
  });

  it("should switch between tabs", () => {
    enableDevTools();
    render(<DevToolsPanel />);
    fireEvent.click(screen.getByTitle("Expand"));

    // Check all tabs exist
    expect(screen.getByText(/Signals/)).toBeInTheDocument();
    expect(screen.getByText(/Tags/)).toBeInTheDocument();
    expect(screen.getByText(/Events/)).toBeInTheDocument();
    expect(screen.getByText(/Stats/)).toBeInTheDocument();

    // Switch to stats tab
    fireEvent.click(screen.getByText(/Stats/));

    // Should show stats content
    expect(screen.getByText("Signals")).toBeInTheDocument();
    expect(screen.getByText("Mutable")).toBeInTheDocument();
    expect(screen.getByText("Computed")).toBeInTheDocument();
  });

  it("should show quick stats in header when enabled and expanded", () => {
    enableDevTools();
    signal(1, { name: "sig1" });
    signal({ sig1: signal(0) }, ({ deps }) => deps.sig1 * 2, { name: "sig2" });

    render(<DevToolsPanel />);

    // Expand panel to see stats badges (collapsed left drawer hides them)
    fireEvent.click(screen.getByTitle("Expand"));

    // Header should show M (mutable) and C (computed) badges
    expect(screen.getByText(/M \d/)).toBeInTheDocument();
    expect(screen.getByText(/C \d/)).toBeInTheDocument();
  });
});
