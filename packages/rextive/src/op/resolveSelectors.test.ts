import { describe, it, expect } from "vitest";
import { resolveSelectors, resolveSelectorsRequired } from "./resolveSelectors";

describe("resolveSelectors", () => {
  describe("resolveSelectors", () => {
    it("should return undefined selector for empty args", () => {
      const [selector, options] = resolveSelectors([]);

      expect(selector).toBeUndefined();
      expect(options).toEqual({});
    });

    it("should handle single selector", () => {
      const fn = (x: number) => x * 2;
      const [selector, options] = resolveSelectors([fn]);

      expect(selector).toBe(fn);
      expect(options).toEqual({});
    });

    it("should compose multiple selectors", () => {
      const double = (x: number) => x * 2;
      const addOne = (x: number) => x + 1;
      const [selector, options] = resolveSelectors([double, addOne]);

      expect(selector).toBeDefined();
      expect(selector!(5, {} as any)).toBe(11); // (5 * 2) + 1
      expect(options).toEqual({});
    });

    it("should extract string options", () => {
      const fn = (x: number) => x * 2;
      const [selector, options] = resolveSelectors([fn, "shallow"]);

      expect(selector).toBe(fn);
      expect(options).toEqual({ equals: "shallow" });
    });

    it("should extract object options", () => {
      const fn = (x: number) => x * 2;
      const opts = { name: "test", equals: "deep" as const };
      const [selector, options] = resolveSelectors([fn, opts]);

      expect(selector).toBe(fn);
      expect(options).toEqual(opts);
    });

    it("should handle multiple selectors with options", () => {
      const double = (x: number) => x * 2;
      const addOne = (x: number) => x + 1;
      const [selector, options] = resolveSelectors([
        double,
        addOne,
        "shallow",
      ]);

      expect(selector).toBeDefined();
      expect(selector!(5, {} as any)).toBe(11);
      expect(options).toEqual({ equals: "shallow" });
    });

    it("should return undefined selector when only options provided", () => {
      const [selector, options] = resolveSelectors(["shallow"]);

      expect(selector).toBeUndefined();
      expect(options).toEqual({ equals: "shallow" });
    });

    it("should pass context to composed selectors", () => {
      const ctx = { deps: { source: 10 } };
      const receivedContexts: any[] = [];

      const s1 = (x: number, c: any) => {
        receivedContexts.push(c);
        return x * 2;
      };
      const s2 = (x: number, c: any) => {
        receivedContexts.push(c);
        return x + 1;
      };

      const [selector] = resolveSelectors([s1, s2]);
      selector!(5, ctx as any);

      expect(receivedContexts).toHaveLength(2);
      expect(receivedContexts[0]).toBe(ctx);
      expect(receivedContexts[1]).toBe(ctx);
    });

    it("should handle 3 selectors", () => {
      const s1 = (x: number) => x * 2;
      const s2 = (x: number) => x + 1;
      const s3 = (x: number) => `Result: ${x}`;

      const [selector] = resolveSelectors([s1, s2, s3]);
      expect(selector!(5, {} as any)).toBe("Result: 11");
    });

    it("should ignore non-function values in the middle", () => {
      const s1 = (x: number) => x * 2;
      const [selector, options] = resolveSelectors([s1, undefined, "shallow"]);

      // undefined in the middle is filtered out, "shallow" is options
      expect(selector).toBe(s1);
      expect(options).toEqual({ equals: "shallow" });
    });
  });

  describe("resolveSelectorsRequired", () => {
    it("should throw when no selectors provided", () => {
      expect(() => resolveSelectorsRequired([])).toThrow(
        "At least one selector function is required"
      );
    });

    it("should throw when only options provided", () => {
      expect(() => resolveSelectorsRequired(["shallow"])).toThrow(
        "At least one selector function is required"
      );
    });

    it("should return selector when provided", () => {
      const fn = (x: number) => x * 2;
      const [selector, options] = resolveSelectorsRequired([fn]);

      expect(selector).toBe(fn);
      expect(options).toEqual({});
    });

    it("should return composed selector with options", () => {
      const s1 = (x: number) => x * 2;
      const s2 = (x: number) => x + 1;
      const [selector, options] = resolveSelectorsRequired([
        s1,
        s2,
        { name: "computed" },
      ]);

      expect(selector(5, {} as any)).toBe(11);
      expect(options).toEqual({ name: "computed" });
    });
  });
});

