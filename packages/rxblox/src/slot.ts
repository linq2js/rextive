import { ReactNode } from "react";
import {
  getDispatcher,
  dispatcherToken,
  withDispatchers,
  getContextType,
} from "./dispatcher";
import { devWarn } from "./utils/dev";

/**
 * Slot mode configuration.
 *
 * - `replace`: Latest fill wins (default)
 * - `once`: Throw error if filled multiple times (strict mode)
 * - `append`: Collect all fills and render them
 */
export type SlotMode = "replace" | "once" | "append";

/**
 * Slot options configuration.
 */
export interface SlotOptions {
  /**
   * How to handle multiple fill() calls.
   *
   * @default "replace"
   */
  mode?: SlotMode;
}

/**
 * Internal slot state.
 */
interface SlotState {
  content: ReactNode[];
  filled: boolean;
  mode: SlotMode;
}

/**
 * Dispatcher for managing slot/fill operations.
 */
export interface SlotDispatcher {
  /**
   * Register a new slot and return its state.
   */
  createSlot(mode: SlotMode): SlotState;

  /**
   * Fill the current active slot with content.
   */
  fill(content: ReactNode): void;

  /**
   * Set the active slot context.
   */
  setActiveSlot(slot: SlotState | null): void;
}

/**
 * Token for accessing the slot dispatcher.
 */
export const slotToken = dispatcherToken<SlotDispatcher>("slot");

/**
 * Create a slot dispatcher instance.
 */
export function slotDispatcher(): SlotDispatcher {
  let activeSlot: SlotState | null = null;

  return {
    createSlot(mode: SlotMode): SlotState {
      return {
        content: [],
        filled: false,
        mode,
      };
    },

    fill(content: ReactNode): void {
      if (!activeSlot) {
        throw new Error(
          "blox.fill() must be called inside a blox.slot() callback"
        );
      }

      const { mode } = activeSlot;

      // Handle "once" mode - throw if already filled
      if (mode === "once" && activeSlot.filled) {
        throw new Error(
          'Slot mode is "once" but fill() was called multiple times. ' +
            'Use mode: "replace" to allow overwriting or mode: "append" to collect all fills.'
        );
      }

      // Handle "replace" mode - replace previous content
      if (mode === "replace") {
        activeSlot.content = [content];
        activeSlot.filled = true;
        return;
      }

      // Handle "append" mode - collect all content
      if (mode === "append") {
        activeSlot.content.push(content);
        activeSlot.filled = true;
        return;
      }

      // Default: treat as replace
      activeSlot.content = [content];
      activeSlot.filled = true;
    },

    setActiveSlot(slot: SlotState | null): void {
      activeSlot = slot;
    },
  };
}

/**
 * Create a slot with optional logic and content filling.
 *
 * **Must be called inside a `blox` component.** Exported as `blox.slot()`.
 *
 * A slot allows you to:
 * 1. Run logic/computations
 * 2. Conditionally fill the slot with content using `blox.fill()`
 * 3. Return a result value from the logic
 * 4. Render the filled content in your component
 *
 * @param fn - Function that contains logic and may call `blox.fill()` to provide content
 * @param options - Optional slot configuration
 * @returns Tuple of [slotComponent, result] where:
 *   - `slotComponent`: React node to render (the filled content)
 *   - `result`: Return value from the function
 *
 * @example
 * ```tsx
 * const MyComponent = blox<{ items: Item[] }>((props) => {
 *   // Create slot with logic
 *   const [ItemList, count] = blox.slot(() => {
 *     const filtered = props.items.filter(item => item.active);
 *
 *     if (filtered.length === 0) {
 *       blox.fill(<p>No active items</p>);
 *     } else {
 *       blox.fill(
 *         <ul>
 *           {filtered.map(item => <li key={item.id}>{item.name}</li>)}
 *         </ul>
 *       );
 *     }
 *
 *     return filtered.length; // return value becomes `count`
 *   });
 *
 *   return (
 *     <div>
 *       <h2>Active Items: {count}</h2>
 *       {ItemList}
 *     </div>
 *   );
 * });
 * ```
 *
 * @example
 * ```tsx
 * // Strict mode - throw on multiple fills
 * const [Content, data] = blox.slot(() => {
 *   const result = compute();
 *   blox.fill(<div>{result}</div>);
 *   // blox.fill(<div>Another</div>); // ❌ Error!
 *   return result;
 * }, { mode: "once" });
 *
 * // Append mode - collect all fills
 * const [Items, count] = blox.slot(() => {
 *   items.forEach(item => {
 *     blox.fill(<Item key={item.id} {...item} />);
 *   });
 *   return items.length;
 * }, { mode: "append" });
 * // Renders: <><Item /><Item /><Item /></>
 *
 * // Reactive content with rx()
 * const [TodoList, total] = blox.slot(() => {
 *   const todos = signal([...initialTodos]);
 *
 *   // Fill with reactive content using rx()
 *   blox.fill(rx(() => {
 *     const items = todos();
 *     return (
 *       <ul>
 *         {items.map(todo => (
 *           <li key={todo.id}>{todo.text}</li>
 *         ))}
 *       </ul>
 *     );
 *   }));
 *
 *   return todos().length;
 * });
 * // The TodoList content updates reactively when todos signal changes
 * ```
 */
export function slot<T>(fn: () => T): [ReactNode, T];
export function slot<T>(fn: () => T, options: SlotOptions): [ReactNode, T];
export function slot<T>(...args: any[]): [ReactNode, T] {
  // Check if we're inside a blox component (recommended but not required)
  const contextType = getContextType();
  if (contextType !== "blox") {
    devWarn(
      "blox.slot() is typically used inside blox components. " +
        "While it works standalone, you may not have access to blox features like props signals."
    );
  }

  // Parse arguments
  let fn: () => T;
  let options: SlotOptions;

  if (args.length === 1) {
    fn = args[0];
    options = {};
  } else {
    fn = args[0];
    options = args[1];
  }

  const mode = options.mode || "replace";

  // Create a local slot dispatcher for this slot
  const dispatcher = slotDispatcher();

  // Create slot state
  const slotState = dispatcher.createSlot(mode);

  // Set as active slot and execute function with dispatcher context
  dispatcher.setActiveSlot(slotState);
  let result: T;
  try {
    // Wrap the callback with slot dispatcher context
    // This makes blox.fill() available inside the callback
    result = withDispatchers([slotToken(dispatcher)], fn);
  } finally {
    dispatcher.setActiveSlot(null);
  }

  // Render slot content based on mode
  let content: ReactNode;
  if (slotState.content.length === 0) {
    content = null;
  } else if (slotState.content.length === 1) {
    content = slotState.content[0];
  } else {
    // Multiple items - render as fragment
    content = slotState.content as any;
  }

  return [content, result];
}

/**
 * Fill the current active slot with content.
 *
 * **Must be called inside a `blox.slot()` callback.** Exported as `blox.fill()`.
 *
 * This function provides content to the nearest enclosing `blox.slot()`.
 * The behavior depends on the slot's mode:
 * - `replace` (default): Latest fill wins
 * - `once`: Throws error if called multiple times
 * - `append`: Collects all fills into an array
 *
 * @param content - React node to render in the slot
 *
 * @example
 * ```tsx
 * const [Slot, data] = blox.slot(() => {
 *   const result = compute();
 *
 *   if (result > 10) {
 *     blox.fill(<HighValue value={result} />);
 *   } else {
 *     blox.fill(<LowValue value={result} />);
 *   }
 *
 *   return result;
 * });
 * ```
 *
 * @example
 * ```tsx
 * // Reactive content - combine with rx()
 * const [DynamicContent, count] = blox.slot(() => {
 *   const items = signal(['apple', 'banana', 'cherry']);
 *
 *   blox.fill(rx(() => {
 *     // This updates reactively when items() changes
 *     return (
 *       <div>
 *         <h3>Items ({items().length})</h3>
 *         <ul>
 *           {items().map((item, i) => <li key={i}>{item}</li>)}
 *         </ul>
 *       </div>
 *     );
 *   }));
 *
 *   return items().length;
 * });
 * ```
 */
export function fill(content: ReactNode): void {
  const dispatcher = getDispatcher(slotToken);

  if (!dispatcher) {
    throw new Error("blox.fill() must be called inside a blox.slot() callback");
  }

  dispatcher.fill(content);
}
