import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { signal } from "./signal";
import { history } from "./history";

describe("signal.history", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should track signal value changes", async () => {
    const count = signal(0);
    const hist = history(() => count());

    // Initial value recorded immediately
    vi.runAllTimers();
    expect(hist().length).toBe(1);
    expect(hist()[0].value).toBe(0);
    expect(hist()[0].index).toBe(0);

    // Change value
    count.set(1);
    vi.runAllTimers();

    expect(hist().length).toBe(2);
    expect(hist()[1].value).toBe(1);
    expect(hist()[1].index).toBe(1);
  });

  it("should include timestamp in each entry", () => {
    const count = signal(0);
    const hist = history(() => count());

    vi.runAllTimers();

    expect(hist()[0].timestamp).toBeTypeOf("number");
    expect(hist()[0].timestamp).toBeGreaterThan(0);
  });

  it("should apply debouncing", () => {
    const count = signal(0);
    const hist = history(() => count(), { debounce: 300 });

    vi.runAllTimers();
    expect(hist().length).toBe(1);

    // Make rapid changes
    count.set(1);
    count.set(2);
    count.set(3);

    // Before debounce time
    vi.advanceTimersByTime(200);
    expect(hist().length).toBe(1); // Still only initial

    // After debounce time
    vi.advanceTimersByTime(100);
    expect(hist().length).toBe(2); // Added last value only
    expect(hist()[1].value).toBe(3);
  });

  it("should respect maxLength option", () => {
    const count = signal(0);
    const hist = history(() => count(), { maxLength: 3 });

    vi.runAllTimers();

    // Add more entries than maxLength
    for (let i = 1; i <= 5; i++) {
      count.set(i);
      vi.runAllTimers();
    }

    expect(hist().length).toBe(3);
    expect(hist()[0].value).toBe(3); // Oldest kept
    expect(hist()[1].value).toBe(4);
    expect(hist()[2].value).toBe(5); // Newest
  });

  it("should use shouldRecord filter", () => {
    const count = signal(0);
    const hist = history(() => count(), {
      shouldRecord: (prev, next) => {
        // Only record even numbers
        return next.value % 2 === 0;
      },
    });

    vi.runAllTimers();
    expect(hist().length).toBe(1); // 0 is even

    count.set(1);
    vi.runAllTimers();
    expect(hist().length).toBe(1); // 1 is odd, not recorded

    count.set(2);
    vi.runAllTimers();
    expect(hist().length).toBe(2); // 2 is even, recorded

    count.set(3);
    vi.runAllTimers();
    expect(hist().length).toBe(2); // 3 is odd, not recorded

    expect(hist()[0].value).toBe(0);
    expect(hist()[1].value).toBe(2);
  });

  it("should use shouldRecord with prev comparison", () => {
    const count = signal(0);
    const hist = history(() => count(), {
      shouldRecord: (prev, next) => {
        // Only record if value actually changed
        return !prev || prev.value !== next.value;
      },
    });

    vi.runAllTimers();
    expect(hist().length).toBe(1);

    // Set to same value
    count.set(0);
    vi.runAllTimers();
    expect(hist().length).toBe(1); // Not recorded

    // Set to different value
    count.set(1);
    vi.runAllTimers();
    expect(hist().length).toBe(2); // Recorded
  });

  it("should track object changes", () => {
    const user = signal({ name: "John", age: 30 });
    const hist = history(() => user());

    vi.runAllTimers();

    user.set({ name: "Jane", age: 30 });
    vi.runAllTimers();

    expect(hist().length).toBe(2);
    expect(hist()[0].value).toEqual({ name: "John", age: 30 });
    expect(hist()[1].value).toEqual({ name: "Jane", age: 30 });
  });

  it("should track nested signal changes", () => {
    const formData = {
      name: signal("John"),
      email: signal("john@example.com"),
    };

    const hist = history(() => ({
      name: formData.name(),
      email: formData.email(),
    }));

    vi.runAllTimers();

    formData.name.set("Jane");
    vi.runAllTimers();

    expect(hist().length).toBe(2);
    expect(hist()[0].value).toEqual({ name: "John", email: "john@example.com" });
    expect(hist()[1].value).toEqual({ name: "Jane", email: "john@example.com" });
  });

  it("should maintain sequential indices", () => {
    const count = signal(0);
    const hist = history(() => count(), {
      maxLength: 3,
    });

    vi.runAllTimers();

    for (let i = 1; i <= 5; i++) {
      count.set(i);
      vi.runAllTimers();
    }

    // Even though old entries are removed, indices should still be sequential
    expect(hist()[0].index).toBe(3);
    expect(hist()[1].index).toBe(4);
    expect(hist()[2].index).toBe(5);
  });

  it("should work with computed signals", () => {
    const a = signal(1);
    const b = signal(2);
    const sum = signal(() => a() + b());

    const hist = history(() => sum());

    vi.runAllTimers();
    expect(hist()[0].value).toBe(3);

    a.set(5);
    vi.runAllTimers();
    expect(hist()[1].value).toBe(7);

    b.set(10);
    vi.runAllTimers();
    expect(hist()[2].value).toBe(15);
  });

  it("should handle rapid changes with debounce", () => {
    const count = signal(0);
    const hist = history(() => count(), { debounce: 100 });

    vi.runAllTimers();

    // Rapid fire changes
    count.set(1);
    vi.advanceTimersByTime(50);
    count.set(2);
    vi.advanceTimersByTime(50);
    count.set(3);
    vi.advanceTimersByTime(50);

    // Still waiting for debounce
    expect(hist().length).toBe(1);

    // Complete debounce
    vi.advanceTimersByTime(100);
    expect(hist().length).toBe(2);
    expect(hist()[1].value).toBe(3); // Only last value recorded
  });

  it("should allow filtering with complex logic", () => {
    const data = signal({ value: 0, important: false });
    const hist = history(() => data(), {
      shouldRecord: (prev, next) => {
        // Only record if value changed by more than 5 OR important flag is set
        if (next.value.important) return true;
        if (!prev) return true;
        return Math.abs(next.value.value - prev.value.value) > 5;
      },
    });

    vi.runAllTimers();

    data.set({ value: 1, important: false });
    vi.runAllTimers();
    expect(hist().length).toBe(1); // Change < 5, not recorded

    data.set({ value: 10, important: false });
    vi.runAllTimers();
    expect(hist().length).toBe(2); // Change > 5, recorded

    data.set({ value: 11, important: true });
    vi.runAllTimers();
    expect(hist().length).toBe(3); // Important flag, recorded
  });

  it("should work with arrays", () => {
    const items = signal([1, 2, 3]);
    const hist = history(() => items());

    vi.runAllTimers();

    items.set([1, 2, 3, 4]);
    vi.runAllTimers();

    expect(hist().length).toBe(2);
    expect(hist()[0].value).toEqual([1, 2, 3]);
    expect(hist()[1].value).toEqual([1, 2, 3, 4]);
  });

  it("should use snapshot for extracting signal values", () => {
    const nested = {
      count: signal(0),
      user: signal({ name: "John" }),
    };

    const hist = history(() => nested);

    vi.runAllTimers();

    // History should contain extracted values, not signals
    expect(hist()[0].value.count).toBe(0);
    expect(hist()[0].value.user).toEqual({ name: "John" });
  });

  it("should handle default debounce of 0", () => {
    const count = signal(0);
    const hist = history(() => count()); // No debounce option

    vi.runAllTimers();

    count.set(1);
    vi.runAllTimers();

    expect(hist().length).toBe(2);
  });

  it("should handle Infinity maxLength", () => {
    const count = signal(0);
    const hist = history(() => count()); // No maxLength option

    vi.runAllTimers();

    // Add many entries
    for (let i = 1; i <= 100; i++) {
      count.set(i);
      vi.runAllTimers();
    }

    expect(hist().length).toBe(101); // All entries kept
  });

  describe("query utilities", () => {
    it("should get latest entry", () => {
      const count = signal(0);
      const hist = history(() => count());

      vi.runAllTimers();
      expect(hist.latest()?.value).toBe(0);

      count.set(1);
      vi.runAllTimers();
      expect(hist.latest()?.value).toBe(1);

      count.set(2);
      vi.runAllTimers();
      expect(hist.latest()?.value).toBe(2);
    });

    it("should get oldest entry", () => {
      const count = signal(0);
      const hist = history(() => count());

      vi.runAllTimers();

      count.set(1);
      vi.runAllTimers();

      count.set(2);
      vi.runAllTimers();

      expect(hist.oldest()?.value).toBe(0);
      expect(hist.oldest()?.index).toBe(0);
    });

    it("should get entry at index", () => {
      const count = signal(0);
      const hist = history(() => count());

      vi.runAllTimers();

      count.set(1);
      vi.runAllTimers();

      count.set(2);
      vi.runAllTimers();

      expect(hist.at(0)?.value).toBe(0);
      expect(hist.at(1)?.value).toBe(1);
      expect(hist.at(2)?.value).toBe(2);
    });

    it("should support negative indices", () => {
      const count = signal(0);
      const hist = history(() => count());

      vi.runAllTimers();

      count.set(1);
      vi.runAllTimers();

      count.set(2);
      vi.runAllTimers();

      expect(hist.at(-1)?.value).toBe(2); // Last
      expect(hist.at(-2)?.value).toBe(1); // Second to last
      expect(hist.at(-3)?.value).toBe(0); // Third to last
    });

    it("should slice entries", () => {
      const count = signal(0);
      const hist = history(() => count());

      vi.runAllTimers();

      for (let i = 1; i <= 5; i++) {
        count.set(i);
        vi.runAllTimers();
      }

      const sliced = hist.slice(1, 4);
      expect(sliced.length).toBe(3);
      expect(sliced[0].value).toBe(1);
      expect(sliced[1].value).toBe(2);
      expect(sliced[2].value).toBe(3);
    });

    it("should filter entries", () => {
      const count = signal(0);
      const hist = history(() => count());

      vi.runAllTimers();

      for (let i = 1; i <= 5; i++) {
        count.set(i);
        vi.runAllTimers();
      }

      // Get only even values
      const evens = hist.filter((entry) => entry.value % 2 === 0);
      expect(evens.length).toBe(3); // 0, 2, 4
      expect(evens.map((e) => e.value)).toEqual([0, 2, 4]);
    });

    it("should find entry", () => {
      const count = signal(0);
      const hist = history(() => count());

      vi.runAllTimers();

      for (let i = 1; i <= 5; i++) {
        count.set(i);
        vi.runAllTimers();
      }

      const found = hist.find((entry) => entry.value === 3);
      expect(found?.value).toBe(3);
      expect(found?.index).toBe(3);

      const notFound = hist.find((entry) => entry.value === 99);
      expect(notFound).toBeUndefined();
    });

    it("should get entries between timestamps", () => {
      const count = signal(0);
      const hist = history(() => count());

      vi.setSystemTime(new Date("2024-01-01T10:00:00Z"));
      vi.runAllTimers();

      vi.setSystemTime(new Date("2024-01-01T10:01:00Z"));
      count.set(1);
      vi.runAllTimers();

      vi.setSystemTime(new Date("2024-01-01T10:02:00Z"));
      count.set(2);
      vi.runAllTimers();

      vi.setSystemTime(new Date("2024-01-01T10:03:00Z"));
      count.set(3);
      vi.runAllTimers();

      const start = new Date("2024-01-01T10:01:00Z").getTime();
      const end = new Date("2024-01-01T10:02:00Z").getTime();

      const between = hist.between(start, end);
      expect(between.length).toBe(2);
      expect(between[0].value).toBe(1);
      expect(between[1].value).toBe(2);
    });

    it("should get entries since timestamp", () => {
      const count = signal(0);
      const hist = history(() => count());

      vi.setSystemTime(new Date("2024-01-01T10:00:00Z"));
      vi.runAllTimers();

      vi.setSystemTime(new Date("2024-01-01T10:01:00Z"));
      count.set(1);
      vi.runAllTimers();

      vi.setSystemTime(new Date("2024-01-01T10:02:00Z"));
      count.set(2);
      vi.runAllTimers();

      const cutoff = new Date("2024-01-01T10:00:30Z").getTime();
      const since = hist.since(cutoff);

      expect(since.length).toBe(2);
      expect(since[0].value).toBe(1);
      expect(since[1].value).toBe(2);
    });

    it("should get entries before timestamp", () => {
      const count = signal(0);
      const hist = history(() => count());

      vi.setSystemTime(new Date("2024-01-01T10:00:00Z"));
      vi.runAllTimers();

      vi.setSystemTime(new Date("2024-01-01T10:01:00Z"));
      count.set(1);
      vi.runAllTimers();

      vi.setSystemTime(new Date("2024-01-01T10:02:00Z"));
      count.set(2);
      vi.runAllTimers();

      const cutoff = new Date("2024-01-01T10:01:30Z").getTime();
      const before = hist.before(cutoff);

      expect(before.length).toBe(2);
      expect(before[0].value).toBe(0);
      expect(before[1].value).toBe(1);
    });

    it("should extract values only", () => {
      const count = signal(0);
      const hist = history(() => count());

      vi.runAllTimers();

      for (let i = 1; i <= 3; i++) {
        count.set(i);
        vi.runAllTimers();
      }

      const values = hist.values();
      expect(values).toEqual([0, 1, 2, 3]);
    });

    it("should count entries", () => {
      const count = signal(0);
      const hist = history(() => count());

      vi.runAllTimers();
      expect(hist.count()).toBe(1);

      count.set(1);
      vi.runAllTimers();
      expect(hist.count()).toBe(2);

      count.set(2);
      vi.runAllTimers();
      expect(hist.count()).toBe(3);
    });

    it("should clear history and reset index", () => {
      const count = signal(0);
      const hist = history(() => count());

      vi.runAllTimers();

      count.set(1);
      vi.runAllTimers();

      count.set(2);
      vi.runAllTimers();

      expect(hist().length).toBe(3);
      expect(hist.latest()?.index).toBe(2);

      hist.clear();

      expect(hist().length).toBe(0);
      expect(hist.latest()).toBeUndefined();

      // After clear, next entry should start at index 0 again
      count.set(3);
      vi.runAllTimers();

      expect(hist().length).toBe(1);
      expect(hist.latest()?.value).toBe(3);
      expect(hist.latest()?.index).toBe(0);
    });

    it("should handle empty history queries", () => {
      const count = signal(0);
      const hist = history(() => count());

      hist.clear();

      expect(hist.latest()).toBeUndefined();
      expect(hist.oldest()).toBeUndefined();
      expect(hist.at(0)).toBeUndefined();
      expect(hist.slice()).toEqual([]);
      expect(hist.filter(() => true)).toEqual([]);
      expect(hist.find(() => true)).toBeUndefined();
      expect(hist.between(0, Date.now())).toEqual([]);
      expect(hist.since(0)).toEqual([]);
      expect(hist.before(Date.now())).toEqual([]);
      expect(hist.values()).toEqual([]);
      expect(hist.count()).toBe(0);
    });
  });
});

