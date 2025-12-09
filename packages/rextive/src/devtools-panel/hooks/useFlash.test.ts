/**
 * Tests for useFlash Hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFlash } from "./useFlash";

describe("useFlash", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("flashSignal", () => {
    it("should add signal to flashing signals", () => {
      const { result } = renderHook(() => useFlash());

      act(() => {
        result.current.flashSignal("sig1", "change");
      });

      expect(result.current.flashingSignals["sig1"]).toBe("change");
    });

    it("should remove signal after timeout", () => {
      const { result } = renderHook(() => useFlash());

      act(() => {
        result.current.flashSignal("sig1", "change");
      });

      expect(result.current.flashingSignals["sig1"]).toBe("change");

      act(() => {
        vi.advanceTimersByTime(600);
      });

      expect(result.current.flashingSignals["sig1"]).toBeUndefined();
    });

    it("should support different flash types", () => {
      const { result } = renderHook(() => useFlash());

      act(() => {
        result.current.flashSignal("sig1", "create");
        result.current.flashSignal("sig2", "change");
      });

      expect(result.current.flashingSignals["sig1"]).toBe("create");
      expect(result.current.flashingSignals["sig2"]).toBe("change");
    });

    it("should reset timeout when flashing same signal", () => {
      const { result } = renderHook(() => useFlash());

      act(() => {
        result.current.flashSignal("sig1", "change");
      });

      act(() => {
        vi.advanceTimersByTime(400);
      });

      // Flash again before timeout
      act(() => {
        result.current.flashSignal("sig1", "change");
      });

      act(() => {
        vi.advanceTimersByTime(400);
      });

      // Should still be flashing (timeout was reset)
      expect(result.current.flashingSignals["sig1"]).toBe("change");

      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Now it should be removed
      expect(result.current.flashingSignals["sig1"]).toBeUndefined();
    });
  });

  describe("flashTab", () => {
    it("should add tab to flashing tabs", () => {
      const { result } = renderHook(() => useFlash());

      act(() => {
        result.current.flashTab("signals");
      });

      expect(result.current.flashingTabs.has("signals")).toBe(true);
    });

    it("should remove tab after timeout", () => {
      const { result } = renderHook(() => useFlash());

      act(() => {
        result.current.flashTab("events");
      });

      expect(result.current.flashingTabs.has("events")).toBe(true);

      act(() => {
        vi.advanceTimersByTime(1500);
      });

      expect(result.current.flashingTabs.has("events")).toBe(false);
    });

    it("should handle multiple tabs", () => {
      const { result } = renderHook(() => useFlash());

      act(() => {
        result.current.flashTab("signals");
        result.current.flashTab("events");
      });

      expect(result.current.flashingTabs.has("signals")).toBe(true);
      expect(result.current.flashingTabs.has("events")).toBe(true);
    });
  });

  describe("flashAutoToggle", () => {
    it("should set and clear flash auto toggle", () => {
      const { result } = renderHook(() => useFlash());

      expect(result.current.flashAutoToggle).toBe(false);

      act(() => {
        result.current.setFlashAutoToggle(true);
      });

      expect(result.current.flashAutoToggle).toBe(true);

      act(() => {
        result.current.clearFlashAutoToggle();
      });

      expect(result.current.flashAutoToggle).toBe(false);
    });

    it("should auto-clear after timeout when set to true", () => {
      const { result } = renderHook(() => useFlash());

      act(() => {
        result.current.setFlashAutoToggle(true);
      });

      expect(result.current.flashAutoToggle).toBe(true);

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.flashAutoToggle).toBe(false);
    });
  });

  describe("cleanup", () => {
    it("should clear all timeouts", () => {
      const { result } = renderHook(() => useFlash());

      act(() => {
        result.current.flashSignal("sig1", "change");
        result.current.flashTab("events");
        result.current.setFlashAutoToggle(true);
      });

      act(() => {
        result.current.cleanup();
      });

      // Advance timers - nothing should change since timeouts were cleared
      const signalsBefore = { ...result.current.flashingSignals };
      const tabsBefore = new Set(result.current.flashingTabs);

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // State should remain unchanged (no more timeouts running)
      expect(result.current.flashingSignals).toEqual(signalsBefore);
      expect(result.current.flashingTabs).toEqual(tabsBefore);
    });
  });
});

