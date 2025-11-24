import { describe, it, expect } from "vitest";
import { resolveEquals } from "./resolveEquals";
import { shallowEquals } from "./shallowEquals";
import isEqual from "lodash/isEqual";

describe("resolveEquals", () => {
  it("should return undefined for 'strict' strategy", () => {
    const result = resolveEquals("strict");
    expect(result).toBeUndefined();
  });

  it("should return undefined for undefined", () => {
    const result = resolveEquals(undefined);
    expect(result).toBeUndefined();
  });

  it("should return shallowEquals for 'shallow' strategy", () => {
    const result = resolveEquals("shallow");
    expect(result).toBe(shallowEquals);
  });

  it("should return lodash isEqual for 'deep' strategy", () => {
    const result = resolveEquals("deep");
    expect(result).toBe(isEqual);
  });

  it("should return custom function as-is", () => {
    const customEquals = (a: any, b: any) => a.id === b.id;
    const result = resolveEquals(customEquals);
    expect(result).toBe(customEquals);
  });

  it("should work with 'shallow' strategy in practice", () => {
    const equals = resolveEquals("shallow");
    expect(equals).toBeDefined();
    expect(equals!({ a: 1 }, { a: 1 })).toBe(true);
    expect(equals!({ a: 1 }, { a: 2 })).toBe(false);
  });

  it("should work with 'deep' strategy in practice", () => {
    const equals = resolveEquals("deep");
    expect(equals).toBeDefined();
    expect(equals!({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
    expect(equals!({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
  });

  it("should work with custom equals in practice", () => {
    const customEquals = (a: { id: number }, b: { id: number }) =>
      a.id === b.id;
    const equals = resolveEquals(customEquals);
    expect(equals).toBe(customEquals);
    expect(equals!({ id: 1 }, { id: 1 })).toBe(true);
    expect(equals!({ id: 1 }, { id: 2 })).toBe(false);
  });
});
