import { describe, it, expect } from "vitest";
import { defineContext, addUseMethod } from "./defineContext";

describe("defineContext", () => {
  it("should create a context with provided properties", () => {
    const ctx = defineContext((name: string, age: number) => ({
      name,
      age,
    }));

    const instance = ctx.create("Alice", 30);

    expect(instance.name).toBe("Alice");
    expect(instance.age).toBe(30);
  });

  it("should add a use method to the context", () => {
    const ctx = defineContext((name: string) => ({ name }));
    const instance = ctx.create("Bob");

    expect(typeof instance.use).toBe("function");
  });

  it("should allow using logic functions with the context", () => {
    const ctx = defineContext((value: number) => ({ value }));
    const instance = ctx.create(10);

    const result = instance.use((context, multiplier: number) => {
      return context.value * multiplier;
    }, 5);

    expect(result).toBe(50);
  });

  it("should work with no arguments", () => {
    const ctx = defineContext(() => ({ count: 0 }));
    const instance = ctx.create();

    expect(instance.count).toBe(0);
  });

  it("should allow chaining use calls", () => {
    const ctx = defineContext((initial: number) => ({ value: initial }));
    const instance = ctx.create(5);

    const doubled = instance.use((c) => c.value * 2);
    const result = instance.use((c, add: number) => c.value + add, doubled);

    expect(result).toBe(15); // 5 + 10
  });
});

describe("addUseMethod", () => {
  it("should add use method to a plain object", () => {
    const obj = { foo: "bar", count: 42 };
    const enhanced = addUseMethod(obj);

    expect(typeof enhanced.use).toBe("function");
    expect(enhanced.foo).toBe("bar");
    expect(enhanced.count).toBe(42);
  });

  it("should allow using logic functions", () => {
    const obj = { value: 10 };
    const enhanced = addUseMethod(obj);

    const result = enhanced.use((ctx, multiplier: number) => {
      return ctx.value * multiplier;
    }, 3);

    expect(result).toBe(30);
  });

  it("should work with complex objects", () => {
    const obj = {
      items: [1, 2, 3],
      getName: () => "test",
    };
    const enhanced = addUseMethod(obj);

    const sum = enhanced.use((ctx) => ctx.items.reduce((a, b) => a + b, 0));
    expect(sum).toBe(6);

    const name = enhanced.use((ctx) => ctx.getName());
    expect(name).toBe("test");
  });

  it("should preserve this context in use method", () => {
    const obj = { x: 5, y: 10 };
    const enhanced = addUseMethod(obj);

    const result = enhanced.use((ctx) => ctx.x + ctx.y);
    expect(result).toBe(15);
  });
});

