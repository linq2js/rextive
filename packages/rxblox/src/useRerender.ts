import { debounce } from "lodash";
import { useCallback, useMemo, useState } from "react";

export type RerenderOptions = {
  debounce?: number;
};

export function useRerender<TData>(options: RerenderOptions = {}) {
  const [rerenderData, originalRerender] = useState<{ data?: TData }>({});
  const rerenderWrapper = useCallback(
    (data?: TData) => originalRerender({ data }),
    [originalRerender]
  );

  const rerender = useMemo(() => {
    if (typeof options.debounce === "number") {
      const debounced = debounce(rerenderWrapper, options.debounce);
      // Capture original cancel and flush before assigning properties
      const originalCancel = debounced.cancel.bind(debounced);
      const originalFlush = debounced.flush.bind(debounced);

      // Expose cancel function for debounced rerender
      const cancel = () => {
        if (typeof options.debounce === "number") {
          originalCancel();
        }
      };

      // Expose flush function to immediately execute pending debounced calls
      const flush = () => {
        if (typeof options.debounce === "number") {
          originalFlush();
        }
      };

      return Object.assign(debounced, {
        data: rerenderData.data,
        cancel,
        flush,
        immediate: rerenderWrapper,
      });
    }
    // For non-debounced case, just return wrapper with properties
    return Object.assign(rerenderWrapper, {
      data: rerenderData.data,
      cancel: () => {}, // No-op for non-debounced
      flush: () => {}, // No-op for non-debounced
      immediate: rerenderWrapper,
    });
  }, [rerenderWrapper, options.debounce, rerenderData.data]);

  return rerender;
}
