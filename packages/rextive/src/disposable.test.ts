import {
  disposable,
  DisposalAggregateError,
  wrapDispose,
  noop,
} from "./disposable";
import { describe, it, expect, vi } from "vitest";

describe("disposable", () => {
  describe("merge strategy: overwrite (default)", () => {
    it("should merge all properties from multiple disposables", () => {
      const service1 = {
        func1: () => "service1",
        dispose: vi.fn(),
      };

      const service2 = {
        func2: () => "service2",
        dispose: vi.fn(),
      };

      const combined = disposable([service1, service2]);

      expect(combined.func1()).toBe("service1");
      expect(combined.func2()).toBe("service2");
    });

    it("should overwrite conflicting properties (last wins)", () => {
      const service1 = {
        value: 1,
        dispose: vi.fn(),
      };

      const service2 = {
        value: 2,
        dispose: vi.fn(),
      };

      const combined = disposable([service1, service2]);

      expect(combined.value).toBe(2); // service2 wins
    });

    it("should overwrite conflicting methods (last wins)", () => {
      const service1 = {
        save: () => "service1",
        dispose: vi.fn(),
      };

      const service2 = {
        save: () => "service2",
        dispose: vi.fn(),
      };

      const combined = disposable([service1, service2]);

      expect(combined.save()).toBe("service2"); // service2 wins
    });

    it("should not overwrite dispose method", () => {
      const service1 = {
        func1: () => "service1",
        dispose: vi.fn(),
      };

      const service2 = {
        func2: () => "service2",
        dispose: vi.fn(),
      };

      const combined = disposable([service1, service2]);

      combined.dispose();

      // Both should be called
      expect(service1.dispose).toHaveBeenCalledTimes(1);
      expect(service2.dispose).toHaveBeenCalledTimes(1);
    });
  });

  describe("merge strategy: error", () => {
    it("should throw error on property conflict", () => {
      const service1 = {
        value: 1,
        dispose: vi.fn(),
      };

      const service2 = {
        value: 2,
        dispose: vi.fn(),
      };

      expect(() => {
        disposable([service1, service2], { merge: "error" });
      }).toThrow("Property conflict: 'value' exists in multiple services");
    });

    it("should throw error on method conflict", () => {
      const service1 = {
        save: () => 1,
        dispose: vi.fn(),
      };

      const service2 = {
        save: () => 2,
        dispose: vi.fn(),
      };

      expect(() => {
        disposable([service1, service2], { merge: "error" });
      }).toThrow("Property conflict: 'save' exists in multiple services");
    });

    it("should not throw on dispose method (always allowed)", () => {
      const service1 = {
        func1: () => 1,
        dispose: vi.fn(),
      };

      const service2 = {
        func2: () => 2,
        dispose: vi.fn(),
      };

      expect(() => {
        disposable([service1, service2], { merge: "error" });
      }).not.toThrow();
    });

    it("should merge when no conflicts exist", () => {
      const service1 = {
        func1: () => "service1",
        dispose: vi.fn(),
      };

      const service2 = {
        func2: () => "service2",
        dispose: vi.fn(),
      };

      const combined = disposable([service1, service2], { merge: "error" });

      expect(combined.func1()).toBe("service1");
      expect(combined.func2()).toBe("service2");
    });
  });

  describe("dispose behavior", () => {
    it("should call all dispose methods in reverse order (LIFO)", () => {
      const order: number[] = [];

      const service1 = {
        dispose: vi.fn(() => order.push(1)),
      };

      const service2 = {
        dispose: vi.fn(() => order.push(2)),
      };

      const service3 = {
        dispose: vi.fn(() => order.push(3)),
      };

      const combined = disposable([service1, service2, service3]);
      combined.dispose();

      expect(order).toEqual([3, 2, 1]); // Reverse order
      expect(service1.dispose).toHaveBeenCalledTimes(1);
      expect(service2.dispose).toHaveBeenCalledTimes(1);
      expect(service3.dispose).toHaveBeenCalledTimes(1);
    });

    it("should collect all disposal errors and throw DisposalAggregateError", () => {
      const error1 = new Error("Error 1");
      const error2 = new Error("Error 2");

      const service1 = {
        dispose: vi.fn(() => {
          throw error1;
        }),
      };

      const service2 = {
        dispose: vi.fn(() => {
          throw error2;
        }),
      };

      const service3 = {
        dispose: vi.fn(), // This should still be called
      };

      const combined = disposable([service1, service2, service3]);

      expect.hasAssertions();

      try {
        combined.dispose();
        throw new Error("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(DisposalAggregateError);
        expect((error as DisposalAggregateError).errors).toHaveLength(2);
        expect((error as DisposalAggregateError).errors[0].cause).toBe(error2); // Reverse order
        expect((error as DisposalAggregateError).errors[1].cause).toBe(error1);
        expect((error as DisposalAggregateError).message).toContain(
          "Failed to dispose 2 service(s)"
        );
      }

      // All dispose methods should be called despite errors
      expect(service1.dispose).toHaveBeenCalledTimes(1);
      expect(service2.dispose).toHaveBeenCalledTimes(1);
      expect(service3.dispose).toHaveBeenCalledTimes(1);
    });

    it("should continue disposing even if one fails", () => {
      const service1 = {
        dispose: vi.fn(() => {
          throw new Error("Fail");
        }),
      };

      const service2 = {
        dispose: vi.fn(),
      };

      const combined = disposable([service1, service2]);

      expect(() => {
        combined.dispose();
      }).toThrow(DisposalAggregateError);

      expect(service1.dispose).toHaveBeenCalled();
      expect(service2.dispose).toHaveBeenCalled(); // Should still be called
    });
  });

  describe("lifecycle callbacks", () => {
    it("should call onBefore before disposing", () => {
      const order: string[] = [];

      const service = {
        dispose: vi.fn(() => order.push("dispose")),
      };

      const combined = disposable([service], {
        onBefore: () => order.push("before"),
      });

      combined.dispose();

      expect(order).toEqual(["before", "dispose"]);
    });

    it("should call onAfter after disposing", () => {
      const order: string[] = [];

      const service = {
        dispose: vi.fn(() => order.push("dispose")),
      };

      const combined = disposable([service], {
        onAfter: () => order.push("after"),
      });

      combined.dispose();

      expect(order).toEqual(["dispose", "after"]);
    });

    it("should call onBefore and onAfter in correct order", () => {
      const order: string[] = [];

      const service1 = {
        dispose: vi.fn(() => order.push("service1")),
      };

      const service2 = {
        dispose: vi.fn(() => order.push("service2")),
      };

      const combined = disposable([service1, service2], {
        onBefore: () => order.push("before"),
        onAfter: () => order.push("after"),
      });

      combined.dispose();

      expect(order).toEqual(["before", "service2", "service1", "after"]);
    });

    it("should call onAfter even if dispose throws", () => {
      const service = {
        dispose: vi.fn(() => {
          throw new Error("Fail");
        }),
      };

      const onAfter = vi.fn();

      const combined = disposable([service], { onAfter });

      expect(() => {
        combined.dispose();
      }).toThrow(DisposalAggregateError);

      expect(onAfter).toHaveBeenCalled();
    });

    it("should not call callbacks on second dispose", () => {
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const onBefore = vi.fn();
      const onAfter = vi.fn();

      const service = {
        dispose: vi.fn(),
      };

      const combined = disposable([service], { onBefore, onAfter });

      combined.dispose();
      combined.dispose(); // Second call

      expect(onBefore).toHaveBeenCalledTimes(1);
      expect(onAfter).toHaveBeenCalledTimes(1);

      consoleWarnSpy.mockRestore();
    });
  });

  describe("edge cases", () => {
    it("should handle empty services array", () => {
      const combined = disposable([]);

      expect(() => {
        combined.dispose();
      }).not.toThrow();
    });

    it("should handle single service", () => {
      const service = {
        func1: () => "test",
        dispose: vi.fn(),
      };

      const combined = disposable([service]);

      expect(combined.func1()).toBe("test");
      combined.dispose();
      expect(service.dispose).toHaveBeenCalledTimes(1);
    });

    it("should preserve method binding", () => {
      const service = {
        value: 42,
        getValue() {
          return this.value;
        },
        dispose: vi.fn(),
      };

      const combined = disposable([service]);

      expect(combined.getValue()).toBe(42);
    });

    it("should handle services without dispose method", () => {
      const service1 = {
        func1: () => "test",
      };

      const service2 = {
        func2: () => "test2",
        dispose: vi.fn(),
      };

      const combined = disposable([service1 as any, service2]);

      expect(() => {
        combined.dispose();
      }).not.toThrow();

      expect(service2.dispose).toHaveBeenCalled();
    });
  });

  describe("DisposalAggregateError", () => {
    it("should contain all errors", () => {
      const error1 = new Error("Error 1");
      const error2 = new Error("Error 2");

      const service1 = {
        dispose: () => {
          throw error1;
        },
      };

      const service2 = {
        dispose: () => {
          throw error2;
        },
      };

      const combined = disposable([service1, service2]);

      expect.hasAssertions();

      try {
        combined.dispose();
        throw new Error("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(DisposalAggregateError);
        const aggError = error as DisposalAggregateError;
        expect(aggError.errors).toHaveLength(2);
        expect(aggError.errors[0].cause).toBe(error2);
        expect(aggError.errors[1].cause).toBe(error1);
      }
    });

    it("should have descriptive message", () => {
      const service1 = {
        dispose: () => {
          throw new Error("Fail 1");
        },
      };

      const service2 = {
        dispose: () => {
          throw new Error("Fail 2");
        },
      };

      const combined = disposable([service1, service2]);

      try {
        combined.dispose();
      } catch (error) {
        expect((error as DisposalAggregateError).message).toBe(
          "Failed to dispose 2 service(s)"
        );
      }
    });
  });

  describe("object shape", () => {
    it("should preserve property names with object shape", () => {
      const auth = {
        login: vi.fn(),
        logout: vi.fn(),
        dispose: vi.fn(),
      };

      const api = {
        get: vi.fn(),
        post: vi.fn(),
        dispose: vi.fn(),
      };

      const services = disposable({ auth, api });

      // Should preserve property names
      expect(services.auth).toBe(auth);
      expect(services.api).toBe(api);

      // Should have dispose method
      expect(typeof services.dispose).toBe("function");

      // Should be able to access nested methods
      services.auth.login();
      expect(auth.login).toHaveBeenCalledOnce();

      services.api.get();
      expect(api.get).toHaveBeenCalledOnce();
    });

    it("should dispose all services in reverse order with object shape", () => {
      const order: string[] = [];

      const auth = {
        dispose: () => order.push("auth"),
      };

      const api = {
        dispose: () => order.push("api"),
      };

      const storage = {
        dispose: () => order.push("storage"),
      };

      const services = disposable({ auth, api, storage });
      services.dispose();

      // Should dispose in reverse order of keys
      expect(order).toEqual(["storage", "api", "auth"]);
    });

    it("should handle mixed services (with and without dispose) in object shape", () => {
      const withDispose = {
        method: vi.fn(),
        dispose: vi.fn(),
      };

      const withoutDispose = {
        method: vi.fn(),
      };

      const services = disposable({ withDispose, withoutDispose });
      services.dispose();

      expect(withDispose.dispose).toHaveBeenCalledOnce();
      expect(services.withDispose).toBe(withDispose);
      expect(services.withoutDispose).toBe(withoutDispose);
    });

    it("should use explicit dispose property when provided (respectDispose)", () => {
      const customDispose = vi.fn();
      const authDispose = vi.fn();

      const services = disposable({
        auth: { dispose: authDispose },
        dispose: customDispose, // This should be used instead of iterating
      });

      services.dispose();

      // Should call the explicit dispose, not iterate over services
      expect(customDispose).toHaveBeenCalledOnce();
      expect(authDispose).not.toHaveBeenCalled();
    });

    it("should use dispose array when provided (respectDispose with array)", () => {
      const signal1Dispose = vi.fn();
      const signal2Dispose = vi.fn();
      const signal3Dispose = vi.fn();

      const signal1 = { dispose: signal1Dispose };
      const signal2 = { dispose: signal2Dispose };
      const signal3 = { dispose: signal3Dispose };

      const services = disposable({
        signal1,
        signal2,
        signal3,
        // Only dispose signal1 and signal2, not signal3
        dispose: [signal1, signal2],
      });

      services.dispose();

      // Should only dispose items in the dispose array
      expect(signal1Dispose).toHaveBeenCalledOnce();
      expect(signal2Dispose).toHaveBeenCalledOnce();
      expect(signal3Dispose).not.toHaveBeenCalled();
    });

    it("should skip lifecycle callbacks when respectDispose is used", () => {
      const onBefore = vi.fn();
      const onAfter = vi.fn();
      const customDispose = vi.fn();

      const services = disposable(
        {
          auth: { dispose: vi.fn() },
          dispose: customDispose,
        },
        { onBefore, onAfter }
      );

      services.dispose();

      // Lifecycle callbacks are skipped when respectDispose is used
      expect(onBefore).not.toHaveBeenCalled();
      expect(onAfter).not.toHaveBeenCalled();
      expect(customDispose).toHaveBeenCalledOnce();
    });

    it("should handle nested dispose object (respectDispose)", () => {
      const innerDispose = vi.fn();
      const outerAuthDispose = vi.fn();

      const services = disposable({
        auth: { dispose: outerAuthDispose },
        dispose: { dispose: innerDispose },
      });

      services.dispose();

      expect(innerDispose).toHaveBeenCalledOnce();
      expect(outerAuthDispose).not.toHaveBeenCalled();
    });

    it("should call lifecycle callbacks with object shape", () => {
      const onBefore = vi.fn();
      const onAfter = vi.fn();

      const services = disposable(
        {
          auth: { dispose: vi.fn() },
          api: { dispose: vi.fn() },
        },
        { onBefore, onAfter }
      );

      services.dispose();

      expect(onBefore).toHaveBeenCalledOnce();
      expect(onAfter).toHaveBeenCalledOnce();
    });

    it("should collect disposal errors with object shape", () => {
      expect.hasAssertions();

      const services = disposable({
        auth: {
          dispose: () => {
            throw new Error("Auth disposal failed");
          },
        },
        api: {
          dispose: () => {
            throw new Error("API disposal failed");
          },
        },
      });

      try {
        services.dispose();
        throw new Error("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(DisposalAggregateError);
        expect((error as DisposalAggregateError).errors).toHaveLength(2);
        expect((error as DisposalAggregateError).errors[0].message).toContain(
          "Failed to dispose service at key 'api'"
        );
        expect((error as DisposalAggregateError).errors[1].message).toContain(
          "Failed to dispose service at key 'auth'"
        );
      }
    });

    it("should only dispose once with object shape", () => {
      const auth = { dispose: vi.fn() };
      const services = disposable({ auth });

      services.dispose();
      services.dispose();

      expect(auth.dispose).toHaveBeenCalledOnce();
    });

    it("should work with empty object", () => {
      const services = disposable({});

      expect(typeof services.dispose).toBe("function");
      expect(() => services.dispose()).not.toThrow();
    });

    it("should support TypeScript type inference with object shape", () => {
      interface AuthService {
        login: () => void;
        dispose: () => void;
      }

      interface ApiService {
        get: () => void;
        dispose: () => void;
      }

      const auth: AuthService = {
        login: vi.fn(),
        dispose: vi.fn(),
      };

      const api: ApiService = {
        get: vi.fn(),
        dispose: vi.fn(),
      };

      const services = disposable({ auth, api });

      // Type assertions to verify inference
      expect(services.auth).toBe(auth);
      expect(services.api).toBe(api);
      expect(typeof services.dispose).toBe("function");
    });
  });
});

describe("wrapDispose", () => {
  describe("default mode (manual)", () => {
    it("should call custom with originalDispose", () => {
      const order: string[] = [];
      const original = vi.fn(() => order.push("original"));

      const target = { dispose: original };
      wrapDispose(target, (originalDispose) => {
        order.push("custom-start");
        originalDispose();
        order.push("custom-end");
      });

      target.dispose();

      expect(order).toEqual(["custom-start", "original", "custom-end"]);
    });

    it("should allow not calling original", () => {
      const original = vi.fn();

      const target = { dispose: original };
      wrapDispose(target, () => {
        // Don't call originalDispose
      });

      target.dispose();

      expect(original).not.toHaveBeenCalled();
    });
  });

  describe("before mode", () => {
    it("should call original dispose then custom", () => {
      const order: string[] = [];
      const original = vi.fn(() => order.push("original"));

      const target = { dispose: original };
      wrapDispose(
        target,
        () => {
          order.push("custom");
        },
        "before"
      );

      target.dispose();

      expect(order).toEqual(["original", "custom"]);
    });
  });

  describe("after mode", () => {
    it("should call custom then original dispose", () => {
      const order: string[] = [];
      const original = vi.fn(() => order.push("original"));

      const target = { dispose: original };
      wrapDispose(
        target,
        () => {
          order.push("custom");
        },
        "after"
      );

      target.dispose();

      expect(order).toEqual(["custom", "original"]);
    });
  });

  describe("disposed check", () => {
    it("should return function to check disposed status", () => {
      const target = { dispose: vi.fn() };
      const disposed = wrapDispose(target, () => {});

      expect(disposed()).toBe(false);

      target.dispose();

      expect(disposed()).toBe(true);
    });

    it("should prevent double disposal", () => {
      const custom = vi.fn();
      const original = vi.fn();

      const target = { dispose: original };
      wrapDispose(target, custom);

      target.dispose();
      target.dispose(); // Second call

      expect(custom).toHaveBeenCalledTimes(1);
    });
  });

  describe("edge cases", () => {
    it("should handle target without dispose method", () => {
      const custom = vi.fn();
      const target: { dispose?: VoidFunction } = {};

      wrapDispose(target, custom);

      target.dispose!();

      expect(custom).toHaveBeenCalledTimes(1);
    });

    it("should use noop for original when target has no dispose", () => {
      const order: string[] = [];
      const target: { dispose?: VoidFunction } = {};

      wrapDispose(target, (originalDispose) => {
        order.push("custom");
        originalDispose(); // Should be noop
        order.push("after-noop");
      });

      target.dispose!();

      expect(order).toEqual(["custom", "after-noop"]);
    });
  });

  describe("array-based customDispose", () => {
    it("should dispose array of functions", () => {
      const order: string[] = [];
      const fn1 = vi.fn(() => order.push("fn1"));
      const fn2 = vi.fn(() => order.push("fn2"));
      const fn3 = vi.fn(() => order.push("fn3"));

      const target = { dispose: vi.fn(() => order.push("original")) };
      wrapDispose(target, [fn1, fn2, fn3], "after");

      target.dispose();

      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);
      expect(fn3).toHaveBeenCalledTimes(1);
      expect(order).toEqual(["fn1", "fn2", "fn3", "original"]);
    });

    it("should dispose array of Disposables", () => {
      const order: string[] = [];
      const d1 = { dispose: vi.fn(() => order.push("d1")) };
      const d2 = { dispose: vi.fn(() => order.push("d2")) };
      const d3 = { dispose: vi.fn(() => order.push("d3")) };

      const target = { dispose: vi.fn(() => order.push("original")) };
      wrapDispose(target, [d1, d2, d3], "after");

      target.dispose();

      expect(d1.dispose).toHaveBeenCalledTimes(1);
      expect(d2.dispose).toHaveBeenCalledTimes(1);
      expect(d3.dispose).toHaveBeenCalledTimes(1);
      expect(order).toEqual(["d1", "d2", "d3", "original"]);
    });

    it("should dispose mixed array of functions and Disposables", () => {
      const order: string[] = [];
      const fn1 = vi.fn(() => order.push("fn1"));
      const d1 = { dispose: vi.fn(() => order.push("d1")) };
      const fn2 = vi.fn(() => order.push("fn2"));
      const d2 = { dispose: vi.fn(() => order.push("d2")) };

      const target = { dispose: vi.fn(() => order.push("original")) };
      wrapDispose(target, [fn1, d1, fn2, d2], "after");

      target.dispose();

      expect(fn1).toHaveBeenCalledTimes(1);
      expect(d1.dispose).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);
      expect(d2.dispose).toHaveBeenCalledTimes(1);
      expect(order).toEqual(["fn1", "d1", "fn2", "d2", "original"]);
    });

    it("should handle empty array", () => {
      const original = vi.fn();
      const target = { dispose: original };

      wrapDispose(target, [], "after");

      target.dispose();

      expect(original).toHaveBeenCalledTimes(1);
    });

    it("should call array disposables before original with 'after' mode", () => {
      const order: string[] = [];
      const fn = vi.fn(() => order.push("custom"));

      const target = { dispose: vi.fn(() => order.push("original")) };
      wrapDispose(target, [fn], "after");

      target.dispose();

      expect(order).toEqual(["custom", "original"]);
    });

    it("should call array disposables after original with 'before' mode", () => {
      const order: string[] = [];
      const fn = vi.fn(() => order.push("custom"));

      const target = { dispose: vi.fn(() => order.push("original")) };
      wrapDispose(target, [fn], "before");

      target.dispose();

      expect(order).toEqual(["original", "custom"]);
    });

    it("should not call original with array and no when mode", () => {
      const order: string[] = [];
      const fn = vi.fn(() => order.push("custom"));
      const original = vi.fn(() => order.push("original"));

      const target = { dispose: original };
      wrapDispose(target, [fn]);

      target.dispose();

      expect(order).toEqual(["custom"]);
      expect(original).not.toHaveBeenCalled();
    });

    it("should work with nested disposable arrays", () => {
      const order: string[] = [];
      const innerD1 = { dispose: vi.fn(() => order.push("inner1")) };
      const innerD2 = { dispose: vi.fn(() => order.push("inner2")) };
      const outerD = { dispose: [innerD1, innerD2] };

      const target = { dispose: vi.fn(() => order.push("original")) };
      wrapDispose(target, [outerD], "after");

      target.dispose();

      expect(innerD1.dispose).toHaveBeenCalledTimes(1);
      expect(innerD2.dispose).toHaveBeenCalledTimes(1);
      expect(order).toEqual(["inner1", "inner2", "original"]);
    });

    it("should prevent double disposal with array", () => {
      const fn = vi.fn();
      const d = { dispose: vi.fn() };

      const target = { dispose: vi.fn() };
      wrapDispose(target, [fn, d], "after");

      target.dispose();
      target.dispose(); // Second call

      expect(fn).toHaveBeenCalledTimes(1);
      expect(d.dispose).toHaveBeenCalledTimes(1);
    });

    it("should return disposed status check with array", () => {
      const target = { dispose: vi.fn() };
      const disposed = wrapDispose(target, [() => {}], "after");

      expect(disposed()).toBe(false);

      target.dispose();

      expect(disposed()).toBe(true);
    });
  });
});

describe("noop", () => {
  it("should be a function that does nothing", () => {
    expect(typeof noop).toBe("function");
    expect(noop()).toBeUndefined();
  });
});
