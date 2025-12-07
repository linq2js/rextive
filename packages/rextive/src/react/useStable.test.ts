import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useStable } from "./useStable";

describe("useStable", () => {
  describe("single key-value (overload 1)", () => {
    describe("functions", () => {
      it("should return stable function reference", () => {
        const { result, rerender } = renderHook(() => {
          const stable = useStable<{ onClick: () => string }>();
          return {
            stable,
            fn: stable("onClick", () => "first"),
          };
        });

        const fn1 = result.current.fn;

        // Rerender with new function
        rerender();
        const fn2 = result.current.stable("onClick", () => "second");

        // Same reference
        expect(fn1).toBe(fn2);
      });

      it("should call the latest function implementation", () => {
        let callCount = 0;

        const { result, rerender } = renderHook(
          ({ increment }) => {
            const stable = useStable<{ increment: () => void }>();
            return stable("increment", increment);
          },
          {
            initialProps: {
              increment: () => {
                callCount += 1;
              },
            },
          }
        );

        result.current();
        expect(callCount).toBe(1);

        // Update with new implementation
        rerender({
          increment: () => {
            callCount += 10;
          },
        });

        // Should call the NEW implementation
        result.current();
        expect(callCount).toBe(11);
      });

      it("should preserve function arguments and return value", () => {
        const { result } = renderHook(() => {
          const stable = useStable<{ add: (a: number, b: number) => number }>();
          return stable("add", (a: number, b: number) => a + b);
        });

        expect(result.current(2, 3)).toBe(5);
      });
    });

    describe("objects", () => {
      it("should return cached object if equal (default Object.is)", () => {
        const obj = { theme: "dark" };
        const { result, rerender } = renderHook(
          ({ config }) => {
            const stable = useStable<{ config: typeof config }>();
            return stable("config", config);
          },
          { initialProps: { config: obj } }
        );

        const obj1 = result.current;

        // Same reference - should return cached
        rerender({ config: obj });
        const obj2 = result.current;

        expect(obj1).toBe(obj2);
      });

      it("should return new object if not equal (default Object.is)", () => {
        const { result, rerender } = renderHook(
          ({ config }) => {
            const stable = useStable<{ config: { theme: string } }>();
            return stable("config", config);
          },
          { initialProps: { config: { theme: "dark" } } }
        );

        const obj1 = result.current;

        // New reference - should update
        rerender({ config: { theme: "dark" } }); // Different reference even if same content
        const obj2 = result.current;

        expect(obj1).not.toBe(obj2);
      });

      it("should return cached object with shallow equality", () => {
        const { result, rerender } = renderHook(
          ({ config }) => {
            const stable = useStable<{ config: { theme: string } }>();
            return stable("config", config, "shallow");
          },
          { initialProps: { config: { theme: "dark" } } }
        );

        const obj1 = result.current;

        // New reference but shallowly equal
        rerender({ config: { theme: "dark" } });
        const obj2 = result.current;

        expect(obj1).toBe(obj2); // Cached because shallow equal
      });

      it("should return new object with shallow equality when different", () => {
        const { result, rerender } = renderHook(
          ({ config }) => {
            const stable = useStable<{ config: { theme: string } }>();
            return stable("config", config, "shallow");
          },
          { initialProps: { config: { theme: "dark" } } }
        );

        const obj1 = result.current;

        // Different content
        rerender({ config: { theme: "light" } });
        const obj2 = result.current;

        expect(obj1).not.toBe(obj2);
        expect(obj2).toEqual({ theme: "light" });
      });
    });

    describe("arrays", () => {
      it("should return cached array with shallow equality", () => {
        const { result, rerender } = renderHook(
          ({ items }) => {
            const stable = useStable<{ items: number[] }>();
            return stable("items", items, "shallow");
          },
          { initialProps: { items: [1, 2, 3] } }
        );

        const arr1 = result.current;

        // New reference but shallowly equal
        rerender({ items: [1, 2, 3] });
        const arr2 = result.current;

        expect(arr1).toBe(arr2);
      });

      it("should return new array when different", () => {
        const { result, rerender } = renderHook(
          ({ items }) => {
            const stable = useStable<{ items: number[] }>();
            return stable("items", items, "shallow");
          },
          { initialProps: { items: [1, 2, 3] } }
        );

        const arr1 = result.current;

        rerender({ items: [1, 2, 4] });
        const arr2 = result.current;

        expect(arr1).not.toBe(arr2);
        expect(arr2).toEqual([1, 2, 4]);
      });
    });

    describe("primitives", () => {
      it("should return primitives directly", () => {
        const { result } = renderHook(() => {
          const stable = useStable<{
            count: number;
            name: string;
            active: boolean;
          }>();
          return {
            count: stable("count", 42),
            name: stable("name", "test"),
            active: stable("active", true),
          };
        });

        expect(result.current.count).toBe(42);
        expect(result.current.name).toBe("test");
        expect(result.current.active).toBe(true);
      });

      it("should return cached primitive with strict equality", () => {
        const { result, rerender } = renderHook(
          ({ count }) => {
            const stable = useStable<{ count: number }>();
            return stable("count", count);
          },
          { initialProps: { count: 42 } }
        );

        const val1 = result.current;

        rerender({ count: 42 });
        const val2 = result.current;

        // Primitives use Object.is by default
        expect(val1).toBe(val2);
      });
    });

    describe("custom equality", () => {
      it("should use custom equals function", () => {
        const { result, rerender } = renderHook(
          ({ items }) => {
            const stable = useStable<{ items: number[] }>();
            // Custom equality: compare by length only
            return stable("items", items, (a, b) => a.length === b.length);
          },
          { initialProps: { items: [1, 2, 3] } }
        );

        const arr1 = result.current;

        // Different content but same length
        rerender({ items: [4, 5, 6] });
        const arr2 = result.current;

        expect(arr1).toBe(arr2); // Cached because same length
      });
    });
  });

  describe("partial object (overload 2)", () => {
    it("should stabilize multiple values at once", () => {
      const { result, rerender } = renderHook(() => {
        const stable = useStable<{
          onClick: () => void;
          onHover: () => void;
        }>();
        return stable({
          onClick: () => console.log("click"),
          onHover: () => console.log("hover"),
        });
      });

      const handlers1 = result.current;
      const onClick1 = handlers1.onClick;
      const onHover1 = handlers1.onHover;

      rerender();

      const handlers2 = result.current;
      const onClick2 = handlers2.onClick;
      const onHover2 = handlers2.onHover;

      // Functions should be stable
      expect(onClick1).toBe(onClick2);
      expect(onHover1).toBe(onHover2);
    });

    it("should stabilize objects with equality", () => {
      const { result, rerender } = renderHook(
        ({ config }) => {
          const stable = useStable<{
            config: { theme: string };
            count: number;
          }>();
          return stable({ config, count: 42 }, "shallow");
        },
        { initialProps: { config: { theme: "dark" } } }
      );

      const result1 = result.current;

      // New reference but shallowly equal
      rerender({ config: { theme: "dark" } });
      const result2 = result.current;

      expect(result1.config).toBe(result2.config);
      expect(result1.count).toBe(result2.count);
    });

    it("should handle mixed types in partial", () => {
      let clickCount = 0;

      const { result, rerender } = renderHook(
        ({ items }) => {
          const stable = useStable<{
            onClick: () => void;
            items: number[];
          }>();
          return stable(
            {
              onClick: () => {
                clickCount++;
              },
              items,
            },
            "shallow"
          );
        },
        { initialProps: { items: [1, 2, 3] } }
      );

      const result1 = result.current;
      result1.onClick();
      expect(clickCount).toBe(1);

      // Update items but same content
      rerender({ items: [1, 2, 3] });
      const result2 = result.current;

      // Function should be stable
      expect(result1.onClick).toBe(result2.onClick);
      // Items should be cached (shallow equal)
      expect(result1.items).toBe(result2.items);

      // Function should still work with latest implementation
      result2.onClick();
      expect(clickCount).toBe(2);
    });
  });

  describe("type safety", () => {
    it("should infer correct types for single key", () => {
      const { result } = renderHook(() => {
        const stable = useStable<{
          count: number;
          name: string;
          handler: (x: number) => string;
        }>();

        const count: number = stable("count", 42);
        const name: string = stable("name", "test");
        const handler: (x: number) => string = stable(
          "handler",
          (x) => `value: ${x}`
        );

        return { count, name, handler };
      });

      expect(result.current.count).toBe(42);
      expect(result.current.name).toBe("test");
      expect(result.current.handler(5)).toBe("value: 5");
    });

    it("should infer correct types for partial", () => {
      const { result } = renderHook(() => {
        const stable = useStable<{
          a: number;
          b: string;
          c: boolean;
        }>();

        const partial = stable({ a: 1, b: "test" });

        // TypeScript should know the shape
        const a: number = partial.a;
        const b: string = partial.b;

        return { a, b };
      });

      expect(result.current.a).toBe(1);
      expect(result.current.b).toBe("test");
    });
  });

  describe("edge cases", () => {
    it("should handle null and undefined values", () => {
      const { result, rerender } = renderHook(
        ({ value }) => {
          const stable = useStable<{ value: string | null | undefined }>();
          return stable("value", value);
        },
        { initialProps: { value: null as string | null | undefined } }
      );

      expect(result.current).toBe(null);

      rerender({ value: undefined });
      expect(result.current).toBe(undefined);

      rerender({ value: "test" });
      expect(result.current).toBe("test");
    });

    it("should handle deep equality for nested objects", () => {
      const { result, rerender } = renderHook(
        ({ config }) => {
          const stable = useStable<{
            config: { nested: { value: number } };
          }>();
          return stable("config", config, "deep");
        },
        { initialProps: { config: { nested: { value: 1 } } } }
      );

      const obj1 = result.current;

      // Deeply equal but different references
      rerender({ config: { nested: { value: 1 } } });
      const obj2 = result.current;

      expect(obj1).toBe(obj2); // Cached because deeply equal
    });

    it("should update when deep equality differs", () => {
      const { result, rerender } = renderHook(
        ({ config }) => {
          const stable = useStable<{
            config: { nested: { value: number } };
          }>();
          return stable("config", config, "deep");
        },
        { initialProps: { config: { nested: { value: 1 } } } }
      );

      const obj1 = result.current;

      rerender({ config: { nested: { value: 2 } } });
      const obj2 = result.current;

      expect(obj1).not.toBe(obj2);
      expect(obj2).toEqual({ nested: { value: 2 } });
    });
  });
});
