import { describe, it, expect } from "vitest";
import { signal } from "../signal";
import { distinct, distinctUntilChanged } from "./distinct";

describe("distinct", () => {
  describe("distinctUntilChanged", () => {
    it("should only emit when value changes", () => {
      const source = signal(1);
      const distincted = distinctUntilChanged<number>()(source);
      const emissions: number[] = [];

      distincted.on(() => emissions.push(distincted()));

      source.set(1); // same, no emit
      source.set(2); // different, emit
      source.set(2); // same, no emit
      source.set(3); // different, emit
      source.set(3); // same, no emit
      source.set(1); // different, emit

      expect(emissions).toEqual([2, 3, 1]);
      expect(distincted()).toBe(1);
    });

    it("should use custom comparer", () => {
      const source = signal({ id: 1, name: "Alice" });
      const distincted = distinctUntilChanged<{ id: number; name: string }>(
        (a, b) => a.id === b.id
      )(source);
      const emissions: { id: number; name: string }[] = [];

      distincted.on(() => emissions.push(distincted()));

      source.set({ id: 1, name: "Bob" }); // same id, no emit
      source.set({ id: 2, name: "Charlie" }); // different id, emit
      source.set({ id: 2, name: "David" }); // same id, no emit
      source.set({ id: 3, name: "Eve" }); // different id, emit

      expect(emissions).toEqual([
        { id: 2, name: "Charlie" },
        { id: 3, name: "Eve" },
      ]);
    });

    it("should work with key selector", () => {
      const source = signal({ id: 1, name: "Alice" });
      const distincted = distinctUntilChanged<{ id: number; name: string }>(
        undefined,
        (x) => x.id
      )(source);
      const emissions: { id: number; name: string }[] = [];

      distincted.on(() => emissions.push(distincted()));

      source.set({ id: 1, name: "Bob" }); // same id, no emit
      source.set({ id: 2, name: "Charlie" }); // different id, emit
      source.set({ id: 2, name: "David" }); // same id, no emit

      expect(emissions).toEqual([{ id: 2, name: "Charlie" }]);
    });

    it("should clean up on dispose", () => {
      const source = signal(1);
      const distincted = distinctUntilChanged<number>()(source);

      expect(distincted()).toBe(1);

      distincted.dispose();

      // After dispose, just verify no errors during dispose
    });
  });

  describe("distinct (all-time unique)", () => {
    it("should only emit values never seen before", () => {
      const source = signal(1);
      const distincted = distinct<number>()(source);
      const emissions: number[] = [];

      distincted.on(() => emissions.push(distincted()));

      source.set(2); // new, emit
      source.set(1); // seen before (initial), no emit
      source.set(3); // new, emit
      source.set(2); // seen before, no emit
      source.set(4); // new, emit
      source.set(1); // seen before, no emit

      expect(emissions).toEqual([2, 3, 4]);
      expect(distincted()).toBe(4);
    });

    it("should use custom key selector", () => {
      const source = signal({ id: 1, name: "Alice" });
      const distincted = distinct<{ id: number; name: string }>(
        (x) => x.id
      )(source);
      const emissions: { id: number; name: string }[] = [];

      distincted.on(() => emissions.push(distincted()));

      source.set({ id: 2, name: "Bob" }); // new id, emit
      source.set({ id: 1, name: "Charlie" }); // seen id, no emit
      source.set({ id: 3, name: "David" }); // new id, emit
      source.set({ id: 2, name: "Eve" }); // seen id, no emit

      expect(emissions).toEqual([
        { id: 2, name: "Bob" },
        { id: 3, name: "David" },
      ]);
    });

    it("should work with primitives", () => {
      const source = signal("a");
      const distincted = distinct<string>()(source);
      const emissions: string[] = [];

      distincted.on(() => emissions.push(distincted()));

      source.set("b"); // new
      source.set("a"); // seen
      source.set("c"); // new
      source.set("b"); // seen
      source.set("d"); // new

      expect(emissions).toEqual(["b", "c", "d"]);
    });

    it("should clean up on dispose", () => {
      const source = signal(1);
      const distincted = distinct<number>()(source);

      expect(distincted()).toBe(1);

      distincted.dispose();

      // After dispose, just verify no errors during dispose
    });
  });
});

