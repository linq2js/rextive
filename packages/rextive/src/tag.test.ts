import { describe, it, expect, vi } from "vitest";
import { tag } from "./tag";
import { signal } from "./index";
import type { Signal, Plugin, Tag } from "./types";

describe("tag", () => {
  describe("Basic tag operations", () => {
    it("should create an empty tag", () => {
      const myTag = tag<number>();
      expect(myTag.size).toBe(0);
      expect(myTag.signals()).toEqual([]);
    });

    it("should add signals to tag via options", () => {
      const myTag = tag<number>();
      const count = signal(0, { use: [myTag] });

      expect(myTag.size).toBe(1);
      expect(myTag.has(count)).toBe(true);
      expect(myTag.signals()).toContain(count);
    });

    it("should add multiple signals to the same tag", () => {
      const myTag = tag<number>();
      const a = signal(1, { use: [myTag] });
      const b = signal(2, { use: [myTag] });
      const c = signal(3, { use: [myTag] });

      expect(myTag.size).toBe(3);
      expect(myTag.signals()).toEqual([a, b, c]);
    });

    it("should support signals belonging to multiple tags", () => {
      const tag1 = tag<number>();
      const tag2 = tag<number>();
      const count = signal(0, { use: [tag1, tag2] });

      expect(tag1.has(count)).toBe(true);
      expect(tag2.has(count)).toBe(true);
      expect(tag1.size).toBe(1);
      expect(tag2.size).toBe(1);
    });
  });

  describe("has()", () => {
    it("should return true for signals in the tag", () => {
      const myTag = tag<number>();
      const count = signal(0, { use: [myTag] });

      expect(myTag.has(count)).toBe(true);
    });

    it("should return false for signals not in the tag", () => {
      const myTag = tag<number>();
      const count = signal(0);

      expect(myTag.has(count)).toBe(false);
    });
  });

  describe("delete()", () => {
    it("should remove a signal from the tag", () => {
      const myTag = tag<number>();
      const count = signal(0, { use: [myTag] });

      expect(myTag.size).toBe(1);
      const removed = myTag.delete(count);

      expect(removed).toBe(true);
      expect(myTag.size).toBe(0);
      expect(myTag.has(count)).toBe(false);
    });

    it("should return false when deleting non-existent signal", () => {
      const myTag = tag<number>();
      const count = signal(0);

      const removed = myTag.delete(count);
      expect(removed).toBe(false);
    });

    it("should not affect other tags when deleting", () => {
      const tag1 = tag<number>();
      const tag2 = tag<number>();
      const count = signal(0, { use: [tag1, tag2] });

      tag1.delete(count);

      expect(tag1.has(count)).toBe(false);
      expect(tag2.has(count)).toBe(true);
    });
  });

  describe("clear()", () => {
    it("should remove all signals from the tag", () => {
      const myTag = tag<number>();
      signal(1, { use: [myTag] });
      signal(2, { use: [myTag] });
      signal(3, { use: [myTag] });

      expect(myTag.size).toBe(3);
      myTag.clear();

      expect(myTag.size).toBe(0);
      expect(myTag.signals()).toEqual([]);
    });

    it("should handle clearing an empty tag", () => {
      const myTag = tag<number>();

      expect(() => myTag.clear()).not.toThrow();
      expect(myTag.size).toBe(0);
    });
  });

  describe("forEach()", () => {
    it("should iterate over all signals in the tag", () => {
      const myTag = tag<number>();
      const a = signal(1, { use: [myTag] });
      const b = signal(2, { use: [myTag] });
      const c = signal(3, { use: [myTag] });

      const visited: Signal<number>[] = [];
      myTag.forEach((sig) => visited.push(sig));

      expect(visited).toEqual([a, b, c]);
    });

    it("should handle empty tag", () => {
      const myTag = tag<number>();
      const visited: any[] = [];

      myTag.forEach((sig) => visited.push(sig));

      expect(visited).toEqual([]);
    });

    it("should allow signal operations during iteration", () => {
      const myTag = tag<number>();
      const a = signal(1, { use: [myTag] });
      const b = signal(2, { use: [myTag] });

      const values: number[] = [];
      myTag.forEach((sig) => {
        values.push(sig());
        if (signal.is(sig, "mutable")) {
          sig.set((v) => v * 2);
        }
      });

      expect(values).toEqual([1, 2]);
      expect(a()).toBe(2);
      expect(b()).toBe(4);
    });
  });

  describe("signals()", () => {
    it("should return array of all signals", () => {
      const myTag = tag<number>();
      const a = signal(1, { use: [myTag] });
      const b = signal(2, { use: [myTag] });

      const result = myTag.signals();

      expect(result).toEqual([a, b]);
      expect(Array.isArray(result)).toBe(true);
    });

    it("should return empty array for empty tag", () => {
      const myTag = tag<number>();

      expect(myTag.signals()).toEqual([]);
    });

    it("should return a new array each time", () => {
      const myTag = tag<number>();
      signal(1, { use: [myTag] });

      const arr1 = myTag.signals();
      const arr2 = myTag.signals();

      expect(arr1).toEqual(arr2);
      expect(arr1).not.toBe(arr2); // Different array instances
    });
  });

  describe("Auto-removal on dispose", () => {
    it("should remove signal from tag when disposed", () => {
      const myTag = tag<number>();
      const count = signal(0, { use: [myTag] });

      expect(myTag.size).toBe(1);
      count.dispose();

      expect(myTag.size).toBe(0);
      expect(myTag.has(count)).toBe(false);
    });

    it("should remove from all tags when disposed", () => {
      const tag1 = tag<number>();
      const tag2 = tag<number>();
      const count = signal(0, { use: [tag1, tag2] });

      expect(tag1.size).toBe(1);
      expect(tag2.size).toBe(1);

      count.dispose();

      expect(tag1.size).toBe(0);
      expect(tag2.size).toBe(0);
    });
  });

  describe("_add() internal method", () => {
    it("should throw error for non-signal values", () => {
      const myTag = tag<number>();

      expect(() => {
        myTag._add({ value: 42 } as any);
      }).toThrow("Only signals created by rextive can be tagged");
    });

    it("should add signal successfully", () => {
      const myTag = tag<number>();
      const count = signal(0);

      myTag._add(count);

      expect(myTag.has(count)).toBe(true);
      expect(myTag.size).toBe(1);
    });
  });

  describe("_delete() internal method", () => {
    it("should delete signal from tag", () => {
      const myTag = tag<number>();
      const count = signal(0, { use: [myTag] });

      expect(myTag.size).toBe(1);
      myTag._delete(count);

      expect(myTag.size).toBe(0);
    });

    it("should handle deleting non-existent signal", () => {
      const myTag = tag<number>();
      const count = signal(0);

      expect(() => {
        myTag._delete(count);
      }).not.toThrow();
    });
  });

  describe("Multi-tag operations", () => {
    describe("tag.forEach()", () => {
      it("should iterate over signals from multiple tags", () => {
        const tag1 = tag<number>();
        const tag2 = tag<number>();

        const a = signal(1, { use: [tag1] });
        const b = signal(2, { use: [tag2] });
        const c = signal(3, { use: [tag1] });

        const visited: any[] = [];
        tag.forEach([tag1, tag2], (sig) => visited.push(sig));

        expect(visited).toContain(a);
        expect(visited).toContain(b);
        expect(visited).toContain(c);
        expect(visited.length).toBe(3);
      });

      it("should deduplicate signals in multiple tags", () => {
        const tag1 = tag<number>();
        const tag2 = tag<number>();

        const shared = signal(1, { use: [tag1, tag2] });
        const _a = signal(2, { use: [tag1] });
        void _a;
        const _b = signal(3, { use: [tag2] });
        void _b;

        const visited: any[] = [];
        tag.forEach([tag1, tag2], (sig) => visited.push(sig));

        // shared should appear only once
        expect(visited.filter((s) => s === shared).length).toBe(1);
        expect(visited.length).toBe(3);
      });

      it("should handle empty tags array", () => {
        const visited: any[] = [];
        tag.forEach([], (sig) => visited.push(sig));

        expect(visited).toEqual([]);
      });

      it("should handle tags with no signals", () => {
        const tag1 = tag<number>();
        const tag2 = tag<number>();

        const visited: any[] = [];
        tag.forEach([tag1, tag2], (sig) => visited.push(sig));

        expect(visited).toEqual([]);
      });
    });

    describe("tag.signals()", () => {
      it("should return signals from multiple tags", () => {
        const tag1 = tag<number>();
        const tag2 = tag<number>();

        const a = signal(1, { use: [tag1] });
        const b = signal(2, { use: [tag2] });

        const result = tag.signals([tag1, tag2]);

        expect(result).toContain(a);
        expect(result).toContain(b);
        expect(result.length).toBe(2);
      });

      it("should deduplicate signals in multiple tags", () => {
        const tag1 = tag<number>();
        const tag2 = tag<number>();

        const shared = signal(1, { use: [tag1, tag2] });
        const _a = signal(2, { use: [tag1] });
        void _a;

        const result = tag.signals([tag1, tag2]);

        expect(result.filter((s) => s === shared).length).toBe(1);
        expect(result.length).toBe(2);
      });

      it("should return empty array for empty tags", () => {
        const tag1 = tag<number>();
        const tag2 = tag<number>();

        const result = tag.signals([tag1, tag2]);

        expect(result).toEqual([]);
      });

      it("should return empty array for empty tags array", () => {
        const result = tag.signals([]);

        expect(result).toEqual([]);
      });
    });
  });

  describe("Practical use cases", () => {
    it("should support form field grouping and reset", () => {
      const formTag = tag<string>();

      const name = signal("", { use: [formTag] });
      const email = signal("", { use: [formTag] });
      const phone = signal("", { use: [formTag] });

      // Set values
      name.set("Alice");
      email.set("alice@example.com");
      phone.set("555-1234");

      expect(name()).toBe("Alice");
      expect(email()).toBe("alice@example.com");
      expect(phone()).toBe("555-1234");

      // Reset all form fields
      formTag.forEach((sig) => sig.reset());

      expect(name()).toBe("");
      expect(email()).toBe("");
      expect(phone()).toBe("");
    });

    it("should support resource cleanup via tag", () => {
      const resourceTag = tag<any>();

      signal({ id: 1 }, { use: [resourceTag] });
      signal({ id: 2 }, { use: [resourceTag] });
      signal({ id: 3 }, { use: [resourceTag] });

      expect(resourceTag.size).toBe(3);

      // Dispose all resources
      resourceTag.forEach((sig) => sig.dispose());

      // All should be auto-removed from tag after disposal
      expect(resourceTag.size).toBe(0);
    });

    it("should support debugging and logging", () => {
      const debugTag = tag<number>();

      signal(0, { use: [debugTag], name: "counter1" });
      signal(0, { use: [debugTag], name: "counter2" });

      const names: string[] = [];
      const values: number[] = [];

      debugTag.forEach((sig) => {
        names.push(sig.displayName || "unnamed");
        values.push(sig());
      });

      expect(names).toEqual(["counter1", "counter2"]);
      expect(values).toEqual([0, 0]);
    });
  });

  describe("Tag options", () => {
    describe("onAdd callback", () => {
      it("should call onAdd when signal is added", () => {
        const addedSignals: Signal<number>[] = [];
        const myTag = tag<number>({
          onAdd: (sig) => addedSignals.push(sig),
        });

        const sig1 = signal(1, { use: [myTag] });
        const sig2 = signal(2, { use: [myTag] });

        expect(addedSignals).toEqual([sig1, sig2]);
      });

      it("should pass tag instance to onAdd", () => {
        let receivedTag: any = null;
        const myTag = tag<number>({
          onAdd: (sig, t) => {
            void sig;
            receivedTag = t;
          },
        });

        signal(1, { use: [myTag] });

        expect(receivedTag).toBe(myTag);
      });

      it("should not call onAdd for duplicate additions", () => {
        let callCount = 0;
        const myTag = tag<number>({
          onAdd: () => callCount++,
        });

        const sig = signal(1);
        myTag._add(sig);
        myTag._add(sig); // Try to add again

        expect(callCount).toBe(1);
      });
    });

    describe("onDelete callback", () => {
      it("should call onDelete when signal is removed", () => {
        const deletedSignals: Signal<number>[] = [];
        const myTag = tag<number>({
          onDelete: (sig) => deletedSignals.push(sig),
        });

        const sig1 = signal(1, { use: [myTag] });
        const sig2 = signal(2, { use: [myTag] });

        myTag.delete(sig1);

        expect(deletedSignals).toEqual([sig1]);
        expect(deletedSignals).not.toContain(sig2);
      });

      it("should call onDelete when signal is disposed", () => {
        const deletedSignals: Signal<number>[] = [];
        const myTag = tag<number>({
          onDelete: (sig) => deletedSignals.push(sig),
        });

        const sig = signal(1, { use: [myTag] });
        sig.dispose();

        expect(deletedSignals).toEqual([sig]);
      });

      it("should call onDelete for each signal when tag is cleared", () => {
        const deletedSignals: Signal<number>[] = [];
        const myTag = tag<number>({
          onDelete: (sig) => deletedSignals.push(sig),
        });

        const sig1 = signal(1, { use: [myTag] });
        const sig2 = signal(2, { use: [myTag] });

        myTag.clear();

        expect(deletedSignals).toEqual([sig1, sig2]);
      });

      it("should pass tag instance to onDelete", () => {
        let receivedTag: any = null;
        const myTag = tag<number>({
          onDelete: (sig, t) => {
            void sig;
            receivedTag = t;
          },
        });

        const sig = signal(1, { use: [myTag] });
        myTag.delete(sig);

        expect(receivedTag).toBe(myTag);
      });
    });

    describe("onChange callback", () => {
      it("should call onChange when signal is added", () => {
        const changes: Array<{ type: string; signal: Signal<number> }> = [];
        const myTag = tag<number>({
          onChange: (type, sig) => changes.push({ type, signal: sig }),
        });

        const sig1 = signal(1, { use: [myTag] });
        const sig2 = signal(2, { use: [myTag] });

        expect(changes).toEqual([
          { type: "add", signal: sig1 },
          { type: "add", signal: sig2 },
        ]);
      });

      it("should call onChange when signal is deleted", () => {
        const changes: Array<{ type: string; signal: Signal<number> }> = [];
        const myTag = tag<number>({
          onChange: (type, sig) => changes.push({ type, signal: sig }),
        });

        const sig = signal(1, { use: [myTag] });
        myTag.delete(sig);

        expect(changes).toEqual([
          { type: "add", signal: sig },
          { type: "delete", signal: sig },
        ]);
      });

      it("should call onChange when signal is disposed", () => {
        const changes: Array<{ type: string }> = [];
        const myTag = tag<number>({
          onChange: (type) => changes.push({ type }),
        });

        const sig = signal(1, { use: [myTag] });
        sig.dispose();

        expect(changes).toEqual([{ type: "add" }, { type: "delete" }]);
      });

      it("should pass tag instance to onChange", () => {
        let receivedTag: any = null;
        const myTag = tag<number>({
          onChange: (type, sig, t) => {
            void type;
            void sig;
            receivedTag = t;
          },
        });

        signal(1, { use: [myTag] });

        expect(receivedTag).toBe(myTag);
      });
    });

    describe("maxSize option", () => {
      it("should enforce maximum size limit", () => {
        const myTag = tag<number>({ maxSize: 2 });

        signal(1, { use: [myTag] });
        signal(2, { use: [myTag] });

        expect(() => {
          signal(3, { use: [myTag] });
        }).toThrow("Tag has reached maximum size of 2");
      });

      it("should include tag name in error message", () => {
        const myTag = tag<number>({ name: "limitedTag", maxSize: 1 });

        signal(1, { use: [myTag] });

        expect(() => {
          signal(2, { use: [myTag] });
        }).toThrow('Tag "limitedTag" has reached maximum size of 1');
      });

      it("should allow adding signals after some are removed", () => {
        const myTag = tag<number>({ maxSize: 2 });

        const sig1 = signal(1, { use: [myTag] });
        const sig2 = signal(2, { use: [myTag] });
        void sig2;

        myTag.delete(sig1);

        expect(() => {
          signal(3, { use: [myTag] });
        }).not.toThrow();

        expect(myTag.size).toBe(2);
      });
    });

    describe("autoDispose option", () => {
      it("should automatically dispose signals when deleted from tag", () => {
        const myTag = tag<number>({ autoDispose: true });

        const sig = signal(1, { use: [myTag] });

        expect(() => sig()).not.toThrow();

        myTag.delete(sig);

        // Signal should be disposed - verify by trying to set (which throws)
        expect(() => sig.set(2)).toThrow("Cannot set value on disposed signal");
        // Can still read last value
        expect(sig()).toBe(1);
      });

      it("should dispose all signals when tag is cleared", () => {
        const myTag = tag<number>({ autoDispose: true });

        const sig1 = signal(1, { use: [myTag] });
        const sig2 = signal(2, { use: [myTag] });

        myTag.clear();

        // Both signals should be disposed - verify by trying to set
        expect(() => sig1.set(10)).toThrow(
          "Cannot set value on disposed signal"
        );
        expect(() => sig2.set(20)).toThrow(
          "Cannot set value on disposed signal"
        );
        // Can still read last values
        expect(sig1()).toBe(1);
        expect(sig2()).toBe(2);
      });

      it("should not double-dispose when signal is already being disposed", () => {
        const disposeCalls: number[] = [];
        const myTag = tag<number>({
          autoDispose: true,
          onDelete: () => disposeCalls.push(1),
        });

        const sig = signal(1, { use: [myTag] });

        // Dispose the signal directly (not via tag.delete)
        sig.dispose();

        // onDelete should be called once (from signal disposal)
        expect(disposeCalls.length).toBe(1);
      });

      it("should work with multiple tags, only disposing from autoDispose tag", () => {
        const autoTag = tag<number>({ autoDispose: true });
        const normalTag = tag<number>();

        const sig = signal(1, { use: [autoTag, normalTag] });

        autoTag.delete(sig);

        // Signal should be disposed and removed from both tags
        expect(() => sig.set(10)).toThrow(
          "Cannot set value on disposed signal"
        );
        expect(sig()).toBe(1); // Can still read
        expect(autoTag.has(sig)).toBe(false);
        expect(normalTag.has(sig)).toBe(false);
      });
    });

    describe("Combined options", () => {
      it("should work with all callbacks together", () => {
        const events: string[] = [];
        const myTag = tag<number>({
          name: "combined",
          onAdd: () => events.push("add"),
          onDelete: () => events.push("delete"),
          onChange: (type) => events.push(`change:${type}`),
        });

        const sig = signal(1, { use: [myTag] });
        myTag.delete(sig);

        expect(events).toEqual([
          "add",
          "change:add",
          "delete",
          "change:delete",
        ]);
      });

      it("should work with maxSize and autoDispose", () => {
        const myTag = tag<number>({ maxSize: 2, autoDispose: true });

        const sig1 = signal(1, { use: [myTag] });
        const sig2 = signal(2, { use: [myTag] });

        expect(() => {
          signal(3, { use: [myTag] });
        }).toThrow();

        myTag.delete(sig1);

        // sig1 should be disposed
        expect(() => sig1.set(10)).toThrow(
          "Cannot set value on disposed signal"
        );
        expect(sig1()).toBe(1); // Can still read

        // Should allow adding new signal now
        expect(() => {
          signal(3, { use: [myTag] });
        }).not.toThrow();
      });
    });
  });

  describe("nested tags (tags in tags)", () => {
    it("should store nested tags in use array", () => {
      const nestedTag = tag<number>();
      const parentTag = tag<number>({ use: [nestedTag] });

      expect(parentTag.use).toContain(nestedTag);
      expect(parentTag.use).toHaveLength(1);
    });

    it("should support mixed plugins and tags in use", () => {
      const plugin: Plugin<number> = (sig) => {
        return sig.on(() => {});
      };
      const nestedTag = tag<number>();
      const parentTag = tag<number>({ use: [plugin, nestedTag] });

      expect(parentTag.use).toHaveLength(2);
      expect(parentTag.use[0]).toBe(plugin);
      expect(parentTag.use[1]).toBe(nestedTag);
    });

    it("should support deeply nested tag hierarchies", () => {
      const level3 = tag<number>({ name: "level3" });
      const level2 = tag<number>({ name: "level2", use: [level3] });
      const level1 = tag<number>({ name: "level1", use: [level2] });

      expect(level1.use).toHaveLength(1);
      expect(level1.use[0]).toBe(level2);
      expect((level1.use[0] as Tag<number>).use).toHaveLength(1);
      expect((level1.use[0] as Tag<number>).use[0]).toBe(level3);
    });

    it("should handle empty use arrays", () => {
      const emptyTag = tag<number>({ use: [] });
      expect(emptyTag.use).toEqual([]);
      expect(emptyTag.use).toHaveLength(0);
    });

    it("should handle undefined use property", () => {
      const simpleTag = tag<number>();
      expect(simpleTag.use).toEqual([]);
    });

    it("should be immutable after creation", () => {
      const nestedTag = tag<number>();
      const parentTag = tag<number>({ use: [nestedTag] });

      // Verify it's readonly - TypeScript enforces this at compile time
      expect(parentTag.use).toBeInstanceOf(Array);
      expect(Object.isFrozen(parentTag.use)).toBe(false); // Arrays are not frozen, just typed as readonly

      // Verify that the use array is the one we passed in
      expect(parentTag.use[0]).toBe(nestedTag);
      expect(parentTag.use).toHaveLength(1);
    });

    it("should support complex tag composition", () => {
      const plugin1: Plugin<number> = vi.fn();
      const plugin2: Plugin<number> = vi.fn();
      const plugin3: Plugin<number> = vi.fn();

      const tag1 = tag<number>({ name: "tag1", use: [plugin1] });
      const tag2 = tag<number>({ name: "tag2", use: [plugin2] });
      const composedTag = tag<number>({
        name: "composed",
        use: [tag1, tag2, plugin3],
      });

      expect(composedTag.use).toHaveLength(3);
      expect(composedTag.use[0]).toBe(tag1);
      expect(composedTag.use[1]).toBe(tag2);
      expect(composedTag.use[2]).toBe(plugin3);
    });

    it("should support tag reuse in multiple parents", () => {
      const sharedTag = tag<number>({ name: "shared" });
      const parent1 = tag<number>({ name: "parent1", use: [sharedTag] });
      const parent2 = tag<number>({ name: "parent2", use: [sharedTag] });

      expect(parent1.use[0]).toBe(sharedTag);
      expect(parent2.use[0]).toBe(sharedTag);
      expect(parent1.use[0]).toBe(parent2.use[0]);
    });

    it("should handle circular references gracefully", () => {
      // Note: While we can create the structure, attacher should handle it gracefully
      const tag1 = tag<number>({ name: "tag1" });
      const tag2 = tag<number>({ name: "tag2", use: [tag1] });

      // Manually create circular reference (not through constructor)
      // This is just to test that the structure can exist
      expect(tag2.use).toContain(tag1);
    });
  });

  describe("plugin execution via tags", () => {
    it("should execute plugins when signal is added to tag via options", () => {
      const pluginSpy = vi.fn();
      const testTag = tag<number>({ use: [pluginSpy] });

      const sig = signal(42, { use: [testTag] });

      expect(pluginSpy).toHaveBeenCalledOnce();
      expect(pluginSpy).toHaveBeenCalledWith(sig);
    });

    it("should execute nested tag plugins", () => {
      const nestedPluginSpy = vi.fn();
      const parentPluginSpy = vi.fn();

      const nestedTag = tag<number>({ use: [nestedPluginSpy] });
      const parentTag = tag<number>({ use: [parentPluginSpy, nestedTag] });

      const sig = signal(42, { use: [parentTag] });

      expect(parentPluginSpy).toHaveBeenCalledOnce();
      expect(nestedPluginSpy).toHaveBeenCalledOnce();
      expect(parentPluginSpy).toHaveBeenCalledWith(sig);
      expect(nestedPluginSpy).toHaveBeenCalledWith(sig);
    });

    it("should execute plugins in correct order", () => {
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

      signal(42, { use: [tag3] });

      // Depth-first order
      expect(callOrder).toEqual([1, 2, 3]);
    });

    it("should collect and execute plugin cleanups on disposal", () => {
      const cleanup1 = vi.fn();
      const cleanup2 = vi.fn();

      const plugin1: Plugin<number> = () => cleanup1;
      const plugin2: Plugin<number> = () => cleanup2;

      const nestedTag = tag<number>({ use: [plugin1] });
      const parentTag = tag<number>({ use: [nestedTag, plugin2] });

      const sig = signal(42, { use: [parentTag] });

      sig.dispose();

      expect(cleanup1).toHaveBeenCalledOnce();
      expect(cleanup2).toHaveBeenCalledOnce();
    });
  });

  describe("map()", () => {
    it("should call reset() on all signals in the tag", () => {
      const myTag = tag<number>();
      const a = signal(10, { use: [myTag] });
      const b = signal(20, { use: [myTag] });
      const c = signal(30, { use: [myTag] });

      // Modify signals
      a.set(100);
      b.set(200);
      c.set(300);

      expect(a()).toBe(100);
      expect(b()).toBe(200);
      expect(c()).toBe(300);

      // Reset all signals in the tag
      myTag.map((s) => s.reset());

      expect(a()).toBe(10);
      expect(b()).toBe(20);
      expect(c()).toBe(30);
    });

    it("should call dispose() on all signals in the tag", () => {
      const myTag = tag<number>();
      const disposeCallbacks = [vi.fn(), vi.fn(), vi.fn()];

      const a = signal(1, { use: [myTag], onChange: disposeCallbacks[0] });
      const b = signal(2, { use: [myTag], onChange: disposeCallbacks[1] });
      const c = signal(3, { use: [myTag], onChange: disposeCallbacks[2] });

      // Verify signals are active
      a.set(10);
      b.set(20);
      c.set(30);

      expect(disposeCallbacks[0]).toHaveBeenCalledTimes(1);
      expect(disposeCallbacks[1]).toHaveBeenCalledTimes(1);
      expect(disposeCallbacks[2]).toHaveBeenCalledTimes(1);

      // Dispose all signals
      myTag.map((s) => s.dispose());

      // Signals should be removed from tag after dispose
      expect(myTag.size).toBe(0);
    });

    it("should call refresh() on signals in the tag", () => {
      const myTag = tag<number>();
      const base = signal(5);

      const computed = signal({ base }, ({ deps }) => deps.base * 2, {
        use: [myTag],
      });

      // Spy on refresh method
      const refreshSpy = vi.spyOn(computed, "refresh");

      // Refresh via tag
      myTag.map((s) => s.refresh());

      // Verify refresh was called
      expect(refreshSpy).toHaveBeenCalledTimes(1);

      refreshSpy.mockRestore();
    });

    it("should work on empty tag without errors", () => {
      const myTag = tag<number>();

      // Should not throw
      expect(() => myTag.map((s) => s.reset())).not.toThrow();
      expect(() => myTag.map((s) => s.dispose())).not.toThrow();
    });

    it("should pass arguments via closure", () => {
      const myTag = tag<number, "mutable">();
      const a = signal(0, { use: [myTag] });
      const b = signal(0, { use: [myTag] });

      // Use set with a value via closure
      myTag.map((s) => s.set(42));

      expect(a()).toBe(42);
      expect(b()).toBe(42);
    });

    it("should work with computed signal methods", () => {
      const myTag = tag<number, "computed">();
      const base = signal(5);

      const computed = signal({ base }, ({ deps }) => deps.base * 2, {
        use: [myTag],
      });

      expect(computed.paused()).toBe(false);

      // Pause via map
      myTag.map((s) => s.pause());
      expect(computed.paused()).toBe(true);

      // Resume via map
      myTag.map((s) => s.resume());
      expect(computed.paused()).toBe(false);
    });

    it("should return array of results from get()", () => {
      const myTag = tag<number>();
      const a = signal(10, { use: [myTag] });
      const b = signal(20, { use: [myTag] });
      const c = signal(30, { use: [myTag] });

      const values = myTag.map((s) => s.get());

      expect(values).toEqual([10, 20, 30]);
    });

    it("should return array of results from paused()", () => {
      const myTag = tag<number, "computed">();
      const base = signal(5);

      const comp1 = signal({ base }, ({ deps }) => deps.base * 2, {
        use: [myTag],
      });
      const comp2 = signal({ base }, ({ deps }) => deps.base * 3, {
        use: [myTag],
      });

      comp1.pause();

      const pausedStates = myTag.map((s) => s.paused());

      expect(pausedStates).toEqual([true, false]);
    });

    it("should return empty array for empty tag", () => {
      const myTag = tag<number>();

      const results = myTag.map((s) => s.get());

      expect(results).toEqual([]);
    });

    it("should return array with undefined for void methods", () => {
      const myTag = tag<number>();
      const a = signal(10, { use: [myTag] });
      const b = signal(20, { use: [myTag] });

      const results = myTag.map((s) => s.reset());

      // reset() returns undefined
      expect(results).toEqual([undefined, undefined]);
    });

    it("should allow custom transformations", () => {
      const myTag = tag<number>();
      signal(10, { use: [myTag], name: "a" });
      signal(20, { use: [myTag], name: "b" });
      signal(30, { use: [myTag], name: "c" });

      // Get signal names
      const names = myTag.map((s) => s.displayName);
      expect(names).toEqual(["a", "b", "c"]);

      // Get doubled values
      const doubled = myTag.map((s) => s.get() * 2);
      expect(doubled).toEqual([20, 40, 60]);
    });
  });
});
