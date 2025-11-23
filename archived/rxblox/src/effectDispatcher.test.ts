import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  addEffect,
  globalEffectDispatcher,
  localEffectDispatcher,
  effectToken,
} from "./effectDispatcher";
import { effect } from "./effect";
import { signal } from "./signal";
import { withDispatchers } from "./dispatcher";

describe("effectDispatcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("defaultEffectDispatcher", () => {
    it("should create a default dispatcher", () => {
      const dispatcher = globalEffectDispatcher();
      expect(dispatcher).toBeDefined();
      expect(typeof dispatcher.add).toBe("function");
      expect(typeof dispatcher.run).toBe("function");
      expect(typeof dispatcher.clear).toBe("function");
    });

    it("should run effects immediately when added", () => {
      const dispatcher = globalEffectDispatcher();
      const effectFn = vi.fn();

      const effectImpl = {
        run: () => {
          effectFn();
          return () => {};
        },
      };

      dispatcher.add(effectImpl);

      expect(effectFn).toHaveBeenCalledTimes(1);
    });

    it("should return no-op cleanup from add", () => {
      const dispatcher = globalEffectDispatcher();
      const effectImpl = {
        run: () => () => {},
      };

      const cleanup = dispatcher.add(effectImpl);
      expect(typeof cleanup).toBe("function");

      // Calling cleanup should not throw
      expect(() => cleanup()).not.toThrow();
    });

    it("should return no-op cleanup from run", () => {
      const dispatcher = globalEffectDispatcher();
      const cleanup = dispatcher.run();

      expect(typeof cleanup).toBe("function");
      expect(() => cleanup()).not.toThrow();
    });

    it("should do nothing when clear is called", () => {
      const dispatcher = globalEffectDispatcher();
      expect(() => dispatcher.clear()).not.toThrow();
    });
  });

  describe("effectDispatcher (collection)", () => {
    it("should create a collection dispatcher", () => {
      const dispatcher = localEffectDispatcher();
      expect(dispatcher).toBeDefined();
      expect(typeof dispatcher.add).toBe("function");
      expect(typeof dispatcher.run).toBe("function");
      expect(typeof dispatcher.clear).toBe("function");
    });

    it("should not run effects immediately when added", () => {
      const dispatcher = localEffectDispatcher();
      const effectFn = vi.fn();

      const effectImpl = {
        run: () => {
          effectFn();
          return () => {};
        },
      };

      dispatcher.add(effectImpl);

      expect(effectFn).not.toHaveBeenCalled();
    });

    it("should run all collected effects when run() is called", () => {
      const dispatcher = localEffectDispatcher();
      const effectFn1 = vi.fn();
      const effectFn2 = vi.fn();
      const effectFn3 = vi.fn();

      const effect1 = {
        run: () => {
          effectFn1();
          return () => {};
        },
      };
      const effect2 = {
        run: () => {
          effectFn2();
          return () => {};
        },
      };
      const effect3 = {
        run: () => {
          effectFn3();
          return () => {};
        },
      };

      dispatcher.add(effect1);
      dispatcher.add(effect2);
      dispatcher.add(effect3);

      dispatcher.run();

      expect(effectFn1).toHaveBeenCalledTimes(1);
      expect(effectFn2).toHaveBeenCalledTimes(1);
      expect(effectFn3).toHaveBeenCalledTimes(1);
    });

    it("should return cleanup function from run()", () => {
      const dispatcher = localEffectDispatcher();
      const cleanup1 = vi.fn();
      const cleanup2 = vi.fn();

      const effect1 = {
        run: () => cleanup1,
      };
      const effect2 = {
        run: () => cleanup2,
      };

      dispatcher.add(effect1);
      dispatcher.add(effect2);

      const cleanup = dispatcher.run();
      expect(typeof cleanup).toBe("function");

      cleanup();
      expect(cleanup1).toHaveBeenCalledTimes(1);
      expect(cleanup2).toHaveBeenCalledTimes(1);
    });

    it("should remove effect when cleanup from add() is called", () => {
      const dispatcher = localEffectDispatcher();
      const effectFn = vi.fn();

      const effectImpl = {
        run: () => {
          effectFn();
          return () => {};
        },
      };

      const removeEffect = dispatcher.add(effectImpl);
      removeEffect();

      dispatcher.run();
      expect(effectFn).not.toHaveBeenCalled();
    });

    it("should clear all effects", () => {
      const dispatcher = localEffectDispatcher();
      const effectFn = vi.fn();

      const effectImpl = {
        run: () => {
          effectFn();
          return () => {};
        },
      };

      dispatcher.add(effectImpl);
      dispatcher.clear();

      dispatcher.run();
      expect(effectFn).not.toHaveBeenCalled();
    });

    it("should not duplicate effects when added multiple times", () => {
      const dispatcher = localEffectDispatcher();
      const effectFn = vi.fn();

      const effectImpl = {
        run: () => {
          effectFn();
          return () => {};
        },
      };

      dispatcher.add(effectImpl);
      dispatcher.add(effectImpl);
      dispatcher.add(effectImpl);

      dispatcher.run();
      expect(effectFn).toHaveBeenCalledTimes(1); // Set ensures uniqueness
    });
  });

  describe("withDispatchers", () => {
    it("should execute function and return result", () => {
      const dispatcher = localEffectDispatcher();
      const result = withDispatchers([effectToken(dispatcher)], () => {
        return 42;
      });

      expect(result).toBe(42);
    });

    it("should collect effects created during execution", () => {
      const dispatcher = localEffectDispatcher();
      const effectFn1 = vi.fn();
      const effectFn2 = vi.fn();

      withDispatchers([effectToken(dispatcher)], () => {
        effect(() => effectFn1());
        effect(() => effectFn2());
      });

      // Effects should not have run yet
      expect(effectFn1).not.toHaveBeenCalled();
      expect(effectFn2).not.toHaveBeenCalled();

      // Run collected effects
      dispatcher.run();
      expect(effectFn1).toHaveBeenCalled();
      expect(effectFn2).toHaveBeenCalled();
    });

    it("should restore previous dispatcher after execution", () => {
      const dispatcher1 = localEffectDispatcher();
      const dispatcher2 = localEffectDispatcher();
      const effectFn = vi.fn();

      withDispatchers([effectToken(dispatcher1)], () => {
        effect(() => effectFn());
      });

      withDispatchers([effectToken(dispatcher2)], () => {
        // Effects created here should go to dispatcher2
      });

      dispatcher1.run();
      expect(effectFn).toHaveBeenCalled();

      effectFn.mockClear();
      // Effects created outside should use default dispatcher (runs immediately)
      effect(() => effectFn());
      expect(effectFn).toHaveBeenCalled();
    });

    it("should restore dispatcher even if function throws", () => {
      const dispatcher = localEffectDispatcher();

      expect(() => {
        withDispatchers([effectToken(dispatcher)], () => {
          throw new Error("Test error");
        });
      }).toThrow("Test error");

      // Default dispatcher should be restored
      const effectFn = vi.fn();
      effect(() => effectFn()); // Should run immediately (default dispatcher)
      expect(effectFn).toHaveBeenCalled();
    });

    it("should handle nested dispatchers correctly", () => {
      const outerDispatcher = localEffectDispatcher();
      const innerDispatcher = localEffectDispatcher();
      const outerEffectFn = vi.fn();
      const innerEffectFn = vi.fn();

      withDispatchers([effectToken(outerDispatcher)], () => {
        effect(() => outerEffectFn());

        withDispatchers([effectToken(innerDispatcher)], () => {
          effect(() => innerEffectFn());
        });
      });

      outerDispatcher.run();
      expect(outerEffectFn).toHaveBeenCalled();
      expect(innerEffectFn).not.toHaveBeenCalled();

      innerDispatcher.run();
      expect(innerEffectFn).toHaveBeenCalled();
    });
  });

  describe("addEffect", () => {
    it("should add effect to current dispatcher", () => {
      const dispatcher = localEffectDispatcher();
      const effectFn = vi.fn();

      withDispatchers([effectToken(dispatcher)], () => {
        const effectImpl = {
          run: () => {
            effectFn();
            return () => {};
          },
        };
        addEffect(effectImpl);
      });

      expect(effectFn).not.toHaveBeenCalled();
      dispatcher.run();
      expect(effectFn).toHaveBeenCalled();
    });

    it("should use default dispatcher when no custom dispatcher is active", () => {
      const effectFn = vi.fn();

      const effectImpl = {
        run: () => {
          effectFn();
          return () => {};
        },
      };

      addEffect(effectImpl);
      expect(effectFn).toHaveBeenCalled(); // Default dispatcher runs immediately
    });
  });

  describe("integration with signals", () => {
    it("should run effects when signals change", () => {
      const dispatcher = localEffectDispatcher();
      const count = signal(0);
      const effectFn = vi.fn();

      withDispatchers([effectToken(dispatcher)], () => {
        effect(() => {
          effectFn(count());
        });
      });

      dispatcher.run();
      expect(effectFn).toHaveBeenCalledWith(0);

      effectFn.mockClear();
      count.set(1);
      expect(effectFn).toHaveBeenCalledWith(1);
    });

    it("should cleanup effects when cleanup is called", () => {
      const dispatcher = localEffectDispatcher();
      const count = signal(0);
      const effectFn = vi.fn();
      const cleanupFn = vi.fn();

      withDispatchers([effectToken(dispatcher)], () => {
        effect(() => {
          effectFn(count());
          return cleanupFn;
        });
      });

      const cleanup = dispatcher.run();
      expect(effectFn).toHaveBeenCalledWith(0);

      cleanup();
      count.set(1);
      expect(cleanupFn).toHaveBeenCalled();
      expect(effectFn).toHaveBeenCalledTimes(1); // Should not run again
    });
  });
});
