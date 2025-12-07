/**
 * VirtualizedList Component
 * Efficiently renders long lists by only rendering visible items
 */

import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
  memo,
} from "react";

export interface VirtualizedListProps<T> {
  /** Array of items to render */
  items: T[];
  /** Estimated height of each item (used for scroll calculations) */
  estimatedItemHeight: number;
  /** Number of items to render above/below visible area */
  overscan?: number;
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Get unique key for each item */
  getItemKey: (item: T, index: number) => string | number;
  /** Optional className for the container */
  className?: string;
  /** Optional style for the container */
  style?: React.CSSProperties;
  /** Optional style for items container */
  itemContainerStyle?: React.CSSProperties;
  /** Empty state content */
  emptyContent?: React.ReactNode;
}

interface ItemMeasurement {
  offset: number;
  height: number;
}

function VirtualizedListInner<T>({
  items,
  estimatedItemHeight,
  overscan = 3,
  renderItem,
  getItemKey,
  className,
  style,
  itemContainerStyle,
  emptyContent,
}: VirtualizedListProps<T>): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Store measured heights for each item
  const measuredHeights = useRef<Map<string | number, number>>(new Map());

  // Update container height on resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateHeight = () => {
      setContainerHeight(container.clientHeight);
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Calculate item positions using measured heights when available
  const { itemMeasurements, totalHeight } = useMemo(() => {
    const measurements: ItemMeasurement[] = [];
    let offset = 0;

    for (let i = 0; i < items.length; i++) {
      const key = getItemKey(items[i], i);
      const height = measuredHeights.current.get(key) ?? estimatedItemHeight;
      measurements.push({ offset, height });
      offset += height;
    }

    return {
      itemMeasurements: measurements,
      totalHeight: offset,
    };
  }, [items, estimatedItemHeight, getItemKey]);

  // Find visible range using binary search
  const { startIndex, endIndex } = useMemo(() => {
    if (items.length === 0) {
      return { startIndex: 0, endIndex: 0 };
    }

    // Binary search for start index
    let low = 0;
    let high = items.length - 1;

    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      const itemBottom =
        itemMeasurements[mid].offset + itemMeasurements[mid].height;

      if (itemBottom <= scrollTop) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    const visibleStart = Math.max(0, low - overscan);

    // Find end index
    const scrollBottom = scrollTop + containerHeight;
    let endIdx = visibleStart;

    while (
      endIdx < items.length &&
      itemMeasurements[endIdx].offset < scrollBottom
    ) {
      endIdx++;
    }

    const visibleEnd = Math.min(items.length, endIdx + overscan);

    return {
      startIndex: visibleStart,
      endIndex: visibleEnd,
    };
  }, [items.length, itemMeasurements, scrollTop, containerHeight, overscan]);

  // Measure item after render
  const measureItem = useCallback(
    (key: string | number, element: HTMLElement | null) => {
      if (element) {
        const height = element.getBoundingClientRect().height;
        const currentHeight = measuredHeights.current.get(key);

        if (currentHeight !== height) {
          measuredHeights.current.set(key, height);
          // Force re-render to update positions
          // Using a micro-task to batch multiple measurements
          Promise.resolve().then(() => {
            setScrollTop((prev) => prev); // Trigger re-calculation
          });
        }
      }
    },
    []
  );

  // Visible items
  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex);
  }, [items, startIndex, endIndex]);

  // Calculate top padding (space before first visible item)
  const topPadding = startIndex > 0 ? itemMeasurements[startIndex].offset : 0;

  if (items.length === 0) {
    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          height: "100%",
          overflow: "auto",
          ...style,
        }}
      >
        {emptyContent}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      onScroll={handleScroll}
      style={{
        height: "100%",
        overflow: "auto",
        ...style,
      }}
    >
      {/* Total height container */}
      <div
        style={{
          height: totalHeight,
          position: "relative",
        }}
      >
        {/* Items container with offset */}
        <div
          style={{
            position: "absolute",
            top: topPadding,
            left: 0,
            right: 0,
            ...itemContainerStyle,
          }}
        >
          {visibleItems.map((item, idx) => {
            const actualIndex = startIndex + idx;
            const key = getItemKey(item, actualIndex);

            return (
              <div key={key} ref={(el) => measureItem(key, el)}>
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Memo wrapper for the generic component
export const VirtualizedList = memo(VirtualizedListInner) as typeof VirtualizedListInner;

/**
 * Hook to create a stable key getter function
 */
export function useItemKey<T>(
  keyFn: (item: T, index: number) => string | number
): (item: T, index: number) => string | number {
  const keyFnRef = useRef(keyFn);
  keyFnRef.current = keyFn;

  return useCallback((item: T, index: number) => {
    return keyFnRef.current(item, index);
  }, []);
}
