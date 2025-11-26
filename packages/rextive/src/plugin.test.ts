import { describe, it, expect, vi } from "vitest";
import { signal } from "./signal";
import { tag } from "./tag";
import type { Plugin } from "./types";

describe("Plugin System", () => {
  describe("basic plugin functionality", () => {
    it("should execute plugin on signal creation", () => {
      const pluginSpy = vi.fn();
      const sig = signal(0, { use: [pluginSpy] });

      expect(pluginSpy).toHaveBeenCalledOnce();
      expect(pluginSpy).toHaveBeenCalledWith(sig);
    });

    it("should execute multiple plugins in order", () => {
      const callOrder: number[] = [];
      const plugin1: Plugin<number> = () => {
        callOrder.push(1);
      };
      const plugin2: Plugin<number> = () => {
        callOrder.push(2);
      };
      const plugin3: Plugin<number> = () => {
        callOrder.push(3);
      };

      signal(0, { use: [plugin1, plugin2, plugin3] });

      expect(callOrder).toEqual([1, 2, 3]);
    });

    it("should pass signal instance to plugin", () => {
      let receivedSignal: any;
      const plugin: Plugin<number> = (sig) => {
        receivedSignal = sig;
      };

      const sig = signal(42, { use: [plugin] });

      expect(receivedSignal).toBe(sig);
      expect(receivedSignal()).toBe(42);
    });

    it("should execute plugin cleanup on disposal", () => {
      const cleanup = vi.fn();
      const plugin: Plugin<number> = () => cleanup;

      const sig = signal(0, { use: [plugin] });
      sig.dispose();

      expect(cleanup).toHaveBeenCalledOnce();
    });

    it("should execute all cleanups in order", () => {
      const callOrder: number[] = [];
      const plugin1: Plugin<number> = () => () => callOrder.push(1);
      const plugin2: Plugin<number> = () => () => callOrder.push(2);
      const plugin3: Plugin<number> = () => () => callOrder.push(3);

      const sig = signal(0, { use: [plugin1, plugin2, plugin3] });
      sig.dispose();

      expect(callOrder).toEqual([1, 2, 3]);
    });

    it("should handle plugins without cleanup", () => {
      const plugin: Plugin<number> = () => {
        // No cleanup
      };

      const sig = signal(0, { use: [plugin] });
      expect(() => sig.dispose()).not.toThrow();
    });
  });

  describe("plugin with mutable signals", () => {
    it("should work with mutable signal", () => {
      const plugin: Plugin<number, "mutable"> = (sig) => {
        expect(sig()).toBe(0);
        expect(typeof sig.set).toBe("function");
      };

      signal(0, { use: [plugin] });
    });

    it("should allow plugin to modify signal", () => {
      const plugin: Plugin<number, "mutable"> = (sig) => {
        sig.set(100);
      };

      const sig = signal(0, { use: [plugin] });

      expect(sig()).toBe(100);
    });

    it("should subscribe to changes in plugin", () => {
      const changes: number[] = [];
      const plugin: Plugin<number> = (sig) => {
        return sig.on(() => {
          changes.push(sig());
        });
      };

      const sig = signal<number>(0, { use: [plugin] });

      sig.set(10);
      sig.set(20);

      expect(changes).toEqual([10, 20]);
    });

    it("should unsubscribe on disposal", () => {
      const changes: number[] = [];
      const plugin: Plugin<number> = (sig) => {
        return sig.on(() => {
          changes.push(sig());
        });
      };

      const sig = signal<number>(0, { use: [plugin] });

      sig.set(10);
      sig.dispose();
      
      // Cannot set after disposal
      expect(() => sig.set(20)).toThrow();

      expect(changes).toEqual([10]);
    });
  });

  describe("plugin with computed signals", () => {
    it("should work with computed signal", () => {
      const dep = signal(5);
      const plugin: Plugin<number, "computed"> = (sig) => {
        expect(sig()).toBe(10);
        expect(sig.pause).toBeDefined();
        expect(sig.resume).toBeDefined();
      };

      signal({ dep }, ({ deps }) => deps.dep * 2, { use: [plugin] });
    });

    it("should subscribe to computed signal changes", () => {
      const dep = signal(5);
      const changes: number[] = [];

      const plugin: Plugin<number> = (sig) => {
        return sig.on(() => {
          changes.push(sig());
        });
      };

      signal({ dep }, ({ deps }) => deps.dep * 2, { use: [plugin] });

      dep.set(10);
      dep.set(15);

      expect(changes).toEqual([20, 30]);
    });
  });

  describe("real-world plugin patterns", () => {
    describe("logger plugin", () => {
      it("should log signal creation and changes", () => {
        const logs: string[] = [];

        const logger: Plugin<number> = (sig) => {
          const name = sig.displayName || "unnamed";
          logs.push(`[${name}] created: ${sig()}`);

          return sig.on(() => {
            logs.push(`[${name}] changed: ${sig()}`);
          });
        };

        const sig = signal<number>(0, { name: "count", use: [logger] });

        expect(logs).toEqual(["[count] created: 0"]);

        sig.set(5);
        sig.set(10);

        expect(logs).toEqual([
          "[count] created: 0",
          "[count] changed: 5",
          "[count] changed: 10",
        ]);
      });
    });

    describe("persister plugin", () => {
      it("should persist and restore signal value", () => {
        const storage: Record<string, string> = {};

        const persister =
          (key: string): Plugin<any, "mutable"> =>
          (sig) => {
            // Load from storage
            const stored = storage[key];
            if (stored) {
              sig.set(JSON.parse(stored));
            }

            // Save on change
            return sig.on(() => {
              storage[key] = JSON.stringify(sig());
            });
          };

        // First signal - save to storage
        const sig1 = signal({ count: 0 }, { use: [persister("data")] });
        sig1.set({ count: 42 });
        expect(storage["data"]).toBe(JSON.stringify({ count: 42 }));

        // Second signal - load from storage
        const sig2 = signal({ count: 0 }, { use: [persister("data")] });
        expect(sig2()).toEqual({ count: 42 });
      });
    });

    describe("validator plugin", () => {
      it("should validate signal changes", () => {
        const errors: string[] = [];

        const validator: Plugin<string, "mutable"> = (sig) => {
          return sig.on(() => {
            const value = sig();
            if (value.length > 10) {
              errors.push("String too long");
            }
            if (value.length === 0) {
              errors.push("String empty");
            }
          });
        };

        const sig = signal<string>("test", { use: [validator] });

        sig.set("short");
        expect(errors).toEqual([]);

        sig.set("this is way too long for validation");
        expect(errors).toEqual(["String too long"]);

        sig.set("");
        expect(errors).toEqual(["String too long", "String empty"]);
      });
    });

    describe("tracker plugin", () => {
      it("should track signal interactions", () => {
        const events: { type: string; value: any; timestamp: number }[] = [];

        const tracker: Plugin<number> = (sig) => {
          events.push({
            type: "created",
            value: sig(),
            timestamp: Date.now(),
          });

          return sig.on(() => {
            events.push({
              type: "changed",
              value: sig(),
              timestamp: Date.now(),
            });
          });
        };

        const sig = signal<number>(0, { use: [tracker] });

        expect(events).toHaveLength(1);
        expect(events[0].type).toBe("created");
        expect(events[0].value).toBe(0);

        sig.set(5);

        expect(events).toHaveLength(2);
        expect(events[1].type).toBe("changed");
        expect(events[1].value).toBe(5);
      });
    });

    describe("devtools plugin", () => {
      it("should register signal with devtools", () => {
        const devtoolsRegistry: Map<string, any> = new Map();

        const devtools: Plugin<any> = (sig) => {
          const name = sig.displayName || `signal_${devtoolsRegistry.size}`;
          devtoolsRegistry.set(name, sig);

          return () => {
            devtoolsRegistry.delete(name);
          };
        };

        const sig1 = signal(0, { name: "count", use: [devtools] });
        const sig2 = signal("test", { name: "text", use: [devtools] });
        void sig2; // Used via side effects

        expect(devtoolsRegistry.size).toBe(2);
        expect(devtoolsRegistry.has("count")).toBe(true);
        expect(devtoolsRegistry.has("text")).toBe(true);

        sig1.dispose();

        expect(devtoolsRegistry.size).toBe(1);
        expect(devtoolsRegistry.has("count")).toBe(false);
      });
    });
  });

  describe("plugin composition", () => {
    it("should combine multiple plugins", () => {
      const logs: string[] = [];
      const counts: number[] = [];

      const logger: Plugin<number> = (sig) => {
        logs.push(`Signal created: ${sig()}`);
      };

      const counter: Plugin<number> = (sig) => {
        return sig.on(() => {
          counts.push(sig());
        });
      };

      const sig = signal<number>(0, { use: [logger, counter] });

      sig.set(1);
      sig.set(2);

      expect(logs).toEqual(["Signal created: 0"]);
      expect(counts).toEqual([1, 2]);
    });

    it("should allow plugins to interact", () => {
      const metadata = new WeakMap<any, { created: number; changes: number }>();

      const metadataInit: Plugin<any> = (sig) => {
        metadata.set(sig, { created: Date.now(), changes: 0 });
      };

      const changeCounter: Plugin<any> = (sig) => {
        return sig.on(() => {
          const meta = metadata.get(sig);
          if (meta) {
            meta.changes++;
          }
        });
      };

      const sig = signal<number>(0, { use: [metadataInit, changeCounter] });

      sig.set(1);
      sig.set(2);
      sig.set(3);

      const meta = metadata.get(sig);
      expect(meta).toBeDefined();
      expect(meta!.changes).toBe(3);
    });
  });

  describe("plugin with tags", () => {
    it("should apply tag plugins to signal", () => {
      const pluginSpy = vi.fn();
      const myTag = tag<number>({ use: [pluginSpy] });

      const sig = signal(0, { use: [myTag] });

      expect(pluginSpy).toHaveBeenCalledOnce();
      expect(pluginSpy).toHaveBeenCalledWith(sig);
    });

    it("should combine signal plugins and tag plugins", () => {
      const callOrder: number[] = [];

      const signalPlugin: Plugin<number> = () => {
        callOrder.push(1);
      };

      const tagPlugin: Plugin<number> = () => {
        callOrder.push(2);
      };

      const myTag = tag<number>({ use: [tagPlugin] });

      signal(0, { use: [signalPlugin, myTag] });

      expect(callOrder).toEqual([1, 2]);
    });

    it("should apply nested tag plugins", () => {
      const callOrder: number[] = [];

      const plugin1: Plugin<number> = () => {
        callOrder.push(1);
      };
      const plugin2: Plugin<number> = () => {
        callOrder.push(2);
      };
      const plugin3: Plugin<number> = () => {
        callOrder.push(3);
      };

      const tag1 = tag<number>({ use: [plugin1] });
      const tag2 = tag<number>({ use: [tag1, plugin2] });
      const tag3 = tag<number>({ use: [tag2, plugin3] });

      signal(0, { use: [tag3] });

      expect(callOrder).toEqual([1, 2, 3]);
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle plugin that throws during execution", () => {
      const badPlugin: Plugin<number> = () => {
        throw new Error("Plugin error");
      };

      expect(() => {
        signal(0, { use: [badPlugin] });
      }).toThrow("Plugin error");
    });

    it("should handle cleanup that throws", () => {
      const badCleanup = vi.fn(() => {
        throw new Error("Cleanup error");
      });

      const plugin: Plugin<number> = () => badCleanup;

      const sig = signal(0, { use: [plugin] });

      expect(() => sig.dispose()).toThrow("Cleanup error");
    });

    it("should handle empty plugin array", () => {
      expect(() => {
        signal(0, { use: [] });
      }).not.toThrow();
    });

    it("should handle plugin with complex signal operations", () => {
      const plugin: Plugin<number, "mutable"> = (sig) => {
        const initial = sig();
        sig.set(initial * 2);

        return sig.on(() => {
          if (sig() < 0) {
            sig.set(0);
          }
        });
      };

      const sig = signal<number>(5, { use: [plugin] });

      expect(sig()).toBe(10);

      sig.set(-5);
      expect(sig()).toBe(0);
    });

    it("should work with async signal initialization", async () => {
      const plugin: Plugin<Promise<number>> = (sig) => {
        sig().then((value) => {
          expect(value).toBe(42);
        });
      };

      const sig = signal(async () => 42, { use: [plugin] });

      await expect(sig()).resolves.toBe(42);
    });
  });

  describe("type-specific plugins", () => {
    it("should enforce mutable plugin on mutable signals", () => {
      const mutablePlugin: Plugin<number, "mutable"> = (sig) => {
        sig.set(100); // Should work - sig is MutableSignal
        expect(typeof sig.set).toBe("function");
      };

      const sig = signal(0, { use: [mutablePlugin] });
      expect(sig()).toBe(100);
    });

    it("should work with computed-specific plugin", () => {
      const dep = signal(5);
      const computedPlugin: Plugin<number, "computed"> = (sig) => {
        expect(typeof sig.pause).toBe("function");
        expect(typeof sig.resume).toBe("function");
      };

      signal({ dep }, ({ deps }) => deps.dep * 2, { use: [computedPlugin] });
    });

    it("should work with any-kind plugin", () => {
      const anyPlugin: Plugin<number> = (sig) => {
        expect(sig()).toBeTypeOf("number");
      };

      // Works with mutable
      signal(0, { use: [anyPlugin] });

      // Works with computed
      const dep = signal(5);
      signal({ dep }, ({ deps }) => deps.dep * 2, { use: [anyPlugin] });
    });
  });

  describe("performance considerations", () => {
    it("should not impact signal performance significantly", () => {
      const simplePlugin: Plugin<number> = () => {};

      const start = performance.now();
      const sig = signal<number>(0, { use: [simplePlugin] });

      for (let i = 0; i < 1000; i++) {
        sig.set(i);
      }

      const end = performance.now();
      const duration = end - start;

      // Should complete in reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(100);
    });

    it("should handle many plugins efficiently", () => {
      const plugins: Plugin<number>[] = Array.from({ length: 100 }, () => {
        return () => {};
      });

      const start = performance.now();
      signal(0, { use: plugins });
      const end = performance.now();

      expect(end - start).toBeLessThan(10);
    });
  });
});

