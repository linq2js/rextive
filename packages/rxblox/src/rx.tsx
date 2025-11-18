import {
  type ComponentProps,
  type ComponentType,
  type ReactNode,
  type JSXElementConstructor,
  createElement,
  memo,
  useLayoutEffect,
  ReactElement,
  useState,
} from "react";
import { trackingDispatcher, trackingToken } from "./trackingDispatcher";
import { emitter } from "./emitter";
import { useRerender } from "./useRerender";
import { Signal } from "./types";
import { isSignal } from "./signal";
import { syncOnly } from "./utils/syncOnly";
import { getContextType, withDispatchers } from "./dispatcher";
import { isDiff } from "./isDiff";

/**
 * Reactive component that automatically re-renders when its signal dependencies change.
 *
 * This component:
 * - Executes the expression function and tracks which signals are accessed
 * - Subscribes to all accessed signals
 * - Re-renders automatically when any tracked signal changes
 * - Updates subscriptions when signal dependencies change
 * - Handles errors gracefully by re-throwing them for ErrorBoundary to catch
 *
 * The component is memoized to prevent unnecessary re-renders when props don't change.
 */
export const Reactive = memo((props: { exp: () => unknown }) => {
  // State used to trigger re-renders and track errors
  const rerender = useRerender<{
    error?: unknown;
  }>();

  // Create stable ref object containing dispatcher, subscription state, and utility functions
  // Using useState ensures this is created once and persists across renders
  const [ref] = useState(() => {
    const onCleanup = emitter();
    const dispatcher = trackingDispatcher();
    // Token that changes when dependencies change, triggering useLayoutEffect to re-subscribe
    const subscribeToken = { current: {} };

    const recompute = () => {
      // Skip if already rendering to prevent redundant re-renders in same cycle
      // This enables debouncing when multiple signals change synchronously
      if (rerender.rendering()) {
        return;
      }

      try {
        // Re-evaluate expression and check if dependencies changed
        const { value: nextValue, dependencyChanged } = ref.getValue();

        // Trigger re-render if:
        // 1. Dependencies changed (need to re-subscribe)
        // 2. This is the first evaluation (!ref.result)
        // 3. Value changed (result !== nextValue)
        if (
          dependencyChanged ||
          !ref.result ||
          ref.result.value !== nextValue
        ) {
          ref.result = { value: nextValue };
          rerender({});
        }
      } catch (ex) {
        // On error: cleanup subscriptions, clear dispatcher, and trigger immediate error re-render
        onCleanup.emitAndClear();
        dispatcher.clear();
        rerender.immediate({ error: ex });
      }
    };

    return {
      result: undefined as { value: unknown } | undefined,
      subscribeToken,
      dispatcher,
      subscribe() {
        // Clear previous subscriptions before setting up new ones
        // This prevents accumulating duplicate subscriptions across re-subscriptions
        onCleanup.emitAndClear();

        try {
          // Subscribe to all signals that were accessed during the most recent evaluation
          // Each signal will call recompute() when it changes
          for (const subscribable of dispatcher.subscribables) {
            onCleanup.on(subscribable.on(recompute));
          }
        } catch (ex) {
          // If subscription fails, clean up and trigger immediate error re-render
          // Errors should be handled immediately, not debounced
          onCleanup.emitAndClear();
          rerender.immediate({ error: ex });
          return;
        }

        // Return cleanup function that will be called by useLayoutEffect
        // when dependencies change or component unmounts
        return () => {
          // Cancel any pending debounced rerender to prevent updates after unmount
          rerender.cancel();
          onCleanup.emitAndClear();
        };
      },
      getValue() {
        // Take snapshot of current dependencies before clearing
        const prevSubscribables = new Set(dispatcher.subscribables);

        // Clear dispatcher to track new dependencies during evaluation
        dispatcher.clear();

        // Evaluate the expression with tracking enabled
        // syncOnly ensures the expression is synchronous (no promises/async)
        const value = syncOnly(
          () =>
            withDispatchers([trackingToken(dispatcher)], props.exp, {
              contextType: "rx",
            }),
          {
            message:
              "rx() expression cannot return a promise. " +
              "React components must render synchronously. " +
              "If you need async data, use signal.async() or handle async operations in effects.",
            context: "rx()",
            mode: "error",
          }
        );

        // Compare old and new dependencies to detect changes
        let dependencyChanged = false;
        const nextSubscribables = new Set(dispatcher.subscribables);
        if (isDiff(prevSubscribables, nextSubscribables)) {
          dependencyChanged = true;
          // Update token to trigger useLayoutEffect re-subscription
          subscribeToken.current = {};
        }

        return { value, dependencyChanged };
      },
    };
  });

  // Re-throw errors caught during expression evaluation
  // This allows ErrorBoundary components to catch and handle them
  if (rerender.data?.error) {
    throw rerender.data.error;
  }

  // Initialize on first render: evaluate expression and track dependencies
  if (!ref.result) {
    const { value } = ref.getValue();
    ref.result = { value };
  }

  // Subscribe to all tracked signals
  // Re-runs when subscribeToken.current changes (i.e., when dependencies change)
  useLayoutEffect(() => {
    return ref.subscribe();
  }, [ref.subscribeToken.current]);

  const result = ref.result?.value;

  // Return the computed result, or null if result is null/undefined
  // Functions are not valid React children, so convert them to null
  // This prevents React warnings about invalid children
  if (typeof result === "function") {
    return null;
  }
  // Cast to ReactNode to satisfy TypeScript
  return (result ?? null) as unknown as ReactNode;
});

Reactive.displayName = "rx";

/**
 * Creates a reactive component with auto-reactive props.
 *
 * This overload automatically unwraps signal props when creating a component.
 * Any prop that is a signal will be automatically called (unwrapped) when rendering.
 * This is convenient for simple component creation with reactive props.
 *
 * @param componentType - Component type (string for HTML elements or component constructor)
 * @param componentProps - Props object where signal values are automatically unwrapped
 * @returns A ReactNode that re-renders when any signal props change
 *
 * @example
 * ```tsx
 * const title = signal("Hello");
 * const count = signal(42);
 *
 * // Auto-unwraps signal props
 * {rx("div", {
 *   title: title,           // Automatically becomes title()
 *   className: "box",       // Static props stay as-is
 *   children: count,        // Signal child also unwrapped
 * })}
 *
 * // Equivalent to:
 * {rx(() => <div title={title()} className="box">{count()}</div>)}
 *
 * // Works with custom components too
 * {rx(MyComponent, { value: count, label: "Count" })}
 * ```
 */
export function rx<
  TComponentType extends
    | keyof JSX.IntrinsicElements
    | JSXElementConstructor<any>
>(
  componentType: TComponentType,
  componentProps: {
    [key in ComponentProps<TComponentType>]:
      | Signal<ComponentProps<TComponentType>>
      | ComponentProps<TComponentType>;
  }
): ReactNode;

/**
 * Creates a reactive expression with explicit signal dependencies.
 *
 * This overload allows you to specify which signals to track explicitly,
 * and receive their unwrapped values as function parameters. This provides:
 * - Better type inference
 * - Explicit dependency list (similar to React's dependency arrays)
 * - Potential performance optimization (only tracks listed signals)
 *
 * @param signals - Array of signals to track. Can include undefined/null/false for conditional signals.
 * @param fn - Function that receives unwrapped signal values as arguments
 * @returns A ReactNode that renders the function result and updates when signals change
 *
 * @example
 * ```tsx
 * const count = signal(0);
 * const multiplier = signal(2);
 *
 * // Explicit dependencies - count and multiplier
 * {rx([count, multiplier], (c, m) => (
 *   <div>{c} × {m} = {c * m}</div>
 * ))}
 *
 * // With optional signals
 * const maybeSignal = condition ? signal(5) : undefined;
 * {rx([count, maybeSignal], (c, value) => (
 *   <div>Count: {c}, Value: {value ?? 'N/A'}</div>
 * ))}
 * ```
 */
export function rx<
  const TSignals extends readonly (Signal<any> | undefined | null | false)[]
>(
  signals: TSignals,
  fn: (
    ...values: {
      [K in keyof TSignals]: TSignals[K] extends Signal<infer T>
        ? // Signal type - check if it's required or optional
          // Check if there's anything besides Signal<T> in the union
          // If Exclude leaves nothing (never), signal is required → return T
          // If Exclude leaves something (undefined/null/false), signal is optional → return T | undefined
          [Exclude<TSignals[K], Signal<T>>] extends [never]
          ? T
          : T | undefined
        : // Non-signal values (undefined, null, false) become undefined at runtime
          undefined;
    }
  ) => ReactNode
): ReactElement;

/**
 * Creates a reactive expression that automatically updates when its signal dependencies change.
 *
 * This is the original and most flexible overload. It executes the expression function
 * and automatically tracks all signals accessed during execution. The component will
 * re-render whenever any tracked signal changes.
 *
 * @param exp - Expression function that may access signals. The result will be rendered.
 * @returns A ReactNode that renders the expression result and updates reactively
 *
 * @example
 * ```tsx
 * const count = signal(0);
 * const name = signal("Alice");
 *
 * // Reactive expression that updates when count or name changes
 * {rx(() => (
 *   <div>
 *     <h1>Hello, {name()}!</h1>
 *     <p>Count: {count()}</p>
 *   </div>
 * ))}
 *
 * // With conditional logic
 * {rx(() => {
 *   const c = count();
 *   if (c > 10) return <div>High: {c}</div>;
 *   return <div>Low: {c}</div>;
 * })}
 * ```
 */
export function rx(exp: () => unknown): ReactNode;
/**
 * Implementation of rx() with multiple overloads.
 *
 * This function dispatches to different implementations based on argument patterns:
 * 1. Array as first arg → rx([signals], fn) - Explicit signal dependencies
 * 2. Single function arg → rx(() => ...) - Expression-based reactive rendering
 * 3. Two args → rx(component, props) - Auto-reactive component creation
 *
 * All overloads construct an expression function that is passed to the Reactive
 * component, which handles dependency tracking and re-rendering.
 */
export function rx(...args: any[]): ReactNode {
  // Validate context: nested rx() blocks and rx() in batch() are not allowed
  const contextType = getContextType();
  if (contextType === "rx") {
    throw new Error(
      "Nested rx() blocks detected. This is inefficient and unnecessary.\n\n" +
        "❌ Don't do this:\n" +
        "  rx(() => <div>{rx(() => <span>nested</span>)}</div>)\n\n" +
        "✅ Instead, consolidate into a single rx() block:\n" +
        "  rx(() => <div><span>not nested</span></div>)\n\n" +
        "✅ Or move independent rx() blocks to stable scope:\n" +
        "  const block = rx(() => <span>independent</span>);\n" +
        "  return <div>{block}</div>;\n\n" +
        "See: https://github.com/linq2js/rxblox#best-practices"
    );
  }

  if (contextType === "batch") {
    throw new Error(
      "Cannot create rx() blocks inside batch(). " +
        "batch() is for grouping signal updates, not creating reactive UI.\n\n" +
        "❌ Don't do this:\n" +
        "  batch(() => {\n" +
        "    const view = rx(() => <div>{count()}</div>);  // Wrong scope!\n" +
        "    count.set(1);\n" +
        "  })\n\n" +
        "✅ Instead, create rx() outside batch:\n" +
        "  const view = rx(() => <div>{count()}</div>);  // Create outside\n" +
        "  batch(() => {\n" +
        "    count.set(1);  // Just update signals inside\n" +
        "    count.set(2);\n" +
        "  });\n\n" +
        "See: https://github.com/linq2js/rxblox/blob/main/packages/rxblox/docs/context-and-scope.md"
    );
  }

  let exp: () => ReactNode;

  // Overload 1: rx([signals], fn)
  // Explicit dependency list - unwraps signals and passes values to callback
  if (Array.isArray(args[0])) {
    const maybeSignals = args[0] as readonly (
      | Signal<any>
      | undefined
      | null
      | false
    )[];
    const fn = args[1] as (...args: any[]) => ReactNode;

    // Build expression that unwraps each signal (or undefined for non-signals)
    // and passes them as arguments to the callback
    exp = () =>
      fn(
        ...maybeSignals.map((s) => (typeof s === "function" ? s() : undefined))
      );
  }
  // Overload 2: rx(() => ...)
  // Expression-based - automatically tracks accessed signals
  else if (args.length === 1) {
    exp = args[0];
  }
  // Overload 3: rx(component, props)
  // Component-based - auto-unwraps signal props during render
  else {
    if (!args[1]) {
      throw new Error("Invalid arguments");
    }

    const componentType = args[0] as ComponentType<any>;
    const componentProps: ComponentProps<typeof componentType> = args[1];

    // Separate static props (primitives, objects) from dynamic props (signals)
    const staticProps: Record<string, any> = {};
    const dynamicProps: [string, Signal<any>][] = [];

    Object.entries(componentProps).forEach(([key, value]) => {
      if (isSignal(value)) {
        // Signals are stored separately and unwrapped on each render
        dynamicProps.push([key, value]);
      } else {
        // Static values are copied once
        staticProps[key] = value;
      }
    });

    // Build expression that merges static props with unwrapped dynamic props
    exp = () => {
      const finalProps = { ...staticProps };
      // Unwrap each signal prop by calling it
      dynamicProps.forEach(([key, signal]) => {
        finalProps[key] = signal();
      });
      return createElement(componentType, finalProps);
    };
  }

  // Create Reactive component with the constructed expression
  // The Reactive component handles tracking, subscribing, and re-rendering
  return <Reactive exp={exp} />;
}
