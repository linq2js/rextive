import { describe, it, expect } from "vitest";
import * as index from "./index";

describe("index exports", () => {
  it("should export signal", () => {
    expect(index.signal).toBeDefined();
    expect(typeof index.signal).toBe("function");
  });

  it("should export effect", () => {
    expect(index.effect).toBeDefined();
    expect(typeof index.effect).toBe("function");
  });

  it("should export rx", () => {
    expect(index.rx).toBeDefined();
    expect(typeof index.rx).toBe("function");
  });

  it("should export blox", () => {
    expect(index.blox).toBeDefined();
    expect(typeof index.blox).toBe("function");
  });

  it("should export provider", () => {
    expect(index.provider).toBeDefined();
    expect(typeof index.provider).toBe("function");
  });

  it("should export blox.onMount, blox.onRender, blox.onUnmount", () => {
    expect(index.blox.onMount).toBeDefined();
    expect(index.blox.onRender).toBeDefined();
    expect(index.blox.onUnmount).toBeDefined();
    expect(typeof index.blox.onMount).toBe("function");
    expect(typeof index.blox.onRender).toBe("function");
    expect(typeof index.blox.onUnmount).toBe("function");
  });

  it("should export blox.handle", () => {
    expect(index.blox.handle).toBeDefined();
    expect(typeof index.blox.handle).toBe("function");
  });
});

