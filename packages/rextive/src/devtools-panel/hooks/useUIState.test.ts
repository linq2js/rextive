/**
 * Tests for useUIState Hook
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUIState } from "./useUIState";
import { BOOKMARKS_STORAGE_KEY } from "../config";

describe("useUIState", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("signal UI state", () => {
    it("should manage expanded signal state", () => {
      const { result } = renderHook(() => useUIState());

      expect(result.current[0].expandedSignal).toBeNull();

      act(() => {
        result.current[1].setExpandedSignal("sig1");
      });

      expect(result.current[0].expandedSignal).toBe("sig1");

      act(() => {
        result.current[1].setExpandedSignal(null);
      });

      expect(result.current[0].expandedSignal).toBeNull();
    });

    it("should manage hovered item state", () => {
      const { result } = renderHook(() => useUIState());

      expect(result.current[0].hoveredItem).toBeNull();

      act(() => {
        result.current[1].setHoveredItem("sig1");
      });

      expect(result.current[0].hoveredItem).toBe("sig1");
    });

    it("should manage editing signal state", () => {
      const { result } = renderHook(() => useUIState());

      act(() => {
        result.current[1].setEditingSignal("sig1");
        result.current[1].setEditValue("42");
      });

      expect(result.current[0].editingSignal).toBe("sig1");
      expect(result.current[0].editValue).toBe("42");
    });

    it("should manage edit error state", () => {
      const { result } = renderHook(() => useUIState());

      act(() => {
        result.current[1].setEditError("Invalid JSON");
      });

      expect(result.current[0].editError).toBe("Invalid JSON");

      act(() => {
        result.current[1].setEditError(null);
      });

      expect(result.current[0].editError).toBeNull();
    });
  });

  describe("bookmarks", () => {
    it("should toggle bookmarks", () => {
      const { result } = renderHook(() => useUIState());

      expect(result.current[0].bookmarkedSignals.has("sig1")).toBe(false);

      act(() => {
        result.current[1].toggleBookmark("sig1");
      });

      expect(result.current[0].bookmarkedSignals.has("sig1")).toBe(true);

      act(() => {
        result.current[1].toggleBookmark("sig1");
      });

      expect(result.current[0].bookmarkedSignals.has("sig1")).toBe(false);
    });

    it("should persist bookmarks to localStorage", () => {
      const { result } = renderHook(() => useUIState());

      act(() => {
        result.current[1].toggleBookmark("sig1");
        result.current[1].toggleBookmark("sig2");
      });

      const saved = JSON.parse(
        localStorage.getItem(BOOKMARKS_STORAGE_KEY) || "[]"
      );
      expect(saved).toContain("sig1");
      expect(saved).toContain("sig2");
    });

    it("should load bookmarks from localStorage", () => {
      localStorage.setItem(
        BOOKMARKS_STORAGE_KEY,
        JSON.stringify(["sig1", "sig2"])
      );

      const { result } = renderHook(() => useUIState());

      expect(result.current[0].bookmarkedSignals.has("sig1")).toBe(true);
      expect(result.current[0].bookmarkedSignals.has("sig2")).toBe(true);
    });

    it("should manage showBookmarksOnly filter", () => {
      const { result } = renderHook(() => useUIState());

      expect(result.current[0].showBookmarksOnly).toBe(false);

      act(() => {
        result.current[1].setShowBookmarksOnly(true);
      });

      expect(result.current[0].showBookmarksOnly).toBe(true);
    });
  });

  describe("filters", () => {
    it("should manage signal kind filter", () => {
      const { result } = renderHook(() => useUIState());

      expect(result.current[0].signalKindFilter).toBe("all");

      act(() => {
        result.current[1].setSignalKindFilter("mutable");
      });

      expect(result.current[0].signalKindFilter).toBe("mutable");

      act(() => {
        result.current[1].setSignalKindFilter("computed");
      });

      expect(result.current[0].signalKindFilter).toBe("computed");
    });

    it("should manage event kind filter", () => {
      const { result } = renderHook(() => useUIState());

      expect(result.current[0].eventKindFilter).toBe("all");

      act(() => {
        result.current[1].setEventKindFilter("error");
      });

      expect(result.current[0].eventKindFilter).toBe("error");
    });

    it("should manage recent activity sort", () => {
      const { result } = renderHook(() => useUIState());

      expect(result.current[0].recentActivitySort).toBe(true);

      act(() => {
        result.current[1].setRecentActivitySort(false);
      });

      expect(result.current[0].recentActivitySort).toBe(false);
    });
  });

  describe("search", () => {
    it("should manage search query", () => {
      const { result } = renderHook(() => useUIState());

      expect(result.current[0].searchQuery).toBe("");

      act(() => {
        result.current[1].setSearchQuery("name:user");
      });

      expect(result.current[0].searchQuery).toBe("name:user");
    });

    it("should parse search query", () => {
      const { result } = renderHook(() => useUIState());

      act(() => {
        result.current[1].setSearchQuery("name:user kind:mutable");
      });

      expect(result.current[0].parsedQuery.fields.get("name")).toBe("user");
      expect(result.current[0].parsedQuery.fields.get("kind")).toBe("mutable");
    });

    it("should manage search help visibility", () => {
      const { result } = renderHook(() => useUIState());

      expect(result.current[0].showSearchHelp).toBe(false);

      act(() => {
        result.current[1].setShowSearchHelp(true);
      });

      expect(result.current[0].showSearchHelp).toBe(true);
    });
  });

  describe("event UI state", () => {
    it("should manage expanded events", () => {
      const { result } = renderHook(() => useUIState());

      expect(result.current[0].expandedEvents.size).toBe(0);

      act(() => {
        result.current[1].setExpandedEvents((prev) => new Set(prev).add(1));
      });

      expect(result.current[0].expandedEvents.has(1)).toBe(true);

      act(() => {
        result.current[1].setExpandedEvents((prev) => {
          const next = new Set(prev);
          next.delete(1);
          return next;
        });
      });

      expect(result.current[0].expandedEvents.has(1)).toBe(false);
    });
  });

  describe("tag UI state", () => {
    it("should manage expanded tag", () => {
      const { result } = renderHook(() => useUIState());

      expect(result.current[0].expandedTag).toBeNull();

      act(() => {
        result.current[1].setExpandedTag("tag1");
      });

      expect(result.current[0].expandedTag).toBe("tag1");
    });
  });

  describe("chain UI state", () => {
    it("should manage expanded chain", () => {
      const { result } = renderHook(() => useUIState());

      expect(result.current[0].expandedChain).toBeNull();

      act(() => {
        result.current[1].setExpandedChain("chain1");
      });

      expect(result.current[0].expandedChain).toBe("chain1");
    });

    it("should manage chain filter", () => {
      const { result } = renderHook(() => useUIState());

      expect(result.current[0].chainFilter).toBe("");

      act(() => {
        result.current[1].setChainFilter("user");
      });

      expect(result.current[0].chainFilter).toBe("user");
    });
  });

  describe("modals", () => {
    it("should manage compare modal state", () => {
      const { result } = renderHook(() => useUIState());

      expect(result.current[0].compareModal).toBeNull();

      const modalState = {
        signalId: "sig1",
        currentValue: 42,
        historyValue: 40,
        historyTimestamp: Date.now(),
      };

      act(() => {
        result.current[1].setCompareModal(modalState);
      });

      expect(result.current[0].compareModal).toEqual(modalState);

      act(() => {
        result.current[1].setCompareModal(null);
      });

      expect(result.current[0].compareModal).toBeNull();
    });
  });

  describe("getSearchBoxProps", () => {
    it("should return correct props for signals tab", () => {
      const { result } = renderHook(() => useUIState());
      const setSnapshotSearch = () => {};

      const props = result.current[1].getSearchBoxProps(
        "signals",
        "",
        setSnapshotSearch
      );

      expect(props.placeholder).toBe("Search signals...");
      expect(props.showHelp).toBe(true);
    });

    it("should return correct props for chains tab", () => {
      const { result } = renderHook(() => useUIState());
      const setSnapshotSearch = () => {};

      const props = result.current[1].getSearchBoxProps(
        "chains",
        "",
        setSnapshotSearch
      );

      expect(props.placeholder).toBe("Filter by signal name...");
      expect(props.showHelp).toBe(false);
    });

    it("should return correct props for snaps tab", () => {
      const { result } = renderHook(() => useUIState());
      const setSnapshotSearch = () => {};

      const props = result.current[1].getSearchBoxProps(
        "snaps",
        "",
        setSnapshotSearch
      );

      expect(props.placeholder).toBe("Search snapshots...");
      expect(props.showHelp).toBe(false);
    });
  });
});

