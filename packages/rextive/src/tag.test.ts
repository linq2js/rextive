import { describe, it, expect } from "vitest";
import { tag } from "./tag";
import { signal } from "./index";
import { Signal } from "./types";

describe("tag", () => {
  describe("Basic tag operations", () => {
    it("should create an empty tag", () => {
      const myTag = tag<number>();
      expect(myTag.size).toBe(0);
      expect(myTag.signals()).toEqual([]);
    });

    it("should add signals to tag via options", () => {
      const myTag = tag<number>();
      const count = signal(0, { tags: [myTag] });

      expect(myTag.size).toBe(1);
      expect(myTag.has(count)).toBe(true);
      expect(myTag.signals()).toContain(count);
    });

    it("should add multiple signals to the same tag", () => {
      const myTag = tag<number>();
      const a = signal(1, { tags: [myTag] });
      const b = signal(2, { tags: [myTag] });
      const c = signal(3, { tags: [myTag] });

      expect(myTag.size).toBe(3);
      expect(myTag.signals()).toEqual([a, b, c]);
    });

    it("should support signals belonging to multiple tags", () => {
      const tag1 = tag<number>();
      const tag2 = tag<number>();
      const count = signal(0, { tags: [tag1, tag2] });

      expect(tag1.has(count)).toBe(true);
      expect(tag2.has(count)).toBe(true);
      expect(tag1.size).toBe(1);
      expect(tag2.size).toBe(1);
    });
  });

  describe("has()", () => {
    it("should return true for signals in the tag", () => {
      const myTag = tag<number>();
      const count = signal(0, { tags: [myTag] });

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
      const count = signal(0, { tags: [myTag] });

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
      const count = signal(0, { tags: [tag1, tag2] });

      tag1.delete(count);

      expect(tag1.has(count)).toBe(false);
      expect(tag2.has(count)).toBe(true);
    });
  });

  describe("clear()", () => {
    it("should remove all signals from the tag", () => {
      const myTag = tag<number>();
      signal(1, { tags: [myTag] });
      signal(2, { tags: [myTag] });
      signal(3, { tags: [myTag] });

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
      const a = signal(1, { tags: [myTag] });
      const b = signal(2, { tags: [myTag] });
      const c = signal(3, { tags: [myTag] });

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
      const a = signal(1, { tags: [myTag] });
      const b = signal(2, { tags: [myTag] });

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
      const a = signal(1, { tags: [myTag] });
      const b = signal(2, { tags: [myTag] });

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
      signal(1, { tags: [myTag] });

      const arr1 = myTag.signals();
      const arr2 = myTag.signals();

      expect(arr1).toEqual(arr2);
      expect(arr1).not.toBe(arr2); // Different array instances
    });
  });

  describe("Auto-removal on dispose", () => {
    it("should remove signal from tag when disposed", () => {
      const myTag = tag<number>();
      const count = signal(0, { tags: [myTag] });

      expect(myTag.size).toBe(1);
      count.dispose();

      expect(myTag.size).toBe(0);
      expect(myTag.has(count)).toBe(false);
    });

    it("should remove from all tags when disposed", () => {
      const tag1 = tag<number>();
      const tag2 = tag<number>();
      const count = signal(0, { tags: [tag1, tag2] });

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
        (myTag as any)._add({ value: 42 });
      }).toThrow("Only signals created by rextive can be tagged");
    });

    it("should add signal successfully", () => {
      const myTag = tag<number>();
      const count = signal(0);

      (myTag as any)._add(count);

      expect(myTag.has(count)).toBe(true);
      expect(myTag.size).toBe(1);
    });
  });

  describe("_delete() internal method", () => {
    it("should delete signal from tag", () => {
      const myTag = tag<number>();
      const count = signal(0, { tags: [myTag] });

      expect(myTag.size).toBe(1);
      (myTag as any)._delete(count);

      expect(myTag.size).toBe(0);
    });

    it("should handle deleting non-existent signal", () => {
      const myTag = tag<number>();
      const count = signal(0);

      expect(() => {
        (myTag as any)._delete(count);
      }).not.toThrow();
    });
  });

  describe("Multi-tag operations", () => {
    describe("tag.forEach()", () => {
      it("should iterate over signals from multiple tags", () => {
        const tag1 = tag<number>();
        const tag2 = tag<number>();

        const a = signal(1, { tags: [tag1] });
        const b = signal(2, { tags: [tag2] });
        const c = signal(3, { tags: [tag1] });

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

        const shared = signal(1, { tags: [tag1, tag2] });
        const _a = signal(2, { tags: [tag1] });
        const _b = signal(3, { tags: [tag2] });

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

        const a = signal(1, { tags: [tag1] });
        const b = signal(2, { tags: [tag2] });

        const result = tag.signals([tag1, tag2]);

        expect(result).toContain(a);
        expect(result).toContain(b);
        expect(result.length).toBe(2);
      });

      it("should deduplicate signals in multiple tags", () => {
        const tag1 = tag<number>();
        const tag2 = tag<number>();

        const shared = signal(1, { tags: [tag1, tag2] });
        const _a = signal(2, { tags: [tag1] });

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

      const name = signal("", { tags: [formTag] });
      const email = signal("", { tags: [formTag] });
      const phone = signal("", { tags: [formTag] });

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

      signal({ id: 1 }, { tags: [resourceTag] });
      signal({ id: 2 }, { tags: [resourceTag] });
      signal({ id: 3 }, { tags: [resourceTag] });

      expect(resourceTag.size).toBe(3);

      // Dispose all resources
      resourceTag.forEach((sig) => sig.dispose());

      // All should be auto-removed from tag after disposal
      expect(resourceTag.size).toBe(0);
    });

    it("should support debugging and logging", () => {
      const debugTag = tag<number>();

      signal(0, { tags: [debugTag], name: "counter1" });
      signal(0, { tags: [debugTag], name: "counter2" });

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

        const sig1 = signal(1, { tags: [myTag] });
        const sig2 = signal(2, { tags: [myTag] });

        expect(addedSignals).toEqual([sig1, sig2]);
      });

      it("should pass tag instance to onAdd", () => {
        let receivedTag: any = null;
        const myTag = tag<number>({
          onAdd: (sig, t) => {
            receivedTag = t;
          },
        });

        signal(1, { tags: [myTag] });

        expect(receivedTag).toBe(myTag);
      });

      it("should not call onAdd for duplicate additions", () => {
        let callCount = 0;
        const myTag = tag<number>({
          onAdd: () => callCount++,
        });

        const sig = signal(1);
        (myTag as any)._add(sig);
        (myTag as any)._add(sig); // Try to add again

        expect(callCount).toBe(1);
      });
    });

    describe("onDelete callback", () => {
      it("should call onDelete when signal is removed", () => {
        const deletedSignals: Signal<number>[] = [];
        const myTag = tag<number>({
          onDelete: (sig) => deletedSignals.push(sig),
        });

        const sig1 = signal(1, { tags: [myTag] });
        const sig2 = signal(2, { tags: [myTag] });

        myTag.delete(sig1);

        expect(deletedSignals).toEqual([sig1]);
        expect(deletedSignals).not.toContain(sig2);
      });

      it("should call onDelete when signal is disposed", () => {
        const deletedSignals: Signal<number>[] = [];
        const myTag = tag<number>({
          onDelete: (sig) => deletedSignals.push(sig),
        });

        const sig = signal(1, { tags: [myTag] });
        sig.dispose();

        expect(deletedSignals).toEqual([sig]);
      });

      it("should call onDelete for each signal when tag is cleared", () => {
        const deletedSignals: Signal<number>[] = [];
        const myTag = tag<number>({
          onDelete: (sig) => deletedSignals.push(sig),
        });

        const sig1 = signal(1, { tags: [myTag] });
        const sig2 = signal(2, { tags: [myTag] });

        myTag.clear();

        expect(deletedSignals).toEqual([sig1, sig2]);
      });

      it("should pass tag instance to onDelete", () => {
        let receivedTag: any = null;
        const myTag = tag<number>({
          onDelete: (sig, t) => {
            receivedTag = t;
          },
        });

        const sig = signal(1, { tags: [myTag] });
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

        const sig1 = signal(1, { tags: [myTag] });
        const sig2 = signal(2, { tags: [myTag] });

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

        const sig = signal(1, { tags: [myTag] });
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

        const sig = signal(1, { tags: [myTag] });
        sig.dispose();

        expect(changes).toEqual([{ type: "add" }, { type: "delete" }]);
      });

      it("should pass tag instance to onChange", () => {
        let receivedTag: any = null;
        const myTag = tag<number>({
          onChange: (type, sig, t) => {
            receivedTag = t;
          },
        });

        signal(1, { tags: [myTag] });

        expect(receivedTag).toBe(myTag);
      });
    });

    describe("maxSize option", () => {
      it("should enforce maximum size limit", () => {
        const myTag = tag<number>({ maxSize: 2 });

        signal(1, { tags: [myTag] });
        signal(2, { tags: [myTag] });

        expect(() => {
          signal(3, { tags: [myTag] });
        }).toThrow('Tag has reached maximum size of 2');
      });

      it("should include tag name in error message", () => {
        const myTag = tag<number>({ name: "limitedTag", maxSize: 1 });

        signal(1, { tags: [myTag] });

        expect(() => {
          signal(2, { tags: [myTag] });
        }).toThrow('Tag "limitedTag" has reached maximum size of 1');
      });

      it("should allow adding signals after some are removed", () => {
        const myTag = tag<number>({ maxSize: 2 });

        const sig1 = signal(1, { tags: [myTag] });
        const sig2 = signal(2, { tags: [myTag] });

        myTag.delete(sig1);

        expect(() => {
          signal(3, { tags: [myTag] });
        }).not.toThrow();

        expect(myTag.size).toBe(2);
      });
    });

    describe("autoDispose option", () => {
      it("should automatically dispose signals when deleted from tag", () => {
        const myTag = tag<number>({ autoDispose: true });

        const sig = signal(1, { tags: [myTag] });

        expect(() => sig()).not.toThrow();

        myTag.delete(sig);

        // Signal should be disposed - verify by trying to set (which throws)
        expect(() => sig.set(2)).toThrow("Cannot set value on disposed signal");
        // Can still read last value
        expect(sig()).toBe(1);
      });

      it("should dispose all signals when tag is cleared", () => {
        const myTag = tag<number>({ autoDispose: true });

        const sig1 = signal(1, { tags: [myTag] });
        const sig2 = signal(2, { tags: [myTag] });

        myTag.clear();

        // Both signals should be disposed - verify by trying to set
        expect(() => sig1.set(10)).toThrow("Cannot set value on disposed signal");
        expect(() => sig2.set(20)).toThrow("Cannot set value on disposed signal");
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

        const sig = signal(1, { tags: [myTag] });

        // Dispose the signal directly (not via tag.delete)
        sig.dispose();

        // onDelete should be called once (from signal disposal)
        expect(disposeCalls.length).toBe(1);
      });

      it("should work with multiple tags, only disposing from autoDispose tag", () => {
        const autoTag = tag<number>({ autoDispose: true });
        const normalTag = tag<number>();

        const sig = signal(1, { tags: [autoTag, normalTag] });

        autoTag.delete(sig);

        // Signal should be disposed and removed from both tags
        expect(() => sig.set(10)).toThrow("Cannot set value on disposed signal");
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

        const sig = signal(1, { tags: [myTag] });
        myTag.delete(sig);

        expect(events).toEqual(["add", "change:add", "delete", "change:delete"]);
      });

      it("should work with maxSize and autoDispose", () => {
        const myTag = tag<number>({ maxSize: 2, autoDispose: true });

        const sig1 = signal(1, { tags: [myTag] });
        const sig2 = signal(2, { tags: [myTag] });

        expect(() => {
          signal(3, { tags: [myTag] });
        }).toThrow();

        myTag.delete(sig1);

        // sig1 should be disposed
        expect(() => sig1.set(10)).toThrow("Cannot set value on disposed signal");
        expect(sig1()).toBe(1); // Can still read

        // Should allow adding new signal now
        expect(() => {
          signal(3, { tags: [myTag] });
        }).not.toThrow();
      });
    });
  });
});
