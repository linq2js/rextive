import React, { memo, ReactElement, ReactNode } from "react";
import { Signal, ResolveAwaitable } from "../types";
import { useRx } from "./useRx";
import { is } from "../is";
import { wait } from "../wait";
import { isPromiseLike } from "../utils/isPromiseLike";

/**
 * rx - Reactive rendering for signals with automatic tracking
 *
 * ## Four overloads:
 *
 * 1. **Single signal**: `rx(signal)`
 *    - Renders the signal's value directly
 *    - For async signals, uses `wait()` internally to handle Suspense
 *
 * 2. **Single signal with selector**: `rx(signal, selector)`
 *    - Extracts and renders a specific property or computed value
 *    - Selector can be a property key (`"name"`) or function (`u => u.name`)
 *    - For async signals, the selector receives the resolved value
 *
 * 3. **Reactive function**: `rx(fn)`
 *    - Runs function with automatic signal tracking via `useRx`
 *    - Any `signal()` calls inside `fn` are automatically tracked
 *    - Re-renders when any tracked signal changes
 *
 * 4. **Component with reactive props**: `rx(Component, props)`
 *    - Renders a component with signal props
 *    - Signal values in props are automatically tracked
 *    - Re-renders when any signal prop changes
 *
 * ## Automatic Signal Tracking
 *
 * When using `rx(() => ...)`, signals accessed inside the function are
 * automatically tracked. This is powered by `useRx` which uses the
 * context dispatcher to detect signal reads.
 *
 * ## Async Signal Handling
 *
 * For signals containing Promises:
 * - Use `wait(signal())` to get the resolved value (throws for Suspense)
 * - Use `loadable(signal())` to get loading/error/success state
 *
 * @warning **Do NOT use `rx()` directly in element attributes!**
 *
 * ❌ **WRONG** - Won't be reactive:
 * ```tsx
 * <input value={rx(signal)} />  // ❌ Won't update!
 * ```
 *
 * ✅ **CORRECT** - Use as JSX child or wrap the element:
 * ```tsx
 * <div>{rx(count)}</div>
 * {rx(() => <input value={signal()} />)}
 * {rx("input", { value: countSignal })}
 * ```
 *
 * @example Single signal
 * ```tsx
 * const count = signal(42);
 * <div>{rx(count)}</div> // Renders: 42
 * ```
 *
 * @example Signal with property selector
 * ```tsx
 * const user = signal({ name: "Alice", age: 30 });
 * <div>{rx(user, "name")}</div> // Renders: "Alice"
 * <div>{rx(user, u => u.name.toUpperCase())}</div> // Renders: "ALICE"
 * ```
 *
 * @example Reactive function with auto-tracking
 * ```tsx
 * const firstName = signal("John");
 * const lastName = signal("Doe");
 *
 * // Both signals are automatically tracked
 * {rx(() => <span>{firstName()} {lastName()}</span>)}
 * ```
 *
 * @example Component with reactive props
 * ```tsx
 * const count = signal(0);
 * const theme = signal("dark");
 *
 * // HTML element with signal props
 * {rx("div", { className: theme, children: count })}
 *
 * // Custom component with signal props
 * {rx(MyComponent, { count: countSignal, theme: themeSignal })}
 * ```
 *
 * @example Async signal with Suspense
 * ```tsx
 * const user = signal(async () => fetchUser());
 *
 * // Use wait() to resolve async values
 * {rx(() => {
 *   const userData = wait(user()); // Throws for Suspense if loading
 *   return <div>{userData.name}</div>;
 * })}
 * ```
 *
 * @example Manual loading state with loadable
 * ```tsx
 * import { loadable } from "rextive";
 *
 * {rx(() => {
 *   const state = loadable(user());
 *   if (state.loading) return <Spinner />;
 *   if (state.error) return <Error error={state.error} />;
 *   return <div>{state.value.name}</div>;
 * })}
 * ```
 */

// Overload 1: Single signal - automatically renders value
export function rx<T>(signal: Signal<T>): ReactNode;

// Overload 2: Single signal with property access or selector function
/**
 * Subscribe to a signal with a selector function or property key.
 * For async signals, the selector receives the resolved value (via `wait()`).
 *
 * @example
 * ```tsx
 * // Sync signal
 * const user = signal({ name: "Alice", age: 30 });
 * rx(user, "name")        // ✅ Renders: "Alice"
 * rx(user, u => u.age)    // ✅ Renders: 30
 *
 * // Async signal - selector receives resolved value
 * const asyncUser = signal(async () => fetchUser());
 * rx(asyncUser, "name")   // ✅ Throws for Suspense, then renders name
 * ```
 */
export function rx<T>(
  signal: Signal<T>,
  selector:
    | keyof ResolveAwaitable<T>
    | ((value: ResolveAwaitable<T>) => unknown)
): ReactNode;

// Overload 3: Reactive function - automatic signal tracking
export function rx<T>(fn: () => T): ReactNode;

// Overload 4: Component with reactive props
/**
 * Render a component with reactive props. Signal values in props are
 * automatically tracked and unwrapped.
 *
 * @example
 * ```tsx
 * const count = signal(0);
 * const theme = signal("dark");
 *
 * // HTML element
 * rx("div", { className: theme, children: count })
 *
 * // Custom component
 * rx(MyButton, { onClick: handleClick, disabled: isLoading })
 * ```
 */
export function rx<
  T extends keyof JSX.IntrinsicElements | React.ComponentType<any>
>(
  component: T,
  props: T extends keyof JSX.IntrinsicElements
    ? JSX.IntrinsicElements[T]
    : T extends React.ComponentType<infer P>
    ? P
    : {}
): ReactNode;

// Implementation
export function rx(...args: any[]): ReactElement {
  const first = args[0];

  // Check if first arg is a signal (overloads 1 & 2)
  if (is(first)) {
    const signal = first as Signal<any>;
    const second = args[1];

    // Overload 2: rx(signal, selector)
    if (typeof second === "string") {
      const selector = second;
      return <Rx fn={() => tryWait(signal())?.[selector]} />;
    }

    if (typeof second === "function") {
      const selector = second;
      return <Rx fn={() => selector(tryWait(signal()))} />;
    }

    // Overload 1: rx(signal)
    return <Rx fn={() => tryWait(signal())} />;
  }

  // Overload 3: rx(fn) - function with no second argument
  if (typeof first === "function" && args[1] === undefined) {
    const fn = first as () => ReactNode;
    return <Rx fn={fn} />;
  }

  // Overload 4: rx(Component, props)
  if (
    (typeof first === "function" ||
      typeof first === "string" ||
      typeof first === "object") &&
    typeof args[1] === "object"
  ) {
    const Component = first;
    const props = args[1] || {};
    const signalProps: Record<string, Signal<any>> = {};
    const normalProps: Record<string, any> = {};
    for (const [key, value] of Object.entries(props)) {
      if (is(value)) {
        signalProps[key] = value;
      } else {
        normalProps[key] = value;
      }
    }

    return (
      <Rx
        fn={() => {
          const resolvedProps = { ...normalProps, ...wait(signalProps) };
          return <Component {...resolvedProps} />;
        }}
      />
    );
  }

  // Invalid arguments
  throw new Error(
    "rx() expects a signal, function, or component. " +
      "Usage: rx(signal), rx(signal, selector), rx(fn), or rx(Component, props)"
  );
}

function tryWait(value: unknown): any {
  if (!isPromiseLike(value)) return value;
  return wait(value);
}

/**
 * Internal component for rendering with automatic signal tracking.
 * Uses useRx to track any signals accessed during fn execution.
 */
const Rx = memo((props: { fn: () => unknown }) => {
  return <>{useRx(props.fn) ?? null}</>;
});

/**
 * rx.use - Hook for subscribing to signals in render functions
 *
 * This is the underlying hook used by `rx()` for automatic signal tracking.
 * Use this when you need to subscribe to signals in a custom hook or component
 * without wrapping the entire render in `rx()`.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const value = rx.use(() => {
 *     const a = signalA();
 *     const b = signalB();
 *     return a + b;
 *   });
 *
 *   return <div>{value}</div>;
 * }
 * ```
 */
rx.use = useRx;
