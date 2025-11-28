import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { signal } from "../signal";
import { tag } from "../tag";
import {
  enableDevTools,
  disableDevTools,
  isDevToolsEnabled,
  getSignals,
  getSignal,
  getTags,
  getTag,
  getStats,
  getSnapshot,
  onDevToolsEvent,
  clearHistory,
  reset,
} from "./index";

// Helper to flush microtasks (signal registration is deferred via queueMicrotask)
const flush = () => new Promise((resolve) => queueMicrotask(resolve));

describe("rextive/devtools", () => {
  beforeEach(() => {
    disableDevTools();
  });

  afterEach(() => {
    disableDevTools();
  });

  describe("enableDevTools / disableDevTools", () => {
    it("should enable devtools", () => {
      expect(isDevToolsEnabled()).toBe(false);

      enableDevTools();

      expect(isDevToolsEnabled()).toBe(true);
      expect(globalThis.__REXTIVE_DEVTOOLS__).toBeDefined();
    });

    it("should disable devtools", () => {
      enableDevTools();
      disableDevTools();

      expect(isDevToolsEnabled()).toBe(false);
      expect(globalThis.__REXTIVE_DEVTOOLS__).toBeUndefined();
    });

    it("should warn when enabling twice", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      enableDevTools();
      enableDevTools();

      expect(warnSpy).toHaveBeenCalledWith(
        "[rextive/devtools] DevTools already enabled"
      );

      warnSpy.mockRestore();
    });

    it("should accept options", () => {
      enableDevTools({
        maxHistory: 100,
        name: "my-app",
        logToConsole: false,
      });

      expect(isDevToolsEnabled()).toBe(true);
    });
  });

  describe("signal tracking", () => {
    beforeEach(() => {
      enableDevTools();
    });

    it("should track created signals", async () => {
      const sig = signal(0, { name: "counter" });
      await flush();

      expect(getSignals().size).toBe(1);
      expect(getSignal("counter")).toBeDefined();
      expect(getSignal("counter")?.signal).toBe(sig);
    });

    it("should track signal kind", async () => {
      const mutable = signal(0, { name: "mutable" });
      const computed = signal(
        { mutable },
        ({ deps }) => deps.mutable * 2,
        { name: "computed" }
      );
      await flush();

      expect(getSignal("mutable")?.kind).toBe("mutable");
      expect(getSignal("computed")?.kind).toBe("computed");
    });

    it("should mark disposed signals", async () => {
      const sig = signal(0, { name: "counter" });
      await flush();
      expect(getSignals().size).toBe(1);
      expect(getSignal("counter")?.disposed).toBe(false);

      sig.dispose();
      // Signal is still in registry but marked as disposed
      expect(getSignals().size).toBe(1);
      expect(getSignal("counter")).toBeDefined();
      expect(getSignal("counter")?.disposed).toBe(true);
      expect(getSignal("counter")?.disposedAt).toBeDefined();
    });

    it("should preserve disposed signal when new signal with same name is created", async () => {
      // Create and dispose a signal
      const sig1 = signal(0, { name: "counter" });
      await flush();
      sig1.dispose();
      expect(getSignal("counter")?.disposed).toBe(true);

      // Create a new signal with the same name
      const sig2 = signal(100, { name: "counter" });
      await flush();

      // The old disposed signal should be renamed
      expect(getSignal("counter (disposed)")?.disposed).toBe(true);
      expect(getSignal("counter (disposed)")?.signal).toBe(sig1);

      // The new signal should have the original name
      expect(getSignal("counter")?.disposed).toBe(false);
      expect(getSignal("counter")?.signal).toBe(sig2);
      expect(getSignal("counter")?.signal()).toBe(100);

      // Total should be 2
      expect(getSignals().size).toBe(2);
    });

    it("should track value history", async () => {
      const sig = signal(0, { name: "counter" });
      await flush();

      sig.set(1);
      sig.set(2);
      sig.set(3);

      const info = getSignal("counter");
      expect(info?.changeCount).toBe(3);
      expect(info?.history.length).toBe(3);
      expect(info?.history[0].value).toBe(3); // Most recent first
      expect(info?.history[1].value).toBe(2);
      expect(info?.history[2].value).toBe(1);
    });

    it("should limit history size", async () => {
      disableDevTools();
      enableDevTools({ maxHistory: 3 });

      const sig = signal(0, { name: "counter" });
      await flush();

      sig.set(1);
      sig.set(2);
      sig.set(3);
      sig.set(4);
      sig.set(5);

      const info = getSignal("counter");
      expect(info?.history.length).toBe(3);
      expect(info?.history[0].value).toBe(5);
      expect(info?.history[2].value).toBe(3);
    });
  });

  describe("tag tracking", () => {
    beforeEach(() => {
      enableDevTools();
    });

    it("should track created tags", () => {
      const myTag = tag<number>({ name: "myTag" });

      expect(getTags().size).toBe(1);
      expect(getTag("myTag")).toBeDefined();
      expect(getTag("myTag")?.tag).toBe(myTag);
    });

    it("should track signals in tags", async () => {
      const myTag = tag<number>({ name: "myTag" });
      const sig1 = signal(1, { name: "sig1", use: [myTag] });
      const sig2 = signal(2, { name: "sig2", use: [myTag] });
      await flush();

      const tagInfo = getTag("myTag");
      expect(tagInfo?.signals.size).toBe(2);
      expect(tagInfo?.signals.has("sig1")).toBe(true);
      expect(tagInfo?.signals.has("sig2")).toBe(true);

      // Signal should know about tag
      const sigInfo = getSignal("sig1");
      expect(sigInfo?.tags.has("myTag")).toBe(true);
    });

    it("should update when signal removed from tag", async () => {
      const myTag = tag<number>({ name: "myTag" });
      const sig = signal(1, { name: "sig", use: [myTag] });
      await flush();

      myTag.delete(sig);

      expect(getTag("myTag")?.signals.size).toBe(0);
      expect(getSignal("sig")?.tags.has("myTag")).toBe(false);
    });

    it("should update when signal disposed", async () => {
      const myTag = tag<number>({ name: "myTag" });
      const sig = signal(1, { name: "sig", use: [myTag] });
      await flush();

      sig.dispose();

      expect(getTag("myTag")?.signals.size).toBe(0);
    });
  });

  describe("events", () => {
    beforeEach(() => {
      enableDevTools();
    });

    it("should emit signal:create event", async () => {
      const listener = vi.fn();
      onDevToolsEvent(listener);

      signal(0, { name: "counter" });
      await flush();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "signal:create",
          signal: expect.objectContaining({ id: "counter" }),
        })
      );
    });

    it("should emit signal:change event", async () => {
      const listener = vi.fn();
      const sig = signal(0, { name: "counter" });
      await flush();

      onDevToolsEvent(listener);
      sig.set(5);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "signal:change",
          signalId: "counter",
          value: 5,
        })
      );
    });

    it("should emit signal:dispose event", async () => {
      const listener = vi.fn();
      const sig = signal(0, { name: "counter" });
      await flush();

      onDevToolsEvent(listener);
      sig.dispose();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "signal:dispose",
          signalId: "counter",
        })
      );
    });

    it("should emit tag events", async () => {
      const listener = vi.fn();
      onDevToolsEvent(listener);

      const myTag = tag<number>({ name: "myTag" });
      const sig = signal(1, { name: "sig", use: [myTag] });
      await flush();
      myTag.delete(sig);

      const events = listener.mock.calls.map((call) => call[0].type);
      expect(events).toContain("tag:create");
      expect(events).toContain("tag:add");
      expect(events).toContain("tag:remove");
    });

    it("should support unsubscribe", async () => {
      const listener = vi.fn();
      const unsubscribe = onDevToolsEvent(listener);

      signal(0, { name: "sig1" });
      await flush();
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      signal(0, { name: "sig2" });
      await flush();
      expect(listener).toHaveBeenCalledTimes(1); // Still 1, no new calls
    });
  });

  describe("getStats", () => {
    beforeEach(() => {
      enableDevTools();
    });

    it("should return correct statistics", async () => {
      const m1 = signal(1, { name: "m1" });
      const m2 = signal(2, { name: "m2" });
      const c1 = signal({ m1 }, ({ deps }) => deps.m1 * 2, { name: "c1" });
      const t1 = tag<number>({ name: "t1" });
      await flush();

      m1.set(10);
      m1.set(20);

      const stats = getStats();
      expect(stats.signalCount).toBe(3);
      expect(stats.mutableCount).toBe(2);
      expect(stats.computedCount).toBe(1);
      expect(stats.tagCount).toBe(1);
      expect(stats.totalChanges).toBe(2);
    });
  });

  describe("getSnapshot", () => {
    beforeEach(() => {
      enableDevTools();
    });

    it("should return current values", async () => {
      const count = signal(42, { name: "count" });
      const name = signal("Alice", { name: "name" });
      await flush();

      const snapshot = getSnapshot();
      expect(snapshot.count).toBe(42);
      expect(snapshot.name).toBe("Alice");
    });

    it("should handle errors gracefully", async () => {
      const failing = signal(
        () => {
          throw new Error("fail");
        },
        { name: "failing" }
      );
      await flush();

      const snapshot = getSnapshot();
      expect(snapshot.failing).toBe("[error reading value]");
    });
  });

  describe("clearHistory", () => {
    beforeEach(() => {
      enableDevTools();
    });

    it("should clear all signal history", async () => {
      const sig = signal(0, { name: "counter" });
      await flush();
      sig.set(1);
      sig.set(2);

      expect(getSignal("counter")?.history.length).toBe(2);

      clearHistory();

      expect(getSignal("counter")?.history.length).toBe(0);
      expect(getSignal("counter")?.changeCount).toBe(0);
    });
  });

  describe("reset", () => {
    beforeEach(() => {
      enableDevTools();
    });

    it("should clear all tracked data but keep devtools enabled", async () => {
      signal(0, { name: "sig" });
      tag<number>({ name: "tag" });
      await flush();

      expect(getSignals().size).toBe(1);
      expect(getTags().size).toBe(1);

      reset();

      expect(getSignals().size).toBe(0);
      expect(getTags().size).toBe(0);
      expect(isDevToolsEnabled()).toBe(true);
    });
  });

  describe("logToConsole option", () => {
    it("should log events when enabled", async () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      enableDevTools({ logToConsole: true, name: "test-app" });
      signal(0, { name: "counter" });
      await flush();

      expect(logSpy).toHaveBeenCalledWith(
        "[test-app]",
        "signal:create",
        expect.anything()
      );

      logSpy.mockRestore();
    });
  });
});

