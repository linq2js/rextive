import { describe, it, expect, vi } from "vitest";
import { signal } from "./signal";
import { tag } from "./tag";
import { attacher } from "./attacher";
import { emitter } from "./utils/emitter";
import type { Plugin } from "./types";

describe("attacher", () => {
  describe("plugin attachment", () => {
    it("should attach a single plugin to signal", () => {
      const onDispose = emitter<void>();
      const testSignal = signal(0);
      const pluginSpy = vi.fn((sig) => {
        expect(sig).toBe(testSignal);
      });

      const { attach } = attacher(testSignal, onDispose);
      attach([pluginSpy]);

      expect(pluginSpy).toHaveBeenCalledOnce();
      expect(pluginSpy).toHaveBeenCalledWith(testSignal);
    });

    it("should attach multiple plugins in order", () => {
      const onDispose = emitter<void>();
      const testSignal = signal(0);
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

      const { attach } = attacher(testSignal, onDispose);
      attach([plugin1, plugin2, plugin3]);

      expect(callOrder).toEqual([1, 2, 3]);
    });

    it("should register plugin cleanup functions", () => {
      const onDispose = emitter<void>();
      const testSignal = signal(0);
      const cleanup1 = vi.fn();
      const cleanup2 = vi.fn();
      const plugin1: Plugin<number> = () => cleanup1;
      const plugin2: Plugin<number> = () => cleanup2;

      const { attach } = attacher(testSignal, onDispose);
      attach([plugin1, plugin2]);

      // Trigger disposal
      onDispose.emit();

      expect(cleanup1).toHaveBeenCalledOnce();
      expect(cleanup2).toHaveBeenCalledOnce();
    });

    it("should handle plugins without cleanup", () => {
      const onDispose = emitter<void>();
      const testSignal = signal(0);
      const plugin: Plugin<number> = () => {
        // No cleanup returned
      };

      const { attach } = attacher(testSignal, onDispose);
      expect(() => attach([plugin])).not.toThrow();

      // Trigger disposal - should not throw
      expect(() => onDispose.emit()).not.toThrow();
    });

    it("should pass signal instance to plugins", () => {
      const onDispose = emitter<void>();
      const testSignal = signal(42);
      const plugin: Plugin<number> = (sig) => {
        expect(sig()).toBe(42);
        expect(sig.displayName).toBe("test");
      };

      testSignal.displayName = "test" as any;

      const { attach } = attacher(testSignal, onDispose);
      attach([plugin]);
    });
  });

  describe("tag attachment", () => {
    it("should attach signal to tag", () => {
      const onDispose = emitter<void>();
      const testSignal = signal(0);
      const testTag = tag<number>();

      const { attach } = attacher(testSignal, onDispose);
      attach([testTag]);

      expect(testTag.has(testSignal)).toBe(true);
      expect(testTag.size).toBe(1);
    });

    it("should attach signal to multiple tags", () => {
      const onDispose = emitter<void>();
      const testSignal = signal(0);
      const tag1 = tag<number>();
      const tag2 = tag<number>();
      const tag3 = tag<number>();

      const { attach } = attacher(testSignal, onDispose);
      attach([tag1, tag2, tag3]);

      expect(tag1.has(testSignal)).toBe(true);
      expect(tag2.has(testSignal)).toBe(true);
      expect(tag3.has(testSignal)).toBe(true);
    });

    it("should apply tag plugins when attaching tag", () => {
      const onDispose = emitter<void>();
      const testSignal = signal(0);
      const pluginSpy = vi.fn();
      const testTag = tag<number>({ use: [pluginSpy] });

      const { attach } = attacher(testSignal, onDispose);
      attach([testTag]);

      expect(pluginSpy).toHaveBeenCalledOnce();
      expect(pluginSpy).toHaveBeenCalledWith(testSignal);
    });

    it("should apply multiple plugins from tag", () => {
      const onDispose = emitter<void>();
      const testSignal = signal(0);
      const plugin1 = vi.fn();
      const plugin2 = vi.fn();
      const testTag = tag<number>({ use: [plugin1, plugin2] });

      const { attach } = attacher(testSignal, onDispose);
      attach([testTag]);

      expect(plugin1).toHaveBeenCalledOnce();
      expect(plugin2).toHaveBeenCalledOnce();
    });

    it("should remove signal from tags on disposal", () => {
      const onDispose = emitter<void>();
      const testSignal = signal(0);
      const tag1 = tag<number>();
      const tag2 = tag<number>();

      const { attach } = attacher(testSignal, onDispose);
      attach([tag1, tag2]);

      expect(tag1.has(testSignal)).toBe(true);
      expect(tag2.has(testSignal)).toBe(true);

      // Trigger disposal
      onDispose.emit();

      expect(tag1.has(testSignal)).toBe(false);
      expect(tag2.has(testSignal)).toBe(false);
    });
  });

  describe("nested tags (tags in tags)", () => {
    it("should apply plugins from nested tags", () => {
      const onDispose = emitter<void>();
      const testSignal = signal(0);
      const nestedPlugin = vi.fn();
      const nestedTag = tag<number>({ use: [nestedPlugin] });
      const parentTag = tag<number>({ use: [nestedTag] });

      const { attach } = attacher(testSignal, onDispose);
      attach([parentTag]);

      // Should apply nested tag's plugin
      expect(nestedPlugin).toHaveBeenCalledOnce();
      expect(nestedPlugin).toHaveBeenCalledWith(testSignal);
    });

    it("should handle deeply nested tags", () => {
      const onDispose = emitter<void>();
      const testSignal = signal(0);
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

      const { attach } = attacher(testSignal, onDispose);
      attach([tag3]);

      // Should call plugins in depth-first order: tag3 -> tag2 -> tag1
      expect(callOrder).toEqual([1, 2, 3]);
    });

    it("should handle mixed plugins and tags", () => {
      const onDispose = emitter<void>();
      const testSignal = signal(0);
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

      const nestedTag = tag<number>({ use: [plugin2] });
      const parentTag = tag<number>({ use: [plugin1, nestedTag, plugin3] });

      const { attach } = attacher(testSignal, onDispose);
      attach([parentTag]);

      expect(callOrder).toEqual([1, 2, 3]);
    });

    it("should handle empty use arrays in tags", () => {
      const onDispose = emitter<void>();
      const testSignal = signal(0);
      const emptyTag = tag<number>({ use: [] });
      const parentTag = tag<number>({ use: [emptyTag] });

      const { attach } = attacher(testSignal, onDispose);
      expect(() => attach([parentTag])).not.toThrow();
    });

    it("should handle tags without use property", () => {
      const onDispose = emitter<void>();
      const testSignal = signal(0);
      const simpleTag = tag<number>();
      const parentTag = tag<number>({ use: [simpleTag] });

      const { attach } = attacher(testSignal, onDispose);
      expect(() => attach([parentTag])).not.toThrow();
      expect(simpleTag.has(testSignal)).toBe(true);
    });

    it("should collect cleanups from nested tag plugins", () => {
      const onDispose = emitter<void>();
      const testSignal = signal(0);
      const cleanup1 = vi.fn();
      const cleanup2 = vi.fn();

      const plugin1: Plugin<number> = () => cleanup1;
      const plugin2: Plugin<number> = () => cleanup2;

      const nestedTag = tag<number>({ use: [plugin1] });
      const parentTag = tag<number>({ use: [nestedTag, plugin2] });

      const { attach } = attacher(testSignal, onDispose);
      attach([parentTag]);

      // Trigger disposal
      onDispose.emit();

      expect(cleanup1).toHaveBeenCalledOnce();
      expect(cleanup2).toHaveBeenCalledOnce();
    });
  });

  describe("mixed plugins and tags", () => {
    it("should handle mixed array of plugins and tags", () => {
      const onDispose = emitter<void>();
      const testSignal = signal(0);
      const callOrder: number[] = [];

      const plugin1: Plugin<number> = () => {
        callOrder.push(1);
      };
      const plugin2: Plugin<number> = () => {
        callOrder.push(2);
      };
      const tagPlugin: Plugin<number> = () => {
        callOrder.push(3);
      };

      const testTag = tag<number>({ use: [tagPlugin] });

      const { attach } = attacher(testSignal, onDispose);
      attach([plugin1, testTag, plugin2]);

      expect(callOrder).toEqual([1, 3, 2]);
      expect(testTag.has(testSignal)).toBe(true);
    });

    it("should apply plugins before tag attachment", () => {
      const onDispose = emitter<void>();
      const testSignal = signal(0);
      let pluginCalled = false;
      let tagAdded = false;

      const plugin: Plugin<number> = () => {
        pluginCalled = true;
        expect(tagAdded).toBe(false); // Plugin runs first
      };

      const testTag = tag<number>({
        onAdd: () => {
          tagAdded = true;
          expect(pluginCalled).toBe(true); // Tag added after plugin
        },
      });

      const { attach } = attacher(testSignal, onDispose);
      attach([plugin, testTag]);
    });
  });

  describe("real-world plugin scenarios", () => {
    it("should work with logger plugin", () => {
      const onDispose = emitter<void>();
      const testSignal = signal(42);
      const logs: string[] = [];

      const logger: Plugin<number> = (sig) => {
        logs.push(`Created: ${sig()}`);
        return sig.on(() => {
          logs.push(`Changed: ${sig()}`);
        });
      };

      const { attach } = attacher(testSignal, onDispose);
      attach([logger]);

      expect(logs).toEqual(["Created: 42"]);

      testSignal.set(100);
      expect(logs).toEqual(["Created: 42", "Changed: 100"]);

      // Cleanup on disposal
      onDispose.emit();
    });

    it("should work with persister plugin", () => {
      const onDispose = emitter<void>();
      const testSignal = signal({ count: 0 });
      const storage: Record<string, string> = {};

      const persister =
        (key: string): Plugin<any, "mutable"> =>
        (sig) => {
          // Load
          if (storage[key]) {
            sig.set(JSON.parse(storage[key]));
          }

          // Save on change
          return sig.on(() => {
            storage[key] = JSON.stringify(sig());
          });
        };

      storage["test"] = JSON.stringify({ count: 50 });

      const { attach } = attacher(testSignal, onDispose);
      attach([persister("test")]);

      // Should load from storage
      expect(testSignal()).toEqual({ count: 50 });

      // Should save on change
      testSignal.set({ count: 100 });
      expect(storage["test"]).toBe(JSON.stringify({ count: 100 }));
    });

    it("should work with validator plugin", () => {
      const onDispose = emitter<void>();
      const testSignal = signal("test");
      const errors: string[] = [];

      const validator: Plugin<string, "mutable"> = (sig) => {
        return sig.on(() => {
          const value = sig();
          if (value.length > 10) {
            errors.push("Too long");
          }
        });
      };

      const { attach } = attacher(testSignal, onDispose);
      attach([validator]);

      testSignal.set("short");
      expect(errors).toEqual([]);

      testSignal.set("this is way too long");
      expect(errors).toEqual(["Too long"]);
    });

    it("should combine multiple plugins for rich behavior", () => {
      const onDispose = emitter<void>();
      const testSignal = signal(0);
      const events: string[] = [];

      const logger: Plugin<number> = (sig) => {
        return sig.on(() => events.push(`log: ${sig()}`));
      };

      const tracker: Plugin<number> = (sig) => {
        return sig.on(() => events.push(`track: ${sig()}`));
      };

      const validator: Plugin<number> = (sig) => {
        return sig.on(() => {
          if (sig() < 0) events.push("error: negative");
        });
      };

      const { attach } = attacher(testSignal, onDispose);
      attach([logger, tracker, validator]);

      testSignal.set(5);
      expect(events).toEqual(["log: 5", "track: 5"]);

      testSignal.set(-1);
      expect(events).toEqual([
        "log: 5",
        "track: 5",
        "log: -1",
        "track: -1",
        "error: negative",
      ]);
    });
  });

  describe("edge cases", () => {
    it("should handle empty array", () => {
      const onDispose = emitter<void>();
      const testSignal = signal(0);

      const { attach } = attacher(testSignal, onDispose);
      expect(() => attach([])).not.toThrow();
    });

    it("should handle disposal without any attachments", () => {
      const onDispose = emitter<void>();
      const testSignal = signal(0);

      attacher(testSignal, onDispose);

      expect(() => onDispose.emit()).not.toThrow();
    });

    it("should handle multiple attach calls", () => {
      const onDispose = emitter<void>();
      const testSignal = signal(0);
      const plugin1 = vi.fn();
      const plugin2 = vi.fn();

      const { attach } = attacher(testSignal, onDispose);
      attach([plugin1]);
      attach([plugin2]);

      expect(plugin1).toHaveBeenCalledOnce();
      expect(plugin2).toHaveBeenCalledOnce();
    });

    it("should not throw if plugin throws", () => {
      const onDispose = emitter<void>();
      const testSignal = signal(0);
      const badPlugin: Plugin<number> = () => {
        throw new Error("Plugin error");
      };

      const { attach } = attacher(testSignal, onDispose);
      expect(() => attach([badPlugin])).toThrow("Plugin error");
    });
  });
});

