import { describe, it, expect } from "vitest";
import { signalDispatcher, signalToken } from "./signalDispatcher";
import { signal } from "./signal";
import { getDispatcher, withDispatchers } from "./dispatcher";

describe("signalDispatcher", () => {
  describe("basic functionality", () => {
    it("should create a signal dispatcher", () => {
      const dispatcher = signalDispatcher();
      expect(dispatcher).toBeDefined();
      expect(typeof dispatcher.add).toBe("function");
      expect(typeof dispatcher.clear).toBe("function");
      expect(dispatcher.signals).toEqual([]);
    });

    it("should track signals when added", () => {
      const dispatcher = signalDispatcher();
      const s1 = signal(1);
      const s2 = signal(2);

      dispatcher.add(s1);
      dispatcher.add(s2);

      expect(dispatcher.signals).toContain(s1);
      expect(dispatcher.signals).toContain(s2);
      expect(dispatcher.signals.length).toBe(2);
    });

    it("should not duplicate signals when added multiple times", () => {
      const dispatcher = signalDispatcher();
      const s1 = signal(1);

      dispatcher.add(s1);
      dispatcher.add(s1);
      dispatcher.add(s1);

      expect(dispatcher.signals.length).toBe(1);
      expect(dispatcher.signals).toContain(s1);
    });

    it("should clear all signals", () => {
      const dispatcher = signalDispatcher();
      const s1 = signal(1);
      const s2 = signal(2);

      dispatcher.add(s1);
      dispatcher.add(s2);
      expect(dispatcher.signals.length).toBe(2);

      dispatcher.clear();
      expect(dispatcher.signals.length).toBe(0);
    });
  });

  describe("getDispatcher", () => {
    it("should return undefined when no dispatcher is active", () => {
      expect(getDispatcher(signalToken)).toBeUndefined();
    });

    it("should return the active dispatcher", () => {
      const dispatcher = signalDispatcher();

      withDispatchers([signalToken(dispatcher)], () => {
        expect(getDispatcher(signalToken)).toBe(dispatcher);
      });
    });
  });

  describe("withDispatchers", () => {
    it("should execute function and return result", () => {
      const dispatcher = signalDispatcher();
      const result = withDispatchers([signalToken(dispatcher)], () => {
        return 42;
      });

      expect(result).toBe(42);
    });

    it("should track signals accessed during execution", () => {
      const dispatcher = signalDispatcher();
      const s1 = signal(1);
      const s2 = signal(2);

      withDispatchers([signalToken(dispatcher)], () => {
        s1(); // Access signal - should be tracked
        s2(); // Access signal - should be tracked
      });

      expect(dispatcher.signals).toContain(s1);
      expect(dispatcher.signals).toContain(s2);
      expect(dispatcher.signals.length).toBe(2);
    });

    it("should restore previous dispatcher after execution", () => {
      const dispatcher1 = signalDispatcher();
      const dispatcher2 = signalDispatcher();

      withDispatchers([signalToken(dispatcher1)], () => {
        expect(getDispatcher(signalToken)).toBe(dispatcher1);

        withDispatchers([signalToken(dispatcher2)], () => {
          expect(getDispatcher(signalToken)).toBe(dispatcher2);
        });

        expect(getDispatcher(signalToken)).toBe(dispatcher1);
      });

      expect(getDispatcher(signalToken)).toBeUndefined();
    });

    it("should restore dispatcher even if function throws", () => {
      const dispatcher = signalDispatcher();

      expect(() => {
        withDispatchers([signalToken(dispatcher)], () => {
          throw new Error("Test error");
        });
      }).toThrow("Test error");

      expect(getDispatcher(signalToken)).toBeUndefined();
    });

    it("should handle nested dispatchers correctly", () => {
      const outerDispatcher = signalDispatcher();
      const innerDispatcher = signalDispatcher();
      const s1 = signal(1);
      const s2 = signal(2);

      withDispatchers([signalToken(outerDispatcher)], () => {
        s1(); // Should be tracked by outerDispatcher

        withDispatchers([signalToken(innerDispatcher)], () => {
          s2(); // Should be tracked by innerDispatcher
        });

        expect(outerDispatcher.signals).toContain(s1);
        expect(outerDispatcher.signals).not.toContain(s2);
        expect(innerDispatcher.signals).toContain(s2);
        expect(innerDispatcher.signals).not.toContain(s1);
      });
    });

    it("should not track signals accessed outside dispatcher context", () => {
      const dispatcher = signalDispatcher();
      const s1 = signal(1);

      s1(); // Access outside context - should not be tracked

      withDispatchers([signalToken(dispatcher)], () => {
        // Do nothing
      });

      expect(dispatcher.signals.length).toBe(0);
    });
  });

  describe("signal integration", () => {
    it("should track signals when read within dispatcher context", () => {
      const dispatcher = signalDispatcher();
      const count = signal(0);

      withDispatchers([signalToken(dispatcher)], () => {
        const value = count(); // Reading signal should add it to dispatcher
        expect(value).toBe(0);
      });

      expect(dispatcher.signals).toContain(count);
    });

    it("should track multiple signals accessed in computed expression", () => {
      const dispatcher = signalDispatcher();
      const a = signal(1);
      const b = signal(2);
      const c = signal(3);

      withDispatchers([signalToken(dispatcher)], () => {
        const result = a() + b() + c();
        expect(result).toBe(6);
      });

      expect(dispatcher.signals.length).toBe(3);
      expect(dispatcher.signals).toContain(a);
      expect(dispatcher.signals).toContain(b);
      expect(dispatcher.signals).toContain(c);
    });

    it("should not track signals accessed via peek()", () => {
      const dispatcher = signalDispatcher();
      const count = signal(0);

      withDispatchers([signalToken(dispatcher)], () => {
        count.peek(); // peek() should not add to dispatcher
      });

      expect(dispatcher.signals.length).toBe(0);
    });
  });
});

