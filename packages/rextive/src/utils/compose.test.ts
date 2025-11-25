import { describe, it, expect } from "vitest";
import { compose } from "./compose";

describe("compose", () => {
  describe("basic functionality", () => {
    it("should compose two functions", () => {
      const add1 = (x: number) => x + 1;
      const multiply2 = (x: number) => x * 2;
      const composed = compose(add1, multiply2);

      // compose(add1, multiply2)(5) = add1(multiply2(5)) = add1(10) = 11
      expect(composed(5)).toBe(11);
    });

    it("should compose three functions", () => {
      const add1 = (x: number) => x + 1;
      const multiply2 = (x: number) => x * 2;
      const subtract3 = (x: number) => x - 3;
      const composed = compose(add1, multiply2, subtract3);

      // compose(add1, multiply2, subtract3)(5) = add1(multiply2(subtract3(5)))
      // = add1(multiply2(2)) = add1(4) = 5
      expect(composed(5)).toBe(5);
    });

    it("should compose multiple functions (more than 3)", () => {
      const add1 = (x: number) => x + 1;
      const multiply2 = (x: number) => x * 2;
      const subtract3 = (x: number) => x - 3;
      const divide2 = (x: number) => x / 2;
      const composed = compose(add1, multiply2, subtract3, divide2);

      // compose(add1, multiply2, subtract3, divide2)(10)
      // = add1(multiply2(subtract3(divide2(10))))
      // = add1(multiply2(subtract3(5))) = add1(multiply2(2)) = add1(4) = 5
      expect(composed(10)).toBe(5);
    });

    it("should compose 9 functions", () => {
      const add1 = (x: number) => x + 1;
      const multiply2 = (x: number) => x * 2;
      const subtract3 = (x: number) => x - 3;
      const divide2 = (x: number) => x / 2;
      const add5 = (x: number) => x + 5;
      const multiply3 = (x: number) => x * 3;
      const subtract1 = (x: number) => x - 1;
      const divide5 = (x: number) => x / 5;
      const add10 = (x: number) => x + 10;

      const composed = compose(
        add10,
        divide5,
        subtract1,
        multiply3,
        add5,
        divide2,
        subtract3,
        multiply2,
        add1
      );

      // Working from right to left:
      // add1(10) = 11
      // multiply2(11) = 22
      // subtract3(22) = 19
      // divide2(19) = 9.5
      // add5(9.5) = 14.5
      // multiply3(14.5) = 43.5
      // subtract1(43.5) = 42.5
      // divide5(42.5) = 8.5
      // add10(8.5) = 18.5
      expect(composed(10)).toBe(18.5);
    });

    it("should compose 10 functions", () => {
      const add1 = (x: number) => x + 1;
      const multiply2 = (x: number) => x * 2;
      const subtract3 = (x: number) => x - 3;
      const divide2 = (x: number) => x / 2;
      const add5 = (x: number) => x + 5;
      const multiply3 = (x: number) => x * 3;
      const subtract1 = (x: number) => x - 1;
      const divide5 = (x: number) => x / 5;
      const add10 = (x: number) => x + 10;
      const multiply10 = (x: number) => x * 10;

      const composed = compose(
        multiply10,
        add10,
        divide5,
        subtract1,
        multiply3,
        add5,
        divide2,
        subtract3,
        multiply2,
        add1
      );

      // Working from right to left:
      // add1(10) = 11
      // multiply2(11) = 22
      // subtract3(22) = 19
      // divide2(19) = 9.5
      // add5(9.5) = 14.5
      // multiply3(14.5) = 43.5
      // subtract1(43.5) = 42.5
      // divide5(42.5) = 8.5
      // add10(8.5) = 18.5
      // multiply10(18.5) = 185
      expect(composed(10)).toBe(185);
    });

    it("should work with single function", () => {
      const add1 = (x: number) => x + 1;
      const composed = compose(add1);

      expect(composed(5)).toBe(6);
    });

    it("should preserve function return types", () => {
      const toString = (x: number): string => x.toString();
      const length = (s: string): number => s.length;
      const composed = compose(length, toString);

      expect(composed(12345)).toBe(5);
    });
  });

  describe("type transformations", () => {
    it("should handle type transformations", () => {
      const toArray = (x: number): number[] => [x];
      const sum = (arr: number[]): number => arr.reduce((a, b) => a + b, 0);
      const toString = (x: number): string => `Result: ${x}`;
      const composed = compose(toString, sum, toArray);

      expect(composed(42)).toBe("Result: 42");
    });

    it("should work with object transformations", () => {
      interface User {
        name: string;
        age: number;
      }

      const getUser = (id: number): User => ({
        name: `User${id}`,
        age: id * 2,
      });
      const getName = (user: User): string => user.name;
      const toUpperCase = (s: string): string => s.toUpperCase();
      const composed = compose(toUpperCase, getName, getUser);

      expect(composed(5)).toBe("USER5");
    });
  });

  describe("edge cases", () => {
    it("should handle identity function", () => {
      const identity = <T>(x: T): T => x;
      const add1 = (x: number) => x + 1;
      const composed = compose(identity, add1);

      expect(composed(5)).toBe(6);
    });

    it("should work with functions that return undefined", () => {
      const returnUndefined = (): undefined => undefined;
      const handleUndefined = (x: undefined): string => "handled";
      const composed = compose(handleUndefined, returnUndefined);

      // @ts-expect-error: Expected 1 arguments, but got 0.
      expect(composed()).toBe("handled");
    });

    it("should work with functions that return null", () => {
      const returnNull = (): null => null;
      const handleNull = (x: null): string => "null handled";
      const composed = compose(handleNull, returnNull);

      // @ts-expect-error: Expected 1 arguments, but got 0.
      expect(composed()).toBe("null handled");
    });

    it("should work with boolean transformations", () => {
      const isEven = (x: number): boolean => x % 2 === 0;
      const negate = (b: boolean): boolean => !b;
      const composed = compose(negate, isEven);

      expect(composed(4)).toBe(false);
      expect(composed(5)).toBe(true);
    });
  });

  describe("real-world use cases", () => {
    it("should work with string transformations", () => {
      const trim = (s: string): string => s.trim();
      const toLowerCase = (s: string): string => s.toLowerCase();
      const removeSpaces = (s: string): string => s.replace(/\s+/g, "-");
      const composed = compose(removeSpaces, toLowerCase, trim);

      expect(composed("  Hello World  ")).toBe("hello-world");
    });

    it("should work with array operations", () => {
      const numbers = [1, 2, 3, 4, 5];
      const double = (arr: number[]): number[] => arr.map((x) => x * 2);
      const filterEven = (arr: number[]): number[] =>
        arr.filter((x) => x % 2 === 0);
      const sum = (arr: number[]): number => arr.reduce((a, b) => a + b, 0);
      const composed = compose(sum, filterEven, double);

      // double: [2, 4, 6, 8, 10]
      // filterEven: [2, 4, 6, 8, 10]
      // sum: 30
      expect(composed(numbers)).toBe(30);
    });

    it("should work with validation pipeline", () => {
      const validate = (x: number): number | null => (x > 0 ? x : null);
      const double = (x: number | null): number | null =>
        x !== null ? x * 2 : null;
      const format = (x: number | null): string =>
        x !== null ? `Value: ${x}` : "Invalid";
      const composed = compose(format, double, validate);

      expect(composed(5)).toBe("Value: 10");
      expect(composed(-5)).toBe("Invalid");
    });
  });

  describe("function arity", () => {
    it("should pass through all arguments to the rightmost function", () => {
      const add = (a: number, b: number): number => a + b;
      const double = (x: number): number => x * 2;
      const composed = compose(double, add);

      // @ts-expect-error: Expected 2 arguments, but got 1.
      expect(composed(3, 4)).toBe(14); // (3 + 4) * 2
    });

    it("should handle functions with different arities", () => {
      const max = (...nums: number[]): number => Math.max(...nums);
      const double = (x: number): number => x * 2;
      const toString = (x: number): string => x.toString();
      const composed = compose(toString, double, max);

      expect(composed(1, 5, 3, 2)).toBe("10"); // max(1,5,3,2) = 5, double(5) = 10
    });
  });
});
