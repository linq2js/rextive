import React from "react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DevToolsPanel } from "./DevToolsPanel";
import { enableDevTools, disableDevTools } from "../devtools";
import { signal } from "../signal";
import { tag } from "../tag";

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

    await waitFor(() => {
      expect(screen.getByText("testSignal")).toBeInTheDocument();
    });
  });

  it("should show tags when devtools enabled", async () => {
    enableDevTools();
    tag<number>({ name: "testTag" });

    render(<DevToolsPanel />);
    fireEvent.click(screen.getByTitle("Expand"));

    // Switch to tags tab
    fireEvent.click(screen.getByText(/Tags/));

    await waitFor(() => {
      expect(screen.getByText("testTag")).toBeInTheDocument();
    });
  });

  it("should switch between tabs", () => {
    enableDevTools();
    render(<DevToolsPanel />);
    fireEvent.click(screen.getByTitle("Expand"));

    // Check all tabs exist
    expect(screen.getByText(/Signals/)).toBeInTheDocument();
    expect(screen.getByText(/Tags/)).toBeInTheDocument();
    expect(screen.getByText(/Events/)).toBeInTheDocument();
    expect(screen.getByText(/Chains/)).toBeInTheDocument();

    // Switch to Chains tab
    fireEvent.click(screen.getByText(/Chains/));

    // Should show chains empty state
    expect(
      screen.getByText("No chain reactions detected yet")
    ).toBeInTheDocument();
  });

  it("should show filter buttons in signals tab when enabled and expanded", () => {
    enableDevTools();
    signal(1, { name: "sig1" });
    signal({ sig1: signal(0) }, ({ deps }) => deps.sig1 * 2, { name: "sig2" });

    render(<DevToolsPanel />);

    // Expand panel to see filter buttons
    fireEvent.click(screen.getByTitle("Expand"));

    // Signals tab should show A (All), M (Mutable), C (Computed) filter buttons
    expect(screen.getByTitle("Show all signals")).toBeInTheDocument();
    expect(screen.getByTitle("Show mutable signals")).toBeInTheDocument();
    expect(screen.getByTitle("Show computed signals")).toBeInTheDocument();
  });
});
