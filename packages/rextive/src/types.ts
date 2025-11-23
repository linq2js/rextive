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

    /**
     * Transform signal value (stateless, pure function)
     *
     * Creates a new computed signal that applies the transform function
     * to each value from the source signal.
     *
     * @param fn - Pure transformation function (value: T) => U
     * @param equalsOrOptions - Optional equality strategy/function or full options object
     * @returns New computed signal with transformed values
     *
     * @example
     * ```ts
     * const count = signal(0);
     * const doubled = count.map(x => x * 2);
     * const formatted = count.map(x => `Count: ${x}`);
     *
     * // With equality string shortcuts
     * const name = user.map(u => u.name, 'shallow');
     * const data = user.map(u => u.data, 'deep');
     *
     * // With custom equals function
     * const name = user.map(u => u.name, (a, b) => a === b);
     *
     * // With full options
     * const name = user.map(u => u.name, { equals: 'shallow', name: 'userName' });
     * ```
     */
    map<U>(
      fn: (value: TValue | TInit) => U,
      equalsOrOptions?: "is" | "shallow" | "deep" | ((a: U, b: U) => boolean) | SignalOptions<U>
    ): ComputedSignal<U>;

    /**
     * Accumulate values with state (stateful operation)
     *
     * Creates a new computed signal that maintains an accumulator value,
     * similar to Array.reduce(). The accumulator is updated on each
     * source signal change.
     *
     * @param fn - Accumulator function (accumulator: U, current: T) => U
     * @param initialValue - Initial accumulator value (determines output type)
     * @param equalsOrOptions - Optional equality strategy/function or full options object
     * @returns New computed signal with accumulated values
     *
     * @example
     * ```ts
     * const count = signal(0);
     *
     * // Running total
     * const total = count.scan((sum, curr) => sum + curr, 0);
     *
     * // Delta from previous
     * const delta = count.scan((prev, curr) => curr - prev, 0);
     *
     * // Keep last N values
     * const last5 = count.scan(
     *   (acc, curr) => [...acc, curr].slice(-5),
     *   [] as number[]
     * );
     *
     * // With equality string shortcuts
     * const stats = count.scan(
     *   (acc, curr) => ({ sum: acc.sum + curr, count: acc.count + 1 }),
     *   { sum: 0, count: 0 },
     *   'shallow'
     * );
     *
     * // With custom equals function
     * const stats = count.scan(
     *   (acc, curr) => ({ sum: acc.sum + curr, count: acc.count + 1 }),
     *   { sum: 0, count: 0 },
     *   (a, b) => a.sum === b.sum
     * );
     *
     * // With full options
     * const stats = count.scan(
     *   (acc, curr) => ({ sum: acc.sum + curr, count: acc.count + 1 }),
     *   { sum: 0, count: 0 },
     *   { equals: 'deep', name: 'stats' }
     * );
     * ```
     */
    scan<U>(
      fn: (accumulator: U, current: TValue | TInit) => U,
      initialValue: U,
      equalsOrOptions?: "is" | "shallow" | "deep" | ((a: U, b: U) => boolean) | SignalOptions<U>
    ): ComputedSignal<U>;
  };

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
    deps: ResolveValue<TDependencies, "value">;
  };

/**
 * Options for signal creation
 */
export type SignalOptions<T> = {
  /** 
   * Custom equality function or strategy to determine if value changed.
   * 
   * Supports:
   * - `'is'` or `undefined` - Object.is (default, reference equality)
   * - `'shallow'` - Shallow equality (compares object keys/array elements)
   * - `'deep'` - Deep equality (lodash isEqual, recursive comparison)
   * - Custom function - `(a: T, b: T) => boolean`
   * 
   * @example
   * ```ts
   * signal(obj, 'shallow')              // String shortcut
   * signal(obj, { equals: 'deep' })     // In options
   * signal(obj, (a, b) => a.id === b.id) // Custom function
   * ```
   */
  equals?: "is" | "shallow" | "deep" | ((a: any, b: any) => boolean);
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

/**
 * Resolve signal values based on access type
 */
export type ResolveValue<
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
