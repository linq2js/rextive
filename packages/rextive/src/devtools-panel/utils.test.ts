/**
 * Tests for DevTools Panel Utilities
 */

import { describe, it, expect } from "vitest";
import {
  formatValue,
  formatValueFull,
  formatTime,
  formatSnapshotTime,
  getSignalPreview,
  getTabLabel,
} from "./utils";

describe("utils", () => {
  describe("formatValue", () => {
    it("should format undefined", () => {
      expect(formatValue(undefined)).toBe("undefined");
    });

    it("should format null", () => {
      expect(formatValue(null)).toBe("null");
    });

    it("should format functions", () => {
      expect(formatValue(() => {})).toBe("[Function]");
    });

    it("should format symbols", () => {
      const sym = Symbol("test");
      expect(formatValue(sym)).toBe("Symbol(test)");
    });

    it("should format primitives", () => {
      expect(formatValue(42)).toBe("42");
      expect(formatValue("hello")).toBe('"hello"');
      expect(formatValue(true)).toBe("true");
    });

    it("should format objects", () => {
      expect(formatValue({ a: 1 })).toBe('{"a":1}');
    });

    it("should format arrays", () => {
      expect(formatValue([1, 2, 3])).toBe("[1,2,3]");
    });

    it("should truncate long values", () => {
      const longString = "a".repeat(100);
      const result = formatValue(longString);
      expect(result.length).toBeLessThanOrEqual(41); // 40 + "…"
      expect(result.endsWith("…")).toBe(true);
    });

    it("should respect custom maxLength", () => {
      const value = { a: 1, b: 2, c: 3 };
      const result = formatValue(value, 10);
      expect(result.length).toBeLessThanOrEqual(11);
    });

    it("should handle circular references", () => {
      const circular: any = { a: 1 };
      circular.self = circular;
      // Should not throw, should return string representation
      expect(() => formatValue(circular)).not.toThrow();
    });
  });

  describe("formatValueFull", () => {
    it("should format undefined", () => {
      expect(formatValueFull(undefined)).toBe("undefined");
    });

    it("should format null", () => {
      expect(formatValueFull(null)).toBe("null");
    });

    it("should format functions", () => {
      expect(formatValueFull(() => {})).toBe("[Function]");
    });

    it("should format symbols", () => {
      const sym = Symbol("test");
      expect(formatValueFull(sym)).toBe("Symbol(test)");
    });

    it("should format objects with indentation", () => {
      const obj = { a: 1, b: 2 };
      const result = formatValueFull(obj);
      expect(result).toContain("{\n");
      expect(result).toContain("  ");
    });

    it("should not truncate values", () => {
      const longString = "a".repeat(100);
      const result = formatValueFull(longString);
      expect(result).not.toContain("…");
      expect(result).toBe('"' + longString + '"');
    });
  });

  describe("formatTime", () => {
    it("should format timestamp to time string", () => {
      // Create a timestamp for 14:30:45
      const date = new Date();
      date.setHours(14, 30, 45);
      const timestamp = date.getTime();

      const result = formatTime(timestamp);
      expect(result).toBe("14:30:45");
    });

    it("should use 24-hour format", () => {
      const date = new Date();
      date.setHours(23, 59, 59);
      const timestamp = date.getTime();

      const result = formatTime(timestamp);
      expect(result).toBe("23:59:59");
    });

    it("should pad single digits", () => {
      const date = new Date();
      date.setHours(1, 2, 3);
      const timestamp = date.getTime();

      const result = formatTime(timestamp);
      expect(result).toBe("01:02:03");
    });
  });

  describe("formatSnapshotTime", () => {
    it("should format snapshot timestamp", () => {
      const date = new Date();
      date.setHours(14, 30, 45);
      const timestamp = date.getTime();

      const result = formatSnapshotTime(timestamp);
      expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });
  });

  describe("getSignalPreview", () => {
    it("should return comma-separated names", () => {
      const signals = [{ name: "a" }, { name: "b" }, { name: "c" }];
      expect(getSignalPreview(signals)).toBe("a, b, c");
    });

    it("should truncate to maxNames", () => {
      const signals = [
        { name: "a" },
        { name: "b" },
        { name: "c" },
        { name: "d" },
        { name: "e" },
      ];
      expect(getSignalPreview(signals, 3)).toBe("a, b, c... +2");
    });

    it("should handle fewer signals than maxNames", () => {
      const signals = [{ name: "a" }, { name: "b" }];
      expect(getSignalPreview(signals, 5)).toBe("a, b");
    });

    it("should handle empty array", () => {
      expect(getSignalPreview([])).toBe("");
    });

    it("should handle single signal", () => {
      const signals = [{ name: "only" }];
      expect(getSignalPreview(signals)).toBe("only");
    });
  });

  describe("getTabLabel", () => {
    it("should capitalize first letter", () => {
      expect(getTabLabel("signals")).toBe("Signals");
      expect(getTabLabel("tags")).toBe("Tags");
      expect(getTabLabel("events")).toBe("Events");
    });

    it("should handle single character", () => {
      expect(getTabLabel("a")).toBe("A");
    });

    it("should handle already capitalized", () => {
      expect(getTabLabel("Signals")).toBe("Signals");
    });
  });
});

