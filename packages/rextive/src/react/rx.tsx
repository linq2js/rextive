import {
  ComponentProps,
  ComponentType,
  createElement,
  JSXElementConstructor,
  memo,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import {
  SignalMap,
  ResolvedValueMap,
  AnyFunc,
  Signal,
  Loadable,
  ResolveAwaitable,
} from "../types";
import { RxOptions } from "./types";
import { shallowEquals } from "../utils/shallowEquals";
import { useWatch } from "./useWatch";
import { is } from "../is";

/**
 * Render function signature for overload 2 (with signals).
 * Receives both value (Suspense) and loadable (manual) proxies.
 */
export type RxRender<TValue, TLoadable> = (
  value: TValue,
  loadable: TLoadable
) => ReactNode;

const EMPTY_SIGNALS: SignalMap = {};
// Single signal render function - extracts value from { value: signal } wrapper
const SINGLE_SIGNAL_RENDER = (value: any) => value.value;

/**
 * rx - Reactive rendering for signals
 *
 * Four overloads:
 * 1. **Component with reactive props**: `rx(Component, { ...props })`
 *    - Props can be signals or static values
 *    - Automatically tracks signal props and re-renders when they change
 *    - Static props are passed through unchanged
 *    - Convenient for using existing components with signals
 *
 * 2a. **Single signal**: `rx(signal, options?)`
 *    - Automatically renders the value of the signal
 *    - Equivalent to: `rx({ value: signal }, (value) => value.value)`
 *    - Convenient shorthand for displaying a single value
 *
 * 2b. **Single signal with property access**: `rx(signal, prop, options?)`
 *    - Extracts and renders a specific property from the signal's value
 *    - Useful for rendering nested properties without custom render function
 *    - Equivalent to: `rx({ value: signal }, (value) => value.value[prop])`
 *
 * 3. **Reactive with signals**: `rx(signals, (awaited, loadables) => ReactNode, { watch?: [...] })`
 *    - Automatic lazy signal tracking via proxies
 *    - Re-renders when accessed signals change
 *    - Provides both Suspense (awaited) and manual (loadables) access patterns
 *    - Watch array controls when render function reference changes
 *
 * @warning **IMPORTANT: Do NOT use `rx()` directly in element attributes!**
 *
 * ❌ **WRONG** - This will NOT be reactive:
 * ```tsx
 * <input value={rx(signal)} />  // ❌ Won't update!
 * <div className={rx(theme)} /> // ❌ Won't update!
 * ```
 *
 * ✅ **CORRECT** - Use one of these patterns instead:
 * ```tsx
 * // Option 1: Wrap the entire element in rx() with render function
 * {rx({ signal }, (value) => <input value={value.signal} />)}
 *
 * // Option 2: Use rx() with component + signal props (Overload 1)
 * {rx("input", { value: signal })}
 * ```
 *
 * **Why?** `rx()` returns a React component that subscribes to signals.
 * When used in attributes, it's evaluated once during render and won't
 * re-subscribe on updates. Always wrap the entire element or use Overload 1.
 *
 * @example Overload 1 - Component with mixed props
 * ```tsx
 * const count = signal(42);
 * const name = signal("Alice");
 * rx("div", {
 *   children: count,  // signal prop - will track changes
 *   className: "counter"  // static prop
 * })
 * ```
 *
 * @example Overload 1 - Custom component
 * ```tsx
 * const user = signal({ name: "Bob", age: 30 });
 * rx(UserCard, { user, theme: "dark" })
 * ```
 *
 * @example Overload 2a - Single signal
 * ```tsx
 * const count = signal(42);
 * rx(count) // Renders: 42
 * ```
 *
 * @example Overload 2b - Single signal with property access
 * ```tsx
 * const user = signal({ name: "Alice", age: 30 });
 * rx(user, "name") // Renders: "Alice"
 * ```
 *
 * @example Overload 3 - Reactive with Suspense
 * ```tsx
 * rx({ user, posts }, (awaited) => (
 *   <div>{awaited.user.name}</div>
 * ))
 * ```
 *
 * @example Overload 3 - Reactive with loadable
 * ```tsx
 * rx({ data }, (_, loadables) => {
 *   if (loadables.data.status === 'loading') return <Spinner />;
 *   return <div>{loadables.data.value}</div>;
 * })
 * ```
 */

// Overload 1: Component with reactive props
export function rx<
  TComponent extends
    | keyof JSX.IntrinsicElements
    | JSXElementConstructor<any>
    | ComponentType<any>,
  TProps extends ComponentProps<TComponent>
>(
  component: TComponent,
  props: {
    [key in keyof TProps]:
      | Signal<TProps[key] | PromiseLike<TProps[key]> | Loadable<TProps[key]>>
      | TProps[key];
  }
): ReactNode;

// Overload 2a: Single signal - automatically renders value
export function rx<T>(signal: Signal<T>, options?: RxOptions): ReactNode;

// Overload 2b: Single signal with property access - renders specific property
/**
 * Subscribe to a signal with a selector function or property key.
 * The selector receives the AWAITED value if the signal contains a promise.
 *
 * @example
 * ```tsx
 * // With async signal
 * const user = signal(async () => fetchUser()); // Signal<Promise<User>>
 *
 * // Selector receives User, not Promise<User>!
 * rx(user, (u) => u.name) // ✅ u is User
 * rx(user, "name")        // ✅ Access property directly
 * ```
 */
export function rx<T>(
  signal: Signal<T>,
  selector:
    | keyof ResolveAwaitable<T>
    | ((value: ResolveAwaitable<T>) => unknown),
  options?: RxOptions
): ReactNode;

// Overload 3: Explicit signals with value + loadable access
export function rx<TSignals extends SignalMap>(
  signals: TSignals,
  render: RxRender<
    ResolvedValueMap<TSignals, "awaited">,
    ResolvedValueMap<TSignals, "loadable">
  >,
  options?: RxOptions
): ReactNode;

// Implementation - Parse arguments and delegate to component
export function rx(...args: any[]): ReactNode {
  let render: AnyFunc;
  let options: RxOptions | undefined;
  let signals: SignalMap | undefined;

  // Parse arguments to determine which overload was called
  // Check is FIRST because signals are also functions
  if (is(args[0])) {
    // Overload 2a or 2b: rx(signal) or rx(signal, prop, options?)
    const signal = args[0];

    // Check if second argument is a property name (string) or selector function
    if (typeof args[1] === "string" || typeof args[1] === "function") {
      // Overload 2b: rx(signal, prop, options?)
      const prop = args[1];
      signals = { value: signal };
      render =
        typeof prop === "function"
          ? (value: any) => prop(value.value)
          : (value: any) => value.value?.[prop];
      options = args[2];
    } else {
      // Overload 2a: rx(signal, options?)
      signals = { value: signal };
      render = SINGLE_SIGNAL_RENDER;
      options = args[1];
    }
  } else if (typeof args[1] === "function") {
    // Overload 3: rx(signals, render, options?)
    [signals, render, options] = args;
  } else {
    // Overload 1: rx(component, props)
    const [component, props] = args;

    // Separate signal props from static props
    signals = {};
    const staticProps: any = {};

    for (const key in props) {
      if (is(props[key])) {
        (signals as any)[key] = props[key];
      } else if (key !== "dispose") {
        staticProps[key] = props[key];
      }
    }

    // Create render function that merges static and signal values
    render = (value: any) => {
      const finalProps = { ...staticProps };
      // Assign signal values to finalProps
      for (const key in value) {
        finalProps[key] = value[key];
      }
      return createElement(component, finalProps);
    };

    options = undefined;
  }

  // Delegate to Rx component where hooks can be safely called
  return <Rx render={render} signals={signals} options={options} />;
}

/**
 * Internal component that handles hook calls for all overloads.
 *
 * This component is necessary because:
 * 1. Hooks cannot be called conditionally in rx() function
 * 2. All overloads need memoization with watch array support
 * 3. Moving logic to a component ensures hooks are always called in same order
 *
 * All overloads now use signals, so we always render <RxWithSignals> for lazy tracking.
 */
const Rx = (props: {
  render: AnyFunc;
  signals: SignalMap | undefined;
  options: RxOptions | undefined;
}) => {
  const { render, signals, options } = props;

  // Store render function in ref to keep it stable across re-renders
  // while allowing the latest version to be called
  const renderRef = useRef(render);
  renderRef.current = render;

  // Memoize render function with watch array support
  // Dependencies: watch array controls when render function ref changes
  // Used by: <RxWithSignals> component
  const memoizedRender = useCallback<RxRender<any, any>>(
    (value, loadable) => renderRef.current?.(value, loadable) ?? null,
    options?.watch || []
  );

  // All overloads use RxWithSignals for lazy signal tracking
  return (
    <RxWithSignals render={memoizedRender} signals={signals ?? EMPTY_SIGNALS} />
  );
};

/**
 * Memoized component for reactive signal tracking (all overloads).
 *
 * Responsibilities:
 * 1. Creates lazy tracking proxies via useWatch hook
 * 2. Provides both value (Suspense) and loadable (manual) proxies
 * 3. Only re-renders when:
 *    - render function reference changes (via watch deps)
 *    - signals object reference changes (shallow comparison)
 *    - accessed signals change (via useWatch subscriptions)
 *
 * Performance optimization:
 * - memo() prevents re-renders when parent re-renders
 * - Custom comparison checks render ref and signals object
 * - Lazy tracking via proxies: only subscribes to accessed signals
 *
 * @example
 * ```tsx
 * // Only subscribes to user signal (not posts)
 * <RxWithSignals
 *   signals={{ user, posts }}
 *   render={(value) => <div>{value.user.name}</div>}
 * />
 * ```
 */
const RxWithSignals = memo(
  (props: { render: RxRender<any, any>; signals: SignalMap }) => {
    // Get value and loadable proxies
    // useWatch handles:
    // - Lazy subscription (only when signals accessed)
    // - Automatic cleanup on unmount
    // - Re-rendering when tracked signals change
    const [value, loadable] = useWatch(props.signals);

    // Call render with both proxy types
    // value: throws promises for Suspense
    // loadable: returns { status, value?, error?, promise? }
    return props.render(value, loadable);
  },
  // Custom comparison to prevent unnecessary re-renders
  (prev, next) => {
    return (
      // Same render function reference (stable via useCallback)
      prev.render === next.render &&
      // Same signals object (shallow comparison of signal references)
      shallowEquals(prev.signals, next.signals)
    );
  }
);
