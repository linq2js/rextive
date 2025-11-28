import { describe, it, expect, beforeEach } from "vitest";
import { signal } from "../signal";
import { tag } from "../tag";
import { resetCounter, nextName, getCounter } from "./nameGenerator";

describe("nameGenerator", () => {
  beforeEach(() => {
    resetCounter();
  });

  describe("nextName", () => {
    it("should generate names with mutable prefix", () => {
      expect(nextName("mutable")).toBe("mutable-1");
      expect(nextName("mutable")).toBe("mutable-2");
      expect(nextName("mutable")).toBe("mutable-3");
    });

    it("should generate names with computed prefix", () => {
      expect(nextName("computed")).toBe("computed-1");
      expect(nextName("computed")).toBe("computed-2");
      expect(nextName("computed")).toBe("computed-3");
    });

    it("should generate names with tag prefix", () => {
      expect(nextName("tag")).toBe("tag-1");
      expect(nextName("tag")).toBe("tag-2");
      expect(nextName("tag")).toBe("tag-3");
    });

    it("should use single shared counter across all prefixes", () => {
      expect(nextName("mutable")).toBe("mutable-1");
      expect(nextName("computed")).toBe("computed-2");
      expect(nextName("tag")).toBe("tag-3");
      expect(nextName("mutable")).toBe("mutable-4");
    });
  });

  describe("resetCounter", () => {
    it("should reset counter to 0", () => {
      nextName("mutable");
      nextName("mutable");
      nextName("computed");

      resetCounter();

      expect(nextName("mutable")).toBe("mutable-1");
      expect(nextName("computed")).toBe("computed-2");
    });
  });

  describe("getCounter", () => {
    it("should return current counter value", () => {
      nextName("mutable");
      nextName("mutable");
      nextName("computed");

      expect(getCounter()).toBe(3);
    });
  });

  describe("signal integration", () => {
    it("should auto-generate mutable signal names when not provided", () => {
      const sig1 = signal(0);
      const sig2 = signal("hello");
      const sig3 = signal({ x: 1 });

      expect(sig1.displayName).toBe("mutable-1");
      expect(sig2.displayName).toBe("mutable-2");
      expect(sig3.displayName).toBe("mutable-3");
    });

    it("should auto-generate computed signal names with shared counter", () => {
      const a = signal(1, { name: "a" });
      const b = signal(2, { name: "b" });

      // Counter starts at 0, mutable signals with names don't increment
      const sum = signal({ a, b }, ({ deps }) => deps.a + deps.b);
      const product = signal({ a, b }, ({ deps }) => deps.a * deps.b);

      expect(sum.displayName).toBe("computed-1");
      expect(product.displayName).toBe("computed-2");
    });

    it("should use shared counter across mutable and computed signals", () => {
      const m1 = signal(1); // mutable-1
      const m2 = signal(2); // mutable-2
      const c1 = signal({ m1 }, ({ deps }) => deps.m1 * 2); // computed-3
      const m3 = signal(3); // mutable-4
      const c2 = signal({ m2 }, ({ deps }) => deps.m2 * 2); // computed-5

      expect(m1.displayName).toBe("mutable-1");
      expect(m2.displayName).toBe("mutable-2");
      expect(c1.displayName).toBe("computed-3");
      expect(m3.displayName).toBe("mutable-4");
      expect(c2.displayName).toBe("computed-5");
    });

    it("should use provided name over auto-generated name", () => {
      const sig = signal(0, { name: "myCounter" });
      expect(sig.displayName).toBe("myCounter");
    });

    it("should use provided name for computed signals", () => {
      const a = signal(1);
      const doubled = signal({ a }, ({ deps }) => deps.a * 2, {
        name: "doubled",
      });

      expect(doubled.displayName).toBe("doubled");
    });

    it("should handle mixed named and unnamed signals", () => {
      const unnamed1 = signal(1);
      const named = signal(2, { name: "named" });
      const unnamed2 = signal(3);

      expect(unnamed1.displayName).toBe("mutable-1");
      expect(named.displayName).toBe("named");
      expect(unnamed2.displayName).toBe("mutable-2");
    });

    it("should include auto-generated name in FallbackError", () => {
      let thrownError: Error | undefined;

      const sig = signal(
        () => {
          throw new Error("original");
        },
        {
          fallback: () => {
            throw new Error("fallback failed");
          },
        }
      );

      try {
        sig();
      } catch (e) {
        thrownError = e as Error;
      }

      expect(thrownError).toBeDefined();
      expect(thrownError!.message).toContain("mutable-");
    });
  });

  describe("tag integration", () => {
    it("should auto-generate tag names when not provided", () => {
      const tag1 = tag<number>();
      const tag2 = tag<string>();
      const tag3 = tag<boolean>();

      expect(tag1.displayName).toBe("tag-1");
      expect(tag2.displayName).toBe("tag-2");
      expect(tag3.displayName).toBe("tag-3");
    });

    it("should use provided name for tags", () => {
      const myTag = tag<number>({ name: "myTag" });
      expect(myTag.displayName).toBe("myTag");
    });

    it("should handle mixed named and unnamed tags", () => {
      const unnamed1 = tag<number>();
      const named = tag<string>({ name: "namedTag" });
      const unnamed2 = tag<boolean>();

      expect(unnamed1.displayName).toBe("tag-1");
      expect(named.displayName).toBe("namedTag");
      expect(unnamed2.displayName).toBe("tag-2");
    });

    it("should use shared counter across signals and tags", () => {
      const sig1 = signal(1); // mutable-1
      const tag1 = tag<number>(); // tag-2
      const sig2 = signal(2); // mutable-3
      const tag2 = tag<string>(); // tag-4
      const computed1 = signal({ sig1 }, ({ deps }) => deps.sig1 * 2); // computed-5

      expect(sig1.displayName).toBe("mutable-1");
      expect(tag1.displayName).toBe("tag-2");
      expect(sig2.displayName).toBe("mutable-3");
      expect(tag2.displayName).toBe("tag-4");
      expect(computed1.displayName).toBe("computed-5");
    });
  });
});
