import { describe, it, expect, vi } from "vitest";
import { tag } from "./tag";
import { signal } from "./signal";
import { withDispatchers } from "./dispatcher";
import { disposableToken } from "./disposableDispatcher";
import { emitter } from "./emitter";

describe("tag", () => {
  describe("basic operations", () => {
    it("should create a tag", () => {
      const myTag = tag<string>();

      expect(myTag).toBeDefined();
      expect(typeof myTag.forEach).toBe("function");
      expect(typeof myTag.has).toBe("function");
      expect(typeof myTag.delete).toBe("function");
      expect(typeof myTag.clear).toBe("function");
      expect(typeof myTag.signals).toBe("function");
      expect(myTag.size).toBe(0);
    });

    it("should register signals with tags", () => {
      const stringTag = tag<string>();
      const name = signal("John", { tags: [stringTag] });
      const email = signal("john@example.com", { tags: [stringTag] });

      expect(stringTag.size).toBe(2);
      expect(stringTag.has(name)).toBe(true);
      expect(stringTag.has(email)).toBe(true);
    });

    it("should iterate over signals in tag", () => {
      const numberTag = tag<number>();
      signal(1, { tags: [numberTag] });
      signal(25, { tags: [numberTag] });

      const values: number[] = [];
      numberTag.forEach((s) => values.push(s.peek()));

      expect(values).toEqual([1, 25]);
    });

    it("should return all signals as array", () => {
      const boolTag = tag<boolean>();
      const flag1 = signal(true, { tags: [boolTag] });
      const flag2 = signal(false, { tags: [boolTag] });

      const signals = boolTag.signals();

      expect(signals).toHaveLength(2);
      expect(signals).toContain(flag1);
      expect(signals).toContain(flag2);
    });

    it("should check if signal is in tag", () => {
      const myTag = tag<string>();
      const s1 = signal("a", { tags: [myTag] });
      const s2 = signal("b");

      expect(myTag.has(s1)).toBe(true);
      expect(myTag.has(s2)).toBe(false);
    });

    it("should delete signal from tag", () => {
      const myTag = tag<string>();
      const s1 = signal("a", { tags: [myTag] });

      expect(myTag.has(s1)).toBe(true);
      expect(myTag.delete(s1)).toBe(true);
      expect(myTag.has(s1)).toBe(false);
      expect(myTag.size).toBe(0);
    });

    it("should return false when deleting non-existent signal", () => {
      const myTag = tag<string>();
      const s1 = signal("a");

      expect(myTag.delete(s1)).toBe(false);
    });

    it("should clear all signals from tag", () => {
      const myTag = tag<string>();
      signal("a", { tags: [myTag] });
      signal("b", { tags: [myTag] });
      signal("c", { tags: [myTag] });

      expect(myTag.size).toBe(3);

      myTag.clear();

      expect(myTag.size).toBe(0);
    });
  });

  describe("multiple tags", () => {
    it("should allow signal to belong to multiple tags", () => {
      const tag1 = tag<string>();
      const tag2 = tag<string>();
      const s1 = signal("value", { tags: [tag1, tag2] });

      expect(tag1.has(s1)).toBe(true);
      expect(tag2.has(s1)).toBe(true);
      expect(tag1.size).toBe(1);
      expect(tag2.size).toBe(1);
    });

    it("should remove from all tags when deleted individually", () => {
      const tag1 = tag<string>();
      const tag2 = tag<string>();
      const s1 = signal("value", { tags: [tag1, tag2] });

      tag1.delete(s1);

      expect(tag1.has(s1)).toBe(false);
      expect(tag2.has(s1)).toBe(true); // Still in tag2
    });
  });

  describe("static forEach method", () => {
    it("should iterate over multiple tags", () => {
      const tag1 = tag<string>();
      const tag2 = tag<string>();

      signal("a", { tags: [tag1] });
      signal("b", { tags: [tag1] });
      signal("c", { tags: [tag2] });
      signal("d", { tags: [tag2] });

      const values: string[] = [];
      tag.forEach([tag1, tag2], (s) => {
        values.push(s.peek());
      });

      expect(values).toEqual(["a", "b", "c", "d"]);
    });

    it("should deduplicate signals in multiple tags", () => {
      const tag1 = tag<string>();
      const tag2 = tag<string>();

      const shared = signal("shared", { tags: [tag1, tag2] });
      signal("only1", { tags: [tag1] });
      signal("only2", { tags: [tag2] });

      const signals: any[] = [];
      tag.forEach([tag1, tag2], (s) => {
        signals.push(s);
      });

      // Should include shared only once
      expect(signals).toHaveLength(3);
      expect(signals.filter((s) => s === shared)).toHaveLength(1);
    });

    it("should handle union types correctly", () => {
      const stringTag = tag<string>();
      const numberTag = tag<number>();

      signal("hello", { tags: [stringTag] });
      signal(42, { tags: [numberTag] });

      const values: Array<string | number> = [];
      tag.forEach([stringTag, numberTag], (s) => {
        // Signal type is MutableSignal<string | number>
        values.push(s.peek());
      });

      expect(values).toContain("hello");
      expect(values).toContain(42);
    });

    it("should work with empty tag array", () => {
      const callback = vi.fn();
      tag.forEach([], callback);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("static signals method", () => {
    it("should return signals from multiple tags", () => {
      const tag1 = tag<string>();
      const tag2 = tag<string>();

      const s1 = signal("a", { tags: [tag1] });
      const s2 = signal("b", { tags: [tag2] });

      const signals = tag.signals([tag1, tag2]);

      expect(signals).toHaveLength(2);
      expect(signals).toContain(s1);
      expect(signals).toContain(s2);
    });

    it("should deduplicate signals", () => {
      const tag1 = tag<number>();
      const tag2 = tag<number>();

      const shared = signal(100, { tags: [tag1, tag2] });
      signal(1, { tags: [tag1] });
      signal(2, { tags: [tag2] });

      const signals = tag.signals([tag1, tag2]);

      expect(signals).toHaveLength(3);
      expect(signals.filter((s) => s === shared)).toHaveLength(1);
    });

    it("should return empty array for empty tag array", () => {
      const signals = tag.signals([]);
      expect(signals).toEqual([]);
    });
  });

  describe("automatic cleanup", () => {
    it("should remove signals when disposed via disposableToken", () => {
      const myTag = tag<string>();
      const cleanup = emitter<void>();

      let s1: any;
      withDispatchers([disposableToken(cleanup)], () => {
        s1 = signal("value", { tags: [myTag] });
      });

      expect(myTag.has(s1)).toBe(true);
      expect(myTag.size).toBe(1);

      // Trigger disposal
      cleanup.emit();

      expect(myTag.has(s1)).toBe(false);
      expect(myTag.size).toBe(0);
    });

    it("should handle multiple signals cleanup", () => {
      const myTag = tag<number>();
      const cleanup = emitter<void>();

      withDispatchers([disposableToken(cleanup)], () => {
        signal(1, { tags: [myTag] });
        signal(2, { tags: [myTag] });
        signal(3, { tags: [myTag] });
      });

      expect(myTag.size).toBe(3);

      cleanup.emit();

      expect(myTag.size).toBe(0);
    });

    it("should remove from all tags on disposal", () => {
      const tag1 = tag<string>();
      const tag2 = tag<string>();
      const cleanup = emitter<void>();

      withDispatchers([disposableToken(cleanup)], () => {
        signal("value", { tags: [tag1, tag2] });
      });

      expect(tag1.size).toBe(1);
      expect(tag2.size).toBe(1);

      cleanup.emit();

      expect(tag1.size).toBe(0);
      expect(tag2.size).toBe(0);
    });
  });

  describe("use cases", () => {
    it("should support form reset pattern", () => {
      const formTag = tag<string>();
      const name = signal("John", { tags: [formTag] });
      const email = signal("john@example.com", { tags: [formTag] });

      // User edits
      name.set("Jane");
      email.set("jane@example.com");

      expect(name()).toBe("Jane");
      expect(email()).toBe("jane@example.com");

      // Reset form
      formTag.forEach((s) => s.reset());

      expect(name()).toBe("John");
      expect(email()).toBe("john@example.com");
    });

    it("should support batch updates", () => {
      const counterTag = tag<number>();
      const count1 = signal(0, { tags: [counterTag] });
      const count2 = signal(0, { tags: [counterTag] });
      const count3 = signal(0, { tags: [counterTag] });

      // Increment all counters
      counterTag.forEach((s) => s.set((prev) => prev + 1));

      expect(count1()).toBe(1);
      expect(count2()).toBe(1);
      expect(count3()).toBe(1);
    });

    it("should support conditional operations", () => {
      const numberTag = tag<number>();
      const a = signal(5, { tags: [numberTag] });
      const b = signal(10, { tags: [numberTag] });
      const c = signal(15, { tags: [numberTag] });

      // Reset only values > 10
      numberTag.forEach((s) => {
        if (s.peek() > 10) {
          s.reset();
        }
      });

      expect(a()).toBe(5); // Unchanged
      expect(b()).toBe(10); // Unchanged
      expect(c()).toBe(15); // Reset to initial value
    });

    it("should support debugging pattern", () => {
      const debugTag = tag<any>();
      signal(42, { tags: [debugTag] });
      signal("Alice", { tags: [debugTag] });
      signal(true, { tags: [debugTag] });

      const logs: unknown[] = [];
      debugTag.forEach((s) => {
        logs.push(s.peek());
      });

      expect(logs).toEqual([42, "Alice", true]);
    });

    it("should support selective operations with multiple tags", () => {
      const requiredTag = tag<string>();
      const optionalTag = tag<string>();

      const name = signal("", { tags: [requiredTag] });
      const email = signal("", { tags: [requiredTag] });
      signal("", { tags: [optionalTag] });

      // Validate only required fields
      const hasEmptyRequired = requiredTag
        .signals()
        .some((s) => s.peek() === "");

      expect(hasEmptyRequired).toBe(true);

      // Fill required fields
      name.set("John");
      email.set("john@example.com");

      expect(hasEmptyRequired).toBe(true); // Still referencing old closure

      // Re-check
      const hasEmptyRequired2 = requiredTag
        .signals()
        .some((s) => s.peek() === "");

      expect(hasEmptyRequired2).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle signal without tags", () => {
      const s1 = signal("value");

      expect(s1).toBeDefined();
      expect(s1()).toBe("value");
    });

    it("should handle empty tags array", () => {
      const s1 = signal("value", { tags: [] });

      expect(s1).toBeDefined();
      expect(s1()).toBe("value");
    });

    it("should not throw when deleting after clear", () => {
      const myTag = tag<string>();
      const s1 = signal("a", { tags: [myTag] });

      myTag.clear();

      expect(() => myTag.delete(s1)).not.toThrow();
      expect(myTag.delete(s1)).toBe(false);
    });

    it("should maintain separate state for different tags", () => {
      const tag1 = tag<string>();
      const tag2 = tag<string>();

      signal("a", { tags: [tag1] });
      signal("b", { tags: [tag2] });

      expect(tag1.size).toBe(1);
      expect(tag2.size).toBe(1);

      tag1.clear();

      expect(tag1.size).toBe(0);
      expect(tag2.size).toBe(1);
    });
  });

  describe("type safety", () => {
    it("should maintain type information", () => {
      const stringTag = tag<string>();
      const s1 = signal("hello", { tags: [stringTag] });

      stringTag.forEach((s) => {
        // TypeScript should infer s as MutableSignal<string>
        const value: string = s.peek();
        expect(typeof value).toBe("string");
      });
    });

    it("should work with union types in multi-tag operations", () => {
      const stringTag = tag<string>();
      const numberTag = tag<number>();

      signal("test", { tags: [stringTag] });
      signal(123, { tags: [numberTag] });

      tag.forEach([stringTag, numberTag], (s) => {
        const value = s.peek();
        // value is string | number
        expect(typeof value === "string" || typeof value === "number").toBe(
          true
        );
      });
    });
  });
});
