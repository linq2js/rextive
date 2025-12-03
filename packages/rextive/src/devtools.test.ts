import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { signal } from "./signal";
import { tag } from "./tag";
import type { DevTools } from "./types";
import { setHooks, resetHooks } from "./hooks";

describe("DevTools integration", () => {
  let devtools: DevTools;

  beforeEach(() => {
    devtools = {
      onSignalCreate: vi.fn(),
      onSignalDispose: vi.fn(),
      onSignalChange: vi.fn(),
      onTagCreate: vi.fn(),
      onTagAdd: vi.fn(),
      onTagRemove: vi.fn(),
    };
    setHooks({
      ...devtools,
      hasDevTools: () => true,
    });
  });

  afterEach(() => {
    resetHooks();
  });

  describe("signal lifecycle", () => {
    it("should call onSignalCreate when signal is created", () => {
      const sig = signal(0, { name: "counter" });

      expect(devtools.onSignalCreate).toHaveBeenCalledOnce();
      // Mutable signals have no deps (undefined)
      expect(devtools.onSignalCreate).toHaveBeenCalledWith(sig, undefined);
    });

    it("should call onSignalDispose when signal is disposed", () => {
      const sig = signal(0, { name: "counter" });

      sig.dispose();

      expect(devtools.onSignalDispose).toHaveBeenCalledOnce();
      expect(devtools.onSignalDispose).toHaveBeenCalledWith(sig);
    });

    it("should call onSignalChange when signal value changes", () => {
      const sig = signal(0, { name: "counter" });

      sig.set(5);

      expect(devtools.onSignalChange).toHaveBeenCalledOnce();
      expect(devtools.onSignalChange).toHaveBeenCalledWith(sig, 5);
    });

    it("should call onSignalChange for each value change", () => {
      const sig = signal(0);

      sig.set(1);
      sig.set(2);
      sig.set(3);

      expect(devtools.onSignalChange).toHaveBeenCalledTimes(3);
    });

    it("should not call onSignalChange if value is same", () => {
      const sig = signal(0);

      sig.set(0); // Same value

      expect(devtools.onSignalChange).not.toHaveBeenCalled();
    });
  });

  describe("computed signal lifecycle", () => {
    it("should call onSignalCreate for computed signals with deps", () => {
      const a = signal(1, { name: "a" });
      const doubled = signal({ a }, ({ deps }) => deps.a * 2, {
        name: "doubled",
      });

      expect(devtools.onSignalCreate).toHaveBeenCalledTimes(2);
      // Computed signals include their dependencies
      expect(devtools.onSignalCreate).toHaveBeenCalledWith(doubled, { a });
    });

    it("should call onSignalChange when computed value changes", () => {
      const a = signal(1, { name: "a" });
      const doubled = signal({ a }, ({ deps }) => deps.a * 2, {
        name: "doubled",
      });

      // Access to trigger initial computation
      doubled();

      // Clear mock to only track changes after initial
      vi.mocked(devtools.onSignalChange!).mockClear();

      a.set(5);
      doubled(); // Trigger recomputation

      expect(devtools.onSignalChange).toHaveBeenCalledWith(doubled, 10);
    });

    it("should call onSignalDispose for computed signals", () => {
      const a = signal(1);
      const doubled = signal({ a }, ({ deps }) => deps.a * 2);

      doubled.dispose();

      expect(devtools.onSignalDispose).toHaveBeenCalledWith(doubled);
    });
  });

  describe("tag lifecycle", () => {
    it("should call onTagCreate when tag is created", () => {
      const myTag = tag<number>({ name: "myTag" });

      expect(devtools.onTagCreate).toHaveBeenCalledOnce();
      expect(devtools.onTagCreate).toHaveBeenCalledWith(myTag);
    });

    it("should call onTagAdd when signal is added to tag", () => {
      const myTag = tag<number>({ name: "myTag" });
      const sig = signal(0, { use: [myTag] });

      expect(devtools.onTagAdd).toHaveBeenCalledOnce();
      expect(devtools.onTagAdd).toHaveBeenCalledWith(myTag, sig);
    });

    it("should call onTagRemove when signal is removed from tag", () => {
      const myTag = tag<number>({ name: "myTag" });
      const sig = signal(0, { use: [myTag] });

      myTag.delete(sig);

      expect(devtools.onTagRemove).toHaveBeenCalledOnce();
      expect(devtools.onTagRemove).toHaveBeenCalledWith(myTag, sig);
    });

    it("should call onTagRemove when signal is disposed", () => {
      const myTag = tag<number>({ name: "myTag" });
      const sig = signal(0, { use: [myTag] });

      sig.dispose();

      expect(devtools.onTagRemove).toHaveBeenCalledOnce();
      expect(devtools.onTagRemove).toHaveBeenCalledWith(myTag, sig);
    });

    it("should call onTagRemove for each signal when tag is cleared", () => {
      const myTag = tag<number>({ name: "myTag" });
      const sig1 = signal(1, { use: [myTag] });
      const sig2 = signal(2, { use: [myTag] });
      const sig3 = signal(3, { use: [myTag] });

      myTag.clear();

      expect(devtools.onTagRemove).toHaveBeenCalledTimes(3);
    });
  });

  describe("no devtools", () => {
    beforeEach(() => {
      resetHooks();
    });

    it("should not throw when devtools is undefined", () => {
      expect(() => {
        const sig = signal(0);
        sig.set(5);
        sig.dispose();
      }).not.toThrow();
    });

    it("should not throw for tags when devtools is undefined", () => {
      expect(() => {
        const myTag = tag<number>();
        const sig = signal(0, { use: [myTag] });
        myTag.delete(sig);
      }).not.toThrow();
    });
  });

  describe("partial devtools implementation", () => {
    it("should work with only some hooks implemented", () => {
      const partialDevtools = {
        onSignalCreate: vi.fn(),
        // Other hooks not implemented
      };
      setHooks({
        ...partialDevtools,
        hasDevTools: () => true,
      });

      expect(() => {
        const sig = signal(0);
        sig.set(5);
        sig.dispose();

        const myTag = tag<number>();
        const sig2 = signal(0, { use: [myTag] });
        myTag.delete(sig2);
      }).not.toThrow();

      expect(partialDevtools.onSignalCreate).toHaveBeenCalled();
    });
  });
});

