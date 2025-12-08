/**
 * useFlash Hook
 * Manages flash animations for signals and tabs
 */

import { useState, useCallback, useRef } from "react";

export interface UseFlashReturn {
  flashingSignals: Record<string, "change" | "create">;
  flashingTabs: Set<string>;
  flashAutoToggle: boolean;
  flashSignal: (signalId: string, type: "change" | "create") => void;
  flashTab: (tabId: string) => void;
  setFlashAutoToggle: (flash: boolean) => void;
  clearFlashAutoToggle: () => void;
  cleanup: () => void;
}

export function useFlash(): UseFlashReturn {
  const [flashingSignals, setFlashingSignals] = useState<
    Record<string, "change" | "create">
  >({});
  const [flashingTabs, setFlashingTabs] = useState<Set<string>>(new Set());
  const [flashAutoToggle, setFlashAutoToggle] = useState(false);

  const flashTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const tabFlashTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const autoToggleFlashTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const flashSignal = useCallback(
    (signalId: string, type: "change" | "create") => {
      const existingTimeout = flashTimeoutsRef.current.get(signalId);
      if (existingTimeout) clearTimeout(existingTimeout);

      setFlashingSignals((prev) => ({ ...prev, [signalId]: type }));

      const timeout = setTimeout(() => {
        setFlashingSignals((prev) => {
          const { [signalId]: _, ...rest } = prev;
          return rest;
        });
        flashTimeoutsRef.current.delete(signalId);
      }, 600);

      flashTimeoutsRef.current.set(signalId, timeout);
    },
    []
  );

  const flashTab = useCallback((tabId: string) => {
    const existingTimeout = tabFlashTimeoutsRef.current.get(tabId);
    if (existingTimeout) clearTimeout(existingTimeout);

    setFlashingTabs((prev) => new Set(prev).add(tabId));

    const timeout = setTimeout(() => {
      setFlashingTabs((prev) => {
        const next = new Set(prev);
        next.delete(tabId);
        return next;
      });
      tabFlashTimeoutsRef.current.delete(tabId);
    }, 1500); // Flash for 1.5s (3 animation cycles of 0.5s)

    tabFlashTimeoutsRef.current.set(tabId, timeout);
  }, []);

  const clearFlashAutoToggle = useCallback(() => {
    setFlashAutoToggle(false);
    if (autoToggleFlashTimeoutRef.current) {
      clearTimeout(autoToggleFlashTimeoutRef.current);
      autoToggleFlashTimeoutRef.current = null;
    }
  }, []);

  const setFlashAutoToggleWithTimeout = useCallback(
    (flash: boolean) => {
      if (autoToggleFlashTimeoutRef.current) {
        clearTimeout(autoToggleFlashTimeoutRef.current);
      }
      setFlashAutoToggle(flash);
      if (flash) {
        autoToggleFlashTimeoutRef.current = setTimeout(() => {
          setFlashAutoToggle(false);
          autoToggleFlashTimeoutRef.current = null;
        }, 2000);
      }
    },
    []
  );

  const cleanup = useCallback(() => {
    flashTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    flashTimeoutsRef.current.clear();
    tabFlashTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    tabFlashTimeoutsRef.current.clear();
    if (autoToggleFlashTimeoutRef.current) {
      clearTimeout(autoToggleFlashTimeoutRef.current);
      autoToggleFlashTimeoutRef.current = null;
    }
  }, []);

  return {
    flashingSignals,
    flashingTabs,
    flashAutoToggle,
    flashSignal,
    flashTab,
    setFlashAutoToggle: setFlashAutoToggleWithTimeout,
    clearFlashAutoToggle,
    cleanup,
  };
}

