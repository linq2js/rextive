/**
 * useSnapshots Hook
 * Manages snapshot state and operations
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { SignalInfo } from "../../devtools/types";
import { batch } from "../../batch";
import type { Snapshot, SnapshotSignal } from "../types";

// WeakRef type for ES2020 compatibility
declare class WeakRef<T extends object> {
  constructor(target: T);
  deref(): T | undefined;
}

export interface UseSnapshotsOptions {
  signals: Map<string, SignalInfo>;
  bookmarkedSignals: Set<string>;
  snapshotBookmarkedOnly: boolean;
  snapshotOnInit: boolean;
  snapshotAutoInterval: boolean;
  autoSnapshotIntervalSeconds: number;
  enabled: boolean;
  flashTab: (tabId: string) => void;
}

export interface UseSnapshotsReturn {
  snapshots: Snapshot[];
  expandedSnapshot: string | null;
  setExpandedSnapshot: (id: string | null) => void;
  editingSnapshotId: string | null;
  setEditingSnapshotId: (id: string | null) => void;
  editingSnapshotName: string;
  setEditingSnapshotName: (name: string) => void;
  snapshotSearch: string;
  setSnapshotSearch: (search: string) => void;
  takeSnapshot: (options?: { skipIfNoDiff?: boolean }) => void;
  takeSnapshotForTag: (tagId: string, signalIds: string[]) => void;
  deleteSnapshot: (snapshotId: string) => void;
  renameSnapshot: (snapshotId: string, newName: string) => void;
  revertSnapshot: (snapshot: Snapshot) => void;
  revertSingleSignal: (snapshotSignal: SnapshotSignal) => void;
  clearAllSnapshots: () => void;
  getCurrentStateSignals: () => Array<{ id: string; name: string; value: unknown }>;
}

export function useSnapshots({
  signals,
  bookmarkedSignals,
  snapshotBookmarkedOnly,
  snapshotOnInit,
  snapshotAutoInterval,
  autoSnapshotIntervalSeconds,
  enabled,
  flashTab,
}: UseSnapshotsOptions): UseSnapshotsReturn {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [expandedSnapshot, setExpandedSnapshot] = useState<string | null>(null);
  const [editingSnapshotId, setEditingSnapshotId] = useState<string | null>(null);
  const [editingSnapshotName, setEditingSnapshotName] = useState("");
  const [snapshotSearch, setSnapshotSearch] = useState("");

  const snapshotCounterRef = useRef(1);
  const snapshotInitDoneRef = useRef(false);
  const snapshotIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const takeSnapshotRef = useRef<(options?: { skipIfNoDiff?: boolean }) => void>(() => {});

  // Helper to compare two snapshot signal lists for equality
  const snapshotsAreEqual = useCallback(
    (a: SnapshotSignal[], b: SnapshotSignal[]): boolean => {
      if (a.length !== b.length) return false;
      const aMap = new Map(a.map((s) => [s.id, s.value]));
      for (const sig of b) {
        const aVal = aMap.get(sig.id);
        if (aVal === undefined && !aMap.has(sig.id)) return false;
        try {
          if (JSON.stringify(aVal) !== JSON.stringify(sig.value)) return false;
        } catch {
          if (aVal !== sig.value) return false;
        }
      }
      return true;
    },
    []
  );

  const takeSnapshot = useCallback(
    (options?: { skipIfNoDiff?: boolean }) => {
      // Filter mutable signals, optionally by bookmarked only
      const mutableSignals = Array.from(signals.values()).filter(
        (s) =>
          s.kind === "mutable" &&
          !s.disposed &&
          !s.errorCount &&
          (!snapshotBookmarkedOnly || bookmarkedSignals.has(s.id))
      );

      // Don't create empty snapshot when bookmarked-only mode is on but no bookmarks
      if (snapshotBookmarkedOnly && mutableSignals.length === 0) {
        return;
      }

      const snapshotSignals: SnapshotSignal[] = mutableSignals.map((s) => {
        let value: unknown;
        try {
          value = s.signal?.get?.();
        } catch {
          value = "[error reading value]";
        }
        const signalObj = s.signal as
          | { set?: (value: unknown) => void }
          | undefined;
        const signalRef = signalObj?.set
          ? new WeakRef(signalObj as { set: (value: unknown) => void })
          : null;
        return {
          id: s.id,
          name: s.name,
          value,
          signalRef,
        };
      });

      // Skip if no diff with latest snapshot (for auto-snapshot)
      if (options?.skipIfNoDiff && snapshots.length > 0) {
        const latestSnapshot = snapshots[0];
        if (snapshotsAreEqual(latestSnapshot.signals, snapshotSignals)) {
          return;
        }
      }

      const newSnapshot: Snapshot = {
        id: `snapshot-${Date.now()}`,
        timestamp: Date.now(),
        name: `Snapshot #${snapshotCounterRef.current}`,
        signals: snapshotSignals,
      };

      snapshotCounterRef.current++;
      setSnapshots((prev) => [newSnapshot, ...prev]);
      flashTab("snaps");
    },
    [signals, snapshotBookmarkedOnly, bookmarkedSignals, snapshots, snapshotsAreEqual, flashTab]
  );

  // Keep ref updated with latest takeSnapshot
  useEffect(() => {
    takeSnapshotRef.current = takeSnapshot;
  }, [takeSnapshot]);

  const takeSnapshotForTag = useCallback(
    (tagId: string, signalIds: string[]) => {
      const tagSignals = signalIds
        .map((id) => signals.get(id))
        .filter(
          (s): s is SignalInfo =>
            s !== undefined &&
            s.kind === "mutable" &&
            !s.disposed &&
            !s.errorCount
        );

      if (tagSignals.length === 0) return;

      const snapshotSignals: SnapshotSignal[] = tagSignals.map((s) => {
        let value: unknown;
        try {
          value = s.signal?.get?.();
        } catch {
          value = "[error reading value]";
        }
        const signalObj = s.signal as
          | { set?: (value: unknown) => void }
          | undefined;
        const signalRef = signalObj?.set
          ? new WeakRef(signalObj as { set: (value: unknown) => void })
          : null;
        return {
          id: s.id,
          name: s.name,
          value,
          signalRef,
        };
      });

      const newSnapshot: Snapshot = {
        id: `snapshot-${Date.now()}`,
        timestamp: Date.now(),
        name: `Tag: ${tagId} #${snapshotCounterRef.current}`,
        signals: snapshotSignals,
      };

      snapshotCounterRef.current++;
      setSnapshots((prev) => [newSnapshot, ...prev]);
      flashTab("snaps");
    },
    [signals, flashTab]
  );

  const deleteSnapshot = useCallback(
    (snapshotId: string) => {
      setSnapshots((prev) => prev.filter((s) => s.id !== snapshotId));
      if (expandedSnapshot === snapshotId) {
        setExpandedSnapshot(null);
      }
    },
    [expandedSnapshot]
  );

  const renameSnapshot = useCallback((snapshotId: string, newName: string) => {
    setSnapshots((prev) =>
      prev.map((s) => (s.id === snapshotId ? { ...s, name: newName } : s))
    );
    setEditingSnapshotId(null);
    setEditingSnapshotName("");
  }, []);

  const revertSnapshot = useCallback(
    (snapshot: Snapshot) => {
      batch(() => {
        for (const snapSignal of snapshot.signals) {
          const signalInfo = signals.get(snapSignal.id);
          const signalObj = signalInfo?.signal as
            | { set?: (value: unknown) => void }
            | undefined;
          if (signalObj?.set && !signalInfo?.disposed) {
            try {
              signalObj.set(snapSignal.value);
            } catch {
              // Ignore errors when reverting
            }
          }
        }
      });
    },
    [signals]
  );

  const revertSingleSignal = useCallback(
    (snapshotSignal: SnapshotSignal) => {
      const signalFromRef = snapshotSignal.signalRef?.deref();
      if (signalFromRef) {
        try {
          signalFromRef.set(snapshotSignal.value);
          return;
        } catch {
          // Ignore errors when reverting
        }
      }
      const signalInfo = signals.get(snapshotSignal.id);
      const signalObj = signalInfo?.signal as
        | { set?: (value: unknown) => void }
        | undefined;
      if (signalObj?.set && !signalInfo?.disposed) {
        try {
          signalObj.set(snapshotSignal.value);
        } catch {
          // Ignore errors when reverting
        }
      }
    },
    [signals]
  );

  const clearAllSnapshots = useCallback(() => {
    setSnapshots([]);
    setExpandedSnapshot(null);
    snapshotCounterRef.current = 1;
  }, []);

  const getCurrentStateSignals = useCallback(() => {
    return Array.from(signals.values())
      .filter((s) => s.kind === "mutable" && !s.disposed && !s.errorCount)
      .map((s) => {
        let value: unknown;
        try {
          value = (s.signal as { get?: () => unknown })?.get?.();
        } catch {
          value = "[error reading value]";
        }
        return {
          id: s.id,
          name: s.name,
          value,
        };
      });
  }, [signals]);

  // Snapshot on init
  useEffect(() => {
    if (
      snapshotOnInit &&
      enabled &&
      signals.size > 0 &&
      !snapshotInitDoneRef.current
    ) {
      snapshotInitDoneRef.current = true;
      takeSnapshot();
    }
  }, [snapshotOnInit, enabled, signals.size, takeSnapshot]);

  // Auto snapshot interval
  useEffect(() => {
    if (snapshotAutoInterval && enabled && autoSnapshotIntervalSeconds > 0) {
      snapshotIntervalRef.current = setInterval(() => {
        takeSnapshotRef.current({ skipIfNoDiff: true });
      }, autoSnapshotIntervalSeconds * 1000);
      return () => {
        if (snapshotIntervalRef.current) {
          clearInterval(snapshotIntervalRef.current);
          snapshotIntervalRef.current = null;
        }
      };
    } else {
      if (snapshotIntervalRef.current) {
        clearInterval(snapshotIntervalRef.current);
        snapshotIntervalRef.current = null;
      }
    }
  }, [snapshotAutoInterval, enabled, autoSnapshotIntervalSeconds]);

  return {
    snapshots,
    expandedSnapshot,
    setExpandedSnapshot,
    editingSnapshotId,
    setEditingSnapshotId,
    editingSnapshotName,
    setEditingSnapshotName,
    snapshotSearch,
    setSnapshotSearch,
    takeSnapshot,
    takeSnapshotForTag,
    deleteSnapshot,
    renameSnapshot,
    revertSnapshot,
    revertSingleSignal,
    clearAllSnapshots,
    getCurrentStateSignals,
  };
}

