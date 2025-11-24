import type { Tag } from "./tag";

/**
 * Function type for use with proxies.
 */
export type AnyFunc = (...args: any[]) => any;

/**
 * Listener type for emitters
 */
export type Listener<T> = (value: T) => void;

export type SingleOrMultipleListeners<T> = Listener<T> | Listener<T>[];

/**
 * Equality function type for comparing values
 */
export type EqualsFn<T = any> = (a: T, b: T) => boolean;

/**
 * Observable interface for reactive values
 */
export type Observable = {
  on(listener: VoidFunction): VoidFunction;
};

/**
 * Accessor interface combining Observable with a getter
 */
export type Accessor<T> = Observable & {
  (): T;
};

/**
 * Disposable interface for cleanup
 */
export type Disposable = {
  /**
   * Dispose of the disposable
   */
  dispose(): void;
};

export type ExDisposable = {
  dispose?: VoidFunction | Disposable | (VoidFunction | Disposable)[];
};

/**
 * Type helper to convert union to intersection
 * @internal
 */
export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

/**
 * Signal operator function type
 *
 * A function that takes a signal and returns a transformed signal.
 * Used for composing signal transformations in a type-safe manner.
 *
 * @template TSource - The input signal type
 * @template TResult - The output signal type
 */
export type SignalOperator<TSource, TResult> = (source: TSource) => TResult;

/**
 * Infer the result type of a transformation chain
 *
 * Recursively applies operators left-to-right, threading the output type
 * of each operator as the input type to the next operator.
 *
 * @template TSource - The starting signal type
 * @template TOperators - Array of operators to apply sequentially
 *
 * @example
 * ```ts
 * // Given operators:
 * const op1 = (s: Signal<number>) => s.map(x => x * 2);      // Signal<number> -> Signal<number>
 * const op2 = (s: Signal<number>) => s.map(x => String(x));  // Signal<number> -> Signal<string>
 *
 * // ToResult infers:
 * type Result = ToResult<Signal<number>, [typeof op1, typeof op2]>;
 * // Result = Signal<string>
 * ```
 */
export type PipeResult<
  TOperators extends readonly SignalOperator<any, any>[],
  TResult
> = TOperators extends [
  infer First extends SignalOperator<any, any>,
  ...infer Rest extends SignalOperator<any, any>[]
]
  ? PipeResult<Rest, ReturnType<First>>
  : TResult;

/**
 * Type helper to infer the final result of chaining value selectors
 */
export type ToChainResult<
  TSelectors extends ReadonlyArray<(value: any) => any>,
  TResult = never
> = TSelectors extends [
  infer First extends (value: any) => any,
  ...infer Rest extends ReadonlyArray<(value: any) => any>
]
  ? ToChainResult<Rest, ReturnType<First>>
  : TResult;

/**
 * Status returned by hydrate() method
 */
export type HydrateStatus = "success" | "skipped";

/**
 * Base signal interface - common functionality for all signal types
 */
export type Signal<TValue, TInit = TValue> = Observable &
  Disposable &
  Accessor<TValue | TInit> & {
    readonly displayName?: string;

    get(): TValue | TInit;

    /**
     * Reset the signal to its initial value
     * Also clears the modification flag, allowing hydration again
     */
    reset(): void;

    /**
     * Custom JSON serialization - returns the current signal value
     * Useful for JSON.stringify() and debugging
     */
    toJSON(): TValue | TInit;

    /**
     * Hydrate the signal with a value (e.g., from SSR or persistence)
     *
     * For computed signals: skips if already computed, returns "skipped"
     * For mutable signals: skips if already modified via set(), returns "skipped"
     *
     * This is intended for initial data loading only, not regular updates.
     * Multiple hydrations are allowed only before the signal is modified.
     *
     * @returns "success" if value was hydrated, "skipped" if already modified/computed
     */
    hydrate(value: TValue): HydrateStatus;

    // .map() method removed - use select operator from rextive/op instead
    // This avoids confusion with Array.map when signal values are arrays

    /**
     * Transform signal through a chain of operators
     *
     * Applies a series of operator functions to the signal, passing the result
     * of each operator to the next. This enables composing complex transformations
     * in a readable, left-to-right manner.
     *
     * **Type Safety:** Each operator must return a signal. The output type of each
     * operator becomes the input type of the next, ensuring type safety through
     * the entire chain.
     *
     * **Memory Management:** When the final result is disposed, all intermediate
     * signals created by the operators are automatically disposed.
     *
     * @template TResult - The output type of the first operator
     * @template TOperators - Array of subsequent operators
     * @param op - First operator (required) - transforms this signal
     * @param operators - Additional operators to apply sequentially
     * @returns The final transformed signal
     *
     * @example Basic usage
     * ```ts
     * const count = signal(0);
     *
     * // Without to() (nested, hard to read)
     * const result = count.map(x => x * 2).map(x => x + 1).map(x => `Value: ${x}`);
     *
     * // With to() (linear, easy to read)
     * const result = count.to(
     *   s => s.map(x => x * 2),
     *   s => s.map(x => x + 1),
     *   s => s.map(x => `Value: ${x}`)
     * );
     * ```
     *
     * @example Reusable operators
     * ```ts
     * // Define reusable operators
     * const double = (s: Signal<number>) => s.map(x => x * 2);
     * const addOne = (s: Signal<number>) => s.map(x => x + 1);
     * const format = (s: Signal<number>) => s.map(x => `Value: ${x}`);
     *
     * // Compose them
     * const result = count.pipe(double, addOne, format);
     * // Type: ComputedSignal<string>
     * ```
     *
     * @example Type inference
     * ```ts
     * const user = signal({ name: "Alice", age: 30 });
     *
     * const displayName = user.pipe(
     *   s => s.map(u => u.name),              // Signal<string>
     *   s => s.map(name => name.toUpperCase()) // Signal<string>
     * );
     * // Type: ComputedSignal<string>
     * ```
     */
    // 1 operator
    pipe<T1>(
      op1: SignalOperator<Signal<TValue, TInit>, T1>
    ): TryInjectDispose<T1>;

    // 2 operators
    pipe<T1, T2>(
      op1: SignalOperator<Signal<TValue, TInit>, T1>,
      op2: SignalOperator<T1, T2>
    ): TryInjectDispose<T2>;

    // 3 operators
    pipe<T1, T2, T3>(
      op1: SignalOperator<Signal<TValue, TInit>, T1>,
      op2: SignalOperator<T1, T2>,
      op3: SignalOperator<T2, T3>
    ): TryInjectDispose<T3>;

    // 4 operators
    pipe<T1, T2, T3, T4>(
      op1: SignalOperator<Signal<TValue, TInit>, T1>,
      op2: SignalOperator<T1, T2>,
      op3: SignalOperator<T2, T3>,
      op4: SignalOperator<T3, T4>
    ): TryInjectDispose<T4>;

    // 5 operators
    pipe<T1, T2, T3, T4, T5>(
      op1: SignalOperator<Signal<TValue, TInit>, T1>,
      op2: SignalOperator<T1, T2>,
      op3: SignalOperator<T2, T3>,
      op4: SignalOperator<T3, T4>,
      op5: SignalOperator<T4, T5>
    ): TryInjectDispose<T5>;

    // 6 operators
    pipe<T1, T2, T3, T4, T5, T6>(
      op1: SignalOperator<Signal<TValue, TInit>, T1>,
      op2: SignalOperator<T1, T2>,
      op3: SignalOperator<T2, T3>,
      op4: SignalOperator<T3, T4>,
      op5: SignalOperator<T4, T5>,
      op6: SignalOperator<T5, T6>
    ): TryInjectDispose<T6>;

    // 7 operators
    pipe<T1, T2, T3, T4, T5, T6, T7>(
      op1: SignalOperator<Signal<TValue, TInit>, T1>,
      op2: SignalOperator<T1, T2>,
      op3: SignalOperator<T2, T3>,
      op4: SignalOperator<T3, T4>,
      op5: SignalOperator<T4, T5>,
      op6: SignalOperator<T5, T6>,
      op7: SignalOperator<T6, T7>
    ): TryInjectDispose<T7>;

    // 8 operators
    pipe<T1, T2, T3, T4, T5, T6, T7, T8>(
      op1: SignalOperator<Signal<TValue, TInit>, T1>,
      op2: SignalOperator<T1, T2>,
      op3: SignalOperator<T2, T3>,
      op4: SignalOperator<T3, T4>,
      op5: SignalOperator<T4, T5>,
      op6: SignalOperator<T5, T6>,
      op7: SignalOperator<T6, T7>,
      op8: SignalOperator<T7, T8>
    ): TryInjectDispose<T8>;

    // 9 operators
    pipe<T1, T2, T3, T4, T5, T6, T7, T8, T9>(
      op1: SignalOperator<Signal<TValue, TInit>, T1>,
      op2: SignalOperator<T1, T2>,
      op3: SignalOperator<T2, T3>,
      op4: SignalOperator<T3, T4>,
      op5: SignalOperator<T4, T5>,
      op6: SignalOperator<T5, T6>,
      op7: SignalOperator<T6, T7>,
      op8: SignalOperator<T7, T8>,
      op9: SignalOperator<T8, T9>
    ): TryInjectDispose<T9>;

    // 10 operators
    pipe<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10>(
      op1: SignalOperator<Signal<TValue, TInit>, T1>,
      op2: SignalOperator<T1, T2>,
      op3: SignalOperator<T2, T3>,
      op4: SignalOperator<T3, T4>,
      op5: SignalOperator<T4, T5>,
      op6: SignalOperator<T5, T6>,
      op7: SignalOperator<T6, T7>,
      op8: SignalOperator<T7, T8>,
      op9: SignalOperator<T8, T9>,
      op10: SignalOperator<T9, T10>
    ): TryInjectDispose<T10>;

    /**
     * Chain value transformations (selector pipeline)
     *
     * Unlike `pipe()` which works with signal operators, `to()` chains value selectors.
     * Each selector receives the result value of the previous selector.
     *
     * @example
     * ```ts
     * const user = signal({ name: "Alice", age: 30 });
     *
     * const greeting = user.to(
     *   u => u.name,              // "Alice"
     *   name => name.toUpperCase(), // "ALICE"
     *   name => `Hello, ${name}!`   // "Hello, ALICE!"
     * );
     * // greeting() === "Hello, ALICE!"
     * ```
     */
    // 1 selector
    to<T1>(s1: (value: TValue) => T1): ComputedSignal<T1>;

    // 2 selectors
    to<T1, T2>(
      s1: (value: TValue) => T1,
      s2: (value: T1) => T2
    ): ComputedSignal<T2>;

    // 3 selectors
    to<T1, T2, T3>(
      s1: (value: TValue) => T1,
      s2: (value: T1) => T2,
      s3: (value: T2) => T3
    ): ComputedSignal<T3>;

    // 4 selectors
    to<T1, T2, T3, T4>(
      s1: (value: TValue) => T1,
      s2: (value: T1) => T2,
      s3: (value: T2) => T3,
      s4: (value: T3) => T4
    ): ComputedSignal<T4>;

    // 5 selectors
    to<T1, T2, T3, T4, T5>(
      s1: (value: TValue) => T1,
      s2: (value: T1) => T2,
      s3: (value: T2) => T3,
      s4: (value: T3) => T4,
      s5: (value: T4) => T5
    ): ComputedSignal<T5>;

    // 6 selectors
    to<T1, T2, T3, T4, T5, T6>(
      s1: (value: TValue) => T1,
      s2: (value: T1) => T2,
      s3: (value: T2) => T3,
      s4: (value: T3) => T4,
      s5: (value: T4) => T5,
      s6: (value: T5) => T6
    ): ComputedSignal<T6>;

    // 7 selectors
    to<T1, T2, T3, T4, T5, T6, T7>(
      s1: (value: TValue) => T1,
      s2: (value: T1) => T2,
      s3: (value: T2) => T3,
      s4: (value: T3) => T4,
      s5: (value: T4) => T5,
      s6: (value: T5) => T6,
      s7: (value: T6) => T7
    ): ComputedSignal<T7>;

    // 8 selectors
    to<T1, T2, T3, T4, T5, T6, T7, T8>(
      s1: (value: TValue) => T1,
      s2: (value: T1) => T2,
      s3: (value: T2) => T3,
      s4: (value: T3) => T4,
      s5: (value: T4) => T5,
      s6: (value: T5) => T6,
      s7: (value: T6) => T7,
      s8: (value: T7) => T8
    ): ComputedSignal<T8>;

    // 9 selectors
    to<T1, T2, T3, T4, T5, T6, T7, T8, T9>(
      s1: (value: TValue) => T1,
      s2: (value: T1) => T2,
      s3: (value: T2) => T3,
      s4: (value: T3) => T4,
      s5: (value: T4) => T5,
      s6: (value: T5) => T6,
      s7: (value: T6) => T7,
      s8: (value: T7) => T8,
      s9: (value: T8) => T9
    ): ComputedSignal<T9>;

    // 10 selectors
    to<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10>(
      s1: (value: TValue) => T1,
      s2: (value: T1) => T2,
      s3: (value: T2) => T3,
      s4: (value: T3) => T4,
      s5: (value: T4) => T5,
      s6: (value: T5) => T6,
      s7: (value: T6) => T7,
      s8: (value: T7) => T8,
      s9: (value: T8) => T9,
      s10: (value: T9) => T10
    ): ComputedSignal<T10>;
  };

export type TryInjectDispose<T> = T extends object
  ? T & { dispose: VoidFunction }
  : T;

/**
 * Mutable signal - can be modified with set()
 * Created when signal() is called without dependencies
 *
 * **Type Parameters:**
 * - `TValue`: The value type that can be set
 * - `TInit`: The initial value type (defaults to TValue)
 *
 * **Important:** For no-arg signals like `signal<T>()`:
 * - Type is `MutableSignal<T, undefined>`
 * - `get()` returns `T | undefined`
 * - `set()` only accepts `T`, NOT `undefined`
 * - To allow setting `undefined`, use `signal<T | undefined>()`
 *
 * @example
 * ```ts
 * // No-arg signal: get() returns T | undefined, set() requires T
 * const user = signal<User>();
 * user(); // User | undefined
 * user.set(someUser); // ✅ OK
 * user.set(undefined); // ❌ Type error!
 *
 * // Nullable signal: get() and set() both accept T | undefined
 * const nullable = signal<User | undefined>();
 * nullable.set(someUser); // ✅ OK
 * nullable.set(undefined); // ✅ OK
 * ```
 */
export type MutableSignal<TValue, TInit = TValue> = Signal<TValue, TInit> & {
  /**
   * Set signal value directly
   * @param value - New value (type: TValue, not TInit)
   */
  set(value: TValue): void;

  /**
   * Update signal value via reducer function (returns new value)
   * @param reducer - Function that receives current value (TValue | TInit) and returns new value (TValue)
   */
  set(reducer: (prev: NoInfer<TValue | TInit>) => TValue): void;
};

/**
 * Computed signal - read-only, derived from dependencies
 * Created when signal() is called with dependencies
 */
export type ComputedSignal<TValue, TInit = TValue> = Signal<TValue, TInit> & {
  /**
   * Pause the signal - stops recomputations when dependencies change
   * The signal will not update until resume() is called
   */
  pause(): void;

  /**
   * Resume the signal - enables recomputations
   * Recomputes immediately with current dependency values
   */
  resume(): void;

  /**
   * Check if the signal is currently paused
   */
  paused(): boolean;
};

/**
 * Map of signal names to signal instances
 * Accepts both MutableSignal and ComputedSignal
 */
export type SignalMap = Record<string, Signal<any>>;

/**
 * Base context for signal computation functions
 */
export type SignalContext = {
  /**
   * AbortSignal that gets triggered when:
   * - Signal is disposed
   * - Signal recomputes (previous computation aborted)
   */
  abortSignal: AbortSignal;

  /**
   * Register a cleanup function that runs when:
   * - Signal recomputes (cleanup previous side effects)
   * - Signal is disposed
   */
  cleanup: (fn: VoidFunction) => void;
};

export type WithUse<T> = T & {
  use<TArgs extends any[], TReturn>(
    logic: (context: WithUse<T>, ...args: TArgs) => TReturn,
    ...args: TArgs
  ): TReturn;
};

/**
 * Context for computed signal computation functions (with dependencies)
 */
export type ComputedSignalContext<TDependencies extends SignalMap = {}> =
  SignalContext & {
    /**
     * Proxy object that provides access to dependency signal values.
     * Automatically tracks which dependencies are accessed.
     */
    deps: ResolvedValueMap<TDependencies, "value">;
  };

/**
 * Options for signal creation
 */
export type SignalOptions<T> = {
  /**
   * Custom equality function or strategy to determine if value changed.
   *
   * Supports:
   * - `'strict'` or `undefined` - Object.is (default, strict equality)
   * - `'shallow'` - Shallow equality (compares object keys/array elements)
   * - `'deep'` - Deep equality (lodash isEqual, recursive comparison)
   * - Custom function - `(a: T, b: T) => boolean`
   *
   * @example
   * ```ts
   * signal(obj, 'shallow')              // String shortcut
   * signal(obj, { equals: 'deep' })     // In options
   * signal(obj, { equals: (a, b) => a.id === b.id }) // Custom function (use options)
   * ```
   */
  equals?: "strict" | "shallow" | "deep" | EqualsFn<T>;
  /** Debug name for the signal */
  name?: string;
  /** Fallback function to recover from errors */
  fallback?: (error: unknown) => T;
  /**
   * Optional tags for grouping signals together.
   *
   * Tags allow batch operations on multiple signals. A signal can belong
   * to multiple tags at once.
   */
  tags?: readonly Tag<T>[];
  /** Called whenever signal value changes (receives new value) */
  onChange?: SingleOrMultipleListeners<T>;
  /** Called whenever signal computation throws an error (receives error) */
  onError?: SingleOrMultipleListeners<unknown>;
  /**
   * Whether the signal computation is lazy (default: true).
   *
   * - `lazy: true` (default): Computation runs only when the signal is accessed
   * - `lazy: false`: Computation runs immediately when the signal is created or dependencies change
   *
   * Use `lazy: false` for:
   * - Side effects that need to run immediately
   * - Pre-fetching data eagerly
   * - Effects that update DOM or external state
   *
   * @example Lazy (default) - runs only when accessed
   * ```ts
   * const user = signal(async () => fetchUser()); // Not fetched yet
   * user(); // Fetches now
   * ```
   *
   * @example Eager - runs immediately
   * ```ts
   * signal({ count }, ({ deps }) => {
   *   document.title = `Count: ${deps.count}`;
   * }, { lazy: false }); // Updates title immediately
   * ```
   */
  lazy?: boolean;
};

export type ResolveValueType = "awaited" | "loadable" | "value";

export type ResolveAwaitable<T> = T extends Signal<infer TValue>
  ? ResolveAwaitable<TValue>
  : T extends Loadable<any>
  ? Awaited<T["promise"]>
  : Awaited<T>;

/**
 * Resolve signal values based on access type
 */
export type ResolvedValueMap<
  TMap extends SignalMap,
  TType extends ResolveValueType
> = {
  readonly [K in keyof TMap]: TMap[K] extends () => infer T
    ? TType extends "awaited"
      ? Awaited<T>
      : TType extends "loadable"
      ? Loadable<Awaited<T>>
      : TType extends "value"
      ? T
      : never
    : never;
};

/**
 * Internal symbol used to identify loadable objects at runtime.
 * This allows for reliable type checking without relying on duck typing.
 */
export const LOADABLE_TYPE = Symbol("LOADABLE_TYPE");

/**
 * Represents the status of an async operation.
 */
export type LoadableStatus = "loading" | "success" | "error";

/**
 * Represents an in-progress async operation.
 *
 * @property status - Always "loading"
 * @property promise - The underlying promise being awaited
 * @property data - Always undefined (no data yet)
 * @property error - Always undefined (no error yet)
 * @property loading - Always true
 *
 * @example
 * ```typescript
 * const loadingState: LoadingLoadable = {
 *   [LOADABLE_TYPE]: true,
 *   status: "loading",
 *   promise: fetchUser(1),
 *   value: undefined,
 *   error: undefined,
 *   loading: true,
 * };
 * ```
 */
export type LoadingLoadable<TValue> = {
  [LOADABLE_TYPE]: true;
  status: "loading";
  promise: PromiseLike<TValue>;
  value: undefined;
  error: undefined;
  loading: true;
};

/**
 * Represents a successfully completed async operation.
 *
 * @template TValue - The type of the successful result
 * @property status - Always "success"
 * @property promise - The resolved promise
 * @property value - The successful result data
 * @property error - Always undefined (no error)
 * @property loading - Always false
 *
 * @example
 * ```typescript
 * const successState: SuccessLoadable<User> = {
 *   [LOADABLE_TYPE]: true,
 *   status: "success",
 *   promise: Promise.resolve(user),
 *   value: { id: 1, name: "Alice" },
 *   error: undefined,
 *   loading: false,
 * };
 * ```
 */
export type SuccessLoadable<TValue> = {
  [LOADABLE_TYPE]: true;
  status: "success";
  promise: PromiseLike<TValue>;
  value: TValue;
  error: undefined;
  loading: false;
};

/**
 * Represents a failed async operation.
 *
 * @property status - Always "error"
 * @property promise - The rejected promise
 * @property value - Always undefined (no data)
 * @property error - The error that occurred
 * @property loading - Always false
 *
 * @example
 * ```typescript
 * const errorState: ErrorLoadable = {
 *   [LOADABLE_TYPE]: true,
 *   status: "error",
 *   promise: Promise.reject(new Error("Failed")),
 *   value: undefined,
 *   error: new Error("Failed"),
 *   loading: false,
 * };
 * ```
 */
export type ErrorLoadable<TValue> = {
  [LOADABLE_TYPE]: true;
  status: "error";
  promise: PromiseLike<TValue>;
  value: undefined;
  error: unknown;
  loading: false;
};

/**
 * A discriminated union representing all possible states of an async operation.
 *
 * A Loadable encapsulates the three states of async data:
 * - `LoadingLoadable`: Operation in progress
 * - `SuccessLoadable<T>`: Operation completed successfully with data
 * - `ErrorLoadable`: Operation failed with error
 *
 * Each loadable maintains a reference to the underlying promise, allowing
 * integration with React Suspense and other promise-based systems.
 *
 * @template T - The type of data when operation succeeds
 *
 * @example
 * ```typescript
 * // Type-safe pattern matching
 * function renderLoadable<T>(loadable: Loadable<T>) {
 *   switch (loadable.status) {
 *     case "loading":
 *       return <Spinner />;
 *     case "success":
 *       return <div>{loadable.value}</div>; // TypeScript knows data exists
 *     case "error":
 *       return <Error error={loadable.error} />; // TypeScript knows error exists
 *   }
 * }
 * ```
 */
export type Loadable<T> =
  | LoadingLoadable<T>
  | SuccessLoadable<T>
  | ErrorLoadable<T>;
