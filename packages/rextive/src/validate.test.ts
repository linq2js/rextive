/**
 * Tests for validate utility
 */
import { describe, it, expect } from "vitest";
import { validate, type ValidationResult } from "./validate";
import { signal } from "./signal";

describe("validate", () => {
  describe("function validators", () => {
    it("should handle boolean-returning validator (true)", () => {
      const isPositive = (x: number) => x > 0;
      const validator = validate(isPositive);

      const result = validator(5);

      expect(result.success).toBe(true);
      expect(result.value).toBe(5);
      expect("result" in result && result.result).toBe(true);
    });

    it("should handle boolean-returning validator (false)", () => {
      const isPositive = (x: number) => x > 0;
      const validator = validate(isPositive);

      const result = validator(-5);

      expect(result.success).toBe(false);
      expect(result.value).toBe(-5);
      expect("result" in result && result.result).toBe(false);
    });

    it("should handle validator returning non-boolean result", () => {
      const transform = (x: number) => ({ doubled: x * 2 });
      const validator = validate(transform);

      const result = validator(5);

      expect(result.success).toBe(true);
      expect(result.value).toBe(5);
      expect("result" in result && result.result).toEqual({ doubled: 10 });
    });

    it("should handle throwing validator", () => {
      const mustBePositive = (x: number) => {
        if (x <= 0) throw new Error("Must be positive");
        return x;
      };
      const validator = validate(mustBePositive);

      const result = validator(-5);

      expect(result.success).toBe(false);
      expect(result.value).toBe(-5);
      expect("error" in result).toBe(true);
      expect("error" in result && result.error).toBeInstanceOf(Error);
      expect("error" in result && (result.error as Error).message).toBe(
        "Must be positive"
      );
    });

    it("should return result when throwing validator succeeds", () => {
      const mustBePositive = (x: number) => {
        if (x <= 0) throw new Error("Must be positive");
        return x * 2;
      };
      const validator = validate(mustBePositive);

      const result = validator(5);

      expect(result.success).toBe(true);
      expect(result.value).toBe(5);
      expect("result" in result && result.result).toBe(10);
    });
  });

  describe("object validators (isValid method)", () => {
    it("should handle object with isValid method returning true", () => {
      const schema = {
        isValid: (value: { name: string }) => value.name.length > 0,
      };
      const validator = validate(schema);

      const result = validator({ name: "John" });

      expect(result.success).toBe(true);
      expect(result.value).toEqual({ name: "John" });
    });

    it("should handle object with isValid method returning false", () => {
      const schema = {
        isValid: (value: { name: string }) => value.name.length > 0,
      };
      const validator = validate(schema);

      const result = validator({ name: "" });

      expect(result.success).toBe(false);
      expect(result.value).toEqual({ name: "" });
    });

    it("should handle object with isValid method returning non-boolean", () => {
      const schema = {
        isValid: (value: { name: string }) => ({
          valid: value.name.length > 0,
          length: value.name.length,
        }),
      };
      const validator = validate(schema);

      const result = validator({ name: "John" });

      expect(result.success).toBe(true);
      expect(result.value).toEqual({ name: "John" });
      expect("result" in result && result.result).toEqual({
        valid: true,
        length: 4,
      });
    });

    it("should handle object with throwing isValid method", () => {
      const schema = {
        isValid: (value: { name: string }) => {
          if (!value.name) throw new Error("Name is required");
          return true;
        },
      };
      const validator = validate(schema);

      const result = validator({ name: "" });

      expect(result.success).toBe(false);
      expect("error" in result).toBe(true);
    });
  });

  describe("integration with signals", () => {
    it("should work with signal.to() for reactive validation", () => {
      const isPositive = (x: number) => x > 0;
      const count = signal(5);
      const validated = count.to(validate(isPositive));

      expect(validated().success).toBe(true);
      expect(validated().value).toBe(5);

      count.set(-1);
      expect(validated().success).toBe(false);
      expect(validated().value).toBe(-1);

      count.set(10);
      expect(validated().success).toBe(true);
      expect(validated().value).toBe(10);
    });

    it("should preserve original value in result", () => {
      const schema = {
        isValid: (user: { name: string; age: number }) =>
          user.name.length > 0 && user.age >= 0,
      };
      const user = signal({ name: "Alice", age: 30 });
      const validated = user.to(validate(schema));

      const result = validated();
      expect(result.value).toBe(user()); // Same reference
      expect(result.success).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle null value", () => {
      const isNotNull = (x: unknown) => x !== null;
      const validator = validate(isNotNull);

      const result = validator(null);
      expect(result.success).toBe(false);
      expect(result.value).toBe(null);
    });

    it("should handle undefined value", () => {
      const isDefined = (x: unknown) => x !== undefined;
      const validator = validate(isDefined);

      const result = validator(undefined);
      expect(result.success).toBe(false);
      expect(result.value).toBe(undefined);
    });

    it("should handle async-like return (Promise)", () => {
      // Note: validate doesn't await, so Promise is treated as non-boolean result
      const asyncValidator = (x: number) => Promise.resolve(x > 0);
      const validator = validate(asyncValidator);

      const result = validator(5);
      expect(result.success).toBe(true);
      expect("result" in result && result.result).toBeInstanceOf(Promise);
    });

    it("should handle validator that returns 0", () => {
      // 0 is falsy but not boolean
      const returnZero = () => 0;
      const validator = validate(returnZero);

      const result = validator("any");
      expect(result.success).toBe(true);
      expect("result" in result && result.result).toBe(0);
    });

    it("should handle validator that returns empty string", () => {
      // Empty string is falsy but not boolean
      const returnEmpty = () => "";
      const validator = validate(returnEmpty);

      const result = validator("any");
      expect(result.success).toBe(true);
      expect("result" in result && result.result).toBe("");
    });
  });

  describe("type inference", () => {
    it("should infer types correctly for boolean validator", () => {
      const isString = (x: unknown): x is string => typeof x === "string";
      const validator = validate(isString);

      const result: ValidationResult<unknown, boolean> = validator("hello");
      expect(result.success).toBe(true);
    });

    it("should infer types correctly for complex result", () => {
      type ParseResult = { success: true; data: string } | { success: false };
      const parser = (x: string): ParseResult =>
        x.length > 0 ? { success: true, data: x } : { success: false };

      const validator = validate(parser);
      const result = validator("hello");

      expect(result.success).toBe(true);
      if ("result" in result) {
        expect(result.result).toEqual({ success: true, data: "hello" });
      }
    });
  });
});

