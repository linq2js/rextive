export const SIGNAL_TYPE = Symbol("SIGNAL_TYPE");
export const TAG_TYPE = Symbol("TAG_TYPE");

/**
 * Unique symbol brands for tag kind discrimination.
 *
 * These symbols make Tag<T, TKind> invariant in TKind, which helps prevent
 * incorrect cross-kind tag assignments at compile time.
 *
 * Without these brands, TypeScript's structural typing would allow:
 *   Tag<number, "mutable"> = Tag<number, "computed">  // Should error!
 *
 * With brands:
 *   Tag<number, "mutable"> has __brand: typeof MUTABLE_TAG_BRAND
 *   Tag<number, "computed"> has __brand: typeof COMPUTED_TAG_BRAND
 *   These are incompatible → compile error ✓
 *
 * Note: Array literal contexts may still not catch all errors due to
 * TypeScript limitations. See UseList<T, TKind> docs for details.
 *
 * @internal These are type-level only and never exist at runtime
 */
export declare const MUTABLE_TAG_BRAND: unique symbol;
export declare const COMPUTED_TAG_BRAND: unique symbol;

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
    pipe: {
      <T1>(
        op1: SignalOperator<Signal<TValue, TInit>, T1>
      ): TryInjectDispose<T1>;

      // 2 operators
      <T1, T2>(
        op1: SignalOperator<Signal<TValue, TInit>, T1>,
        op2: SignalOperator<T1, T2>
      ): TryInjectDispose<T2>;

      // 3 operators
      <T1, T2, T3>(
        op1: SignalOperator<Signal<TValue, TInit>, T1>,
        op2: SignalOperator<T1, T2>,
        op3: SignalOperator<T2, T3>
      ): TryInjectDispose<T3>;

      // 4 operators
      <T1, T2, T3, T4>(
        op1: SignalOperator<Signal<TValue, TInit>, T1>,
        op2: SignalOperator<T1, T2>,
        op3: SignalOperator<T2, T3>,
        op4: SignalOperator<T3, T4>
      ): TryInjectDispose<T4>;

      // 5 operators
      <T1, T2, T3, T4, T5>(
        op1: SignalOperator<Signal<TValue, TInit>, T1>,
        op2: SignalOperator<T1, T2>,
        op3: SignalOperator<T2, T3>,
        op4: SignalOperator<T3, T4>,
        op5: SignalOperator<T4, T5>
      ): TryInjectDispose<T5>;

      // 6 operators
      <T1, T2, T3, T4, T5, T6>(
        op1: SignalOperator<Signal<TValue, TInit>, T1>,
        op2: SignalOperator<T1, T2>,
        op3: SignalOperator<T2, T3>,
        op4: SignalOperator<T3, T4>,
        op5: SignalOperator<T4, T5>,
        op6: SignalOperator<T5, T6>
      ): TryInjectDispose<T6>;

      // 7 operators
      <T1, T2, T3, T4, T5, T6, T7>(
        op1: SignalOperator<Signal<TValue, TInit>, T1>,
        op2: SignalOperator<T1, T2>,
        op3: SignalOperator<T2, T3>,
        op4: SignalOperator<T3, T4>,
        op5: SignalOperator<T4, T5>,
        op6: SignalOperator<T5, T6>,
        op7: SignalOperator<T6, T7>
      ): TryInjectDispose<T7>;

      // 8 operators
      <T1, T2, T3, T4, T5, T6, T7, T8>(
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
      <T1, T2, T3, T4, T5, T6, T7, T8, T9>(
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
      <T1, T2, T3, T4, T5, T6, T7, T8, T9, T10>(
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
    };

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
    /**
     * Simple transformation - apply a single selector to this signal's value.
     *
     * This is a convenience method for creating a derived signal with a simple
     * transformation. It's a shorthand for `.pipe(select(...))`.
     *
     * **For chaining multiple transformations, use `.pipe()`.**
     *
     * @template T - The result type after transformation
     * @param selector - Function to transform the signal's value
     * @returns A new computed signal with the transformed value
     *
     * @example Basic transformation
     * ```ts
     * const count = signal(5);
     * const doubled = count.to((x) => x * 2);
     * const formatted = count.to((x) => `Count: ${x}`);
     *
     * console.log(doubled()); // 10
     * console.log(formatted()); // "Count: 5"
     * ```
     *
     * @example Accessing nested properties
     * ```ts
     * const user = signal({ name: "Alice", age: 30 });
     * const userName = user.to((u) => u.name);
     * const userAge = user.to((u) => u.age);
     * ```
     *
     * @example For multiple transformations, use .pipe()
     * ```ts
     * import { select, filter } from "rextive/op";
     *
     * // ❌ Don't do this - use .pipe() instead
     * // count.to(...).to(...).to(...)
     *
     * // ✅ Do this for multiple transformations
     * const result = count.pipe(
     *   filter((x) => x > 0),
     *   select((x) => x * 2),
     *   select((x) => `Value: ${x}`)
     * );
     * ```
     */
    to<T>(
      selector: (value: TValue, context: SignalContext) => T
    ): ComputedSignal<T>;

    /**
     * Trigger an immediate recomputation of this signal.
     *
     * - For **computed/async signals**: Re-runs the compute function immediately
     * - For **mutable signals**: No-op (nothing to recompute)
     * - Cancels any pending async computation (via abortSignal)
     * - Multiple rapid calls are batched into a single recomputation
     *
     * @example Polling pattern
     * ```ts
     * const liveData = signal(async (context) => {
     *   const data = await fetchData();
     *   // Schedule next refresh after getting data
     *   setTimeout(() => context.refresh(), 1000);
     *   return data;
     * });
     *
     * // Manual refresh from UI
     * <button onClick={() => liveData.refresh()}>Refresh Now</button>
     * ```
     *
     * @example After mutation
     * ```ts
     * const posts = signal(async () => fetchPosts());
     *
     * async function deletePost(id) {
     *   await api.delete(id);
     *   posts.refresh(); // Reload the list
     * }
     * ```
     */
    refresh(): void;

    /**
     * Mark this signal's data as stale without triggering recomputation.
     * The signal will recompute on the next access (lazy recomputation).
     *
     * - For **computed/async signals**: Marks as stale, recomputes on next get()
     * - For **mutable signals**: No-op (nothing to recompute)
     * - Useful for cache invalidation patterns
     * - Multiple stale() calls before access = single recomputation
     *
     * @example Cache invalidation
     * ```ts
     * const userData = signal(async () => fetchUser());
     *
     * // Mark stale after mutation (lazy)
     * async function updateUser(data) {
     *   await api.updateUser(data);
     *   userData.stale(); // Won't refetch until accessed
     * }
     *
     * // Later: access triggers recomputation
     * console.log(userData()); // Refetches now
     * ```
     *
     * @example Batch invalidations
     * ```ts
     * userData.stale();
     * userPosts.stale();
     * userComments.stale();
     * // None have recomputed yet
     *
     * // First access triggers its recomputation
     * console.log(userData()); // Fetches user data
     * ```
     */
    stale(): void;
  };

/**
 * Type-safe when() method for signals.
 *
 * This helper type provides proper type inference for the when() method,
 * ensuring the callback receives the exact signal type (MutableSignal or ComputedSignal)
 * rather than the base Signal type.
 *
 * @template TCurrent - The exact signal type (MutableSignal<T> or ComputedSignal<T>)
 * @param target - Single signal or readonly array of signals to watch
 * @param callback - Called when any target signal changes
 *   - `current`: The exact signal type with all its methods (set, refresh, stale, etc.)
 *   - `trigger`: The signal that triggered the callback
 * @returns The current signal (for method chaining)
 *
 * @example Type-safe callbacks
 * ```ts
 * // MutableSignal: callback receives MutableSignal
 * const count = signal(0);
 * count.when(trigger, (current) => {
 *   current.set(100); // ✅ .set() available
 * });
 *
 * // ComputedSignal: callback receives ComputedSignal
 * const user = signal(async () => fetchUser());
 * user.when(userId, (current) => {
 *   current.refresh(); // ✅ .refresh() available
 *   current.stale();   // ✅ .stale() available
 *   // current.set()   // ❌ Not available - computed is read-only
 * });
 * ```
 *
 * @example Method chaining
 * ```ts
 * cache
 *   .when(userId, (current) => current.refresh())
 *   .when([filter, sort], (current) => current.stale());
 * ```
 */
export type When<TCurrent> = <const TOther extends Signal<any>>(
  target: TOther | readonly TOther[],
  callback: (current: TCurrent, trigger: TOther) => void
) => TCurrent;

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

  /**
   * Watch other signals and react when they change.
   * The callback receives this mutable signal, allowing you to call `.set()`.
   *
   * @param target - Single signal or array of signals to watch
   * @param callback - Called when any target signal changes
   * @returns This signal (for chaining)
   */
  when: When<MutableSignal<TValue, TInit>>;
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

  /**
   * Watch other signals and react when they change.
   * The callback receives this computed signal, allowing you to call `.refresh()`, `.stale()`.
   *
   * @param target - Single signal or array of signals to watch
   * @param callback - Called when any target signal changes
   * @returns This signal (for chaining)
   */
  when: When<ComputedSignal<TValue, TInit>>;
};

/**
 * Union type representing any signal (mutable or computed).
 *
 * Useful for generic functions that accept any signal type while still having
 * access to common methods like `when()`, `on()`, `refresh()`, etc.
 *
 * Unlike the base `Signal<T>` type, `AnySignal<T>` includes both `MutableSignal<T>`
 * and `ComputedSignal<T>`, which means TypeScript can infer methods that exist
 * on both types (intersection of their APIs).
 *
 * @template TValue - The signal's value type
 * @template TInit - The initial value type (defaults to TValue)
 *
 * @example Generic function accepting any signal
 * ```ts
 * function watchSignal<T>(s: AnySignal<T>) {
 *   s.when(otherSignal, (current) => {
 *     console.log('Changed:', current());
 *     // current can be either MutableSignal or ComputedSignal
 *   });
 * }
 *
 * const count = signal(0);
 * const doubled = signal({ count }, ({ deps }) => deps.count * 2);
 *
 * watchSignal(count);    // ✅ Works
 * watchSignal(doubled);  // ✅ Works
 * ```
 *
 * @example Type narrowing for specific operations
 * ```ts
 * function doSomething<T>(s: AnySignal<T>) {
 *   // Common operations work on both types
 *   s.on(() => console.log('Changed'));
 *   s.when(trigger, (current) => current.refresh());
 *
 *   // Type narrow for mutable-specific operations
 *   if ('set' in s) {
 *     s.set(newValue); // TypeScript knows this is MutableSignal
 *   }
 * }
 * ```
 */
export type AnySignal<TValue, TInit = TValue> =
  | MutableSignal<TValue, TInit>
  | ComputedSignal<TValue, TInit>;

/**
 * Map of signal names to signal instances
 * Accepts both MutableSignal and ComputedSignal
 */
export type SignalMap = Record<string, Signal<any>>;

/**
 * Signal kind discriminator
 *
 * Tags can accept union kinds (e.g., "mutable" | "computed") to work with both types
 */
export type SignalKind = "mutable" | "computed";

/**
 * Helper type to get the signal type based on kind
 */
export type SignalOf<T, K extends SignalKind> = K extends "any"
  ? MutableSignal<T> | ComputedSignal<T>
  : K extends "mutable"
  ? MutableSignal<T>
  : K extends "computed"
  ? ComputedSignal<T>
  : Signal<T>;

/**
 * Plugin function type for extending signal behavior.
 *
 * A plugin is a function that receives a signal instance and can:
 * - Subscribe to signal changes
 * - Add side effects
 * - Track signal lifecycle
 * - Optionally return a cleanup function
 *
 * Plugins are executed once when the signal is created (or when added to a tag).
 * They are NOT re-run on signal changes - use signal.on() inside the plugin for that.
 *
 * @template TValue - The signal's value type
 * @template TKind - The signal kind ("mutable" | "computed")
 * @param signal - The signal instance to enhance
 * @returns Optional cleanup function to run when signal is disposed
 *
 * @example Simple logger plugin
 * ```ts
 * const logger: Plugin<number> = (signal) => {
 *   console.log('Signal created:', signal.displayName);
 *   return signal.on(() => {
 *     console.log('Value changed:', signal());
 *   });
 * };
 *
 * const count = signal(0, { use: [logger] });
 * ```
 *
 * @example Persistence plugin
 * ```ts
 * const persister = (key: string): Plugin<any, "mutable"> => (signal) => {
 *   // Load from storage
 *   const stored = localStorage.getItem(key);
 *   if (stored) signal.set(JSON.parse(stored));
 *
 *   // Save on change
 *   return signal.on(() => {
 *     localStorage.setItem(key, JSON.stringify(signal()));
 *   });
 * };
 *
 * const settings = signal({}, { use: [persister('settings')] });
 * ```
 *
 * @example Type-safe plugin for mutable signals only
 * ```ts
 * const validator: Plugin<string, "mutable"> = (signal) => {
 *   return signal.on(() => {
 *     const value = signal();
 *     if (value.length > 100) {
 *       signal.set(value.slice(0, 100)); // Only works on MutableSignal
 *     }
 *   });
 * };
 * ```
 */
export type Plugin<TValue, TKind extends SignalKind = SignalKind> = (
  signal: SignalOf<TValue, TKind>
) => (() => void) | void;

/**
 * A tag for grouping signals together.
 *
 * Tags allow you to perform batch operations on multiple signals,
 * such as resetting form fields or disposing resources.
 *
 * Signals are automatically added to tags during signal creation via the `tags` option.
 * Signals are automatically removed from tags when disposed.
 *
 * @template TValue - The type of values held by signals in this tag
 * @template TKind - The signal kind: "mutable", "computed", or both (default: SignalKind)
 *
 * @example
 * ```ts
 * // Mixed tag (default) - accepts both mutable and computed signals
 * const mixedTag = tag<number>();
 *
 * // Mutable-only tag
 * const mutableTag = tag<number, "mutable">();
 *
 * // Computed-only tag
 * const computedTag = tag<number, "computed">();
 * ```
 */
export type Tag<TValue, TKind extends SignalKind = SignalKind> = {
  [TAG_TYPE]: true;

  /**
   * Brand property to make Tag invariant in TKind using unique symbols.
   * This prevents cross-kind tag assignment at compile time.
   * @internal
   */
  readonly __brand: TKind extends "mutable"
    ? typeof MUTABLE_TAG_BRAND
    : TKind extends "computed"
    ? typeof COMPUTED_TAG_BRAND
    : typeof MUTABLE_TAG_BRAND | typeof COMPUTED_TAG_BRAND;

  kind: TKind;

  /**
   * Plugins attached to this tag.
   * These plugins are automatically applied to any signal added to this tag.
   */
  readonly use: UseList<TValue, TKind>;

  /**
   * Iterates over all signals in this tag.
   *
   * @param fn - Function to call for each signal
   */
  forEach(fn: (signal: SignalOf<TValue, TKind>) => void): void;

  /**
   * Returns all signals in this tag as an array.
   *
   * @returns Array of signals
   */
  signals(): readonly SignalOf<TValue, TKind>[];

  /**
   * Checks if a signal is in this tag.
   *
   * @param signal - Signal to check
   * @returns True if signal is in tag
   */
  has(signal: Signal<TValue>): boolean;

  /**
   * Removes a signal from this tag.
   *
   * @param signal - Signal to remove
   * @returns True if signal was in tag and removed
   */
  delete(signal: SignalOf<TValue, TKind>): boolean;

  /**
   * Removes all signals from this tag.
   */
  clear(): void;

  /**
   * Number of signals in this tag.
   */
  readonly size: number;

  /**
   * Internal method to add a signal to this tag.
   * Called automatically by signal() when tags option is provided.
   *
   * @internal
   */
  _add(signal: SignalOf<TValue, TKind>): void;

  /**
   * Internal method to delete a signal from this tag.
   * Called automatically when signal is disposed.
   *
   * @internal
   */
  _delete(signal: SignalOf<TValue, TKind>): void;
};

/**
 * Base context for signal computation functions
 */
export interface SignalContext {
  aborted(): boolean;
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
  onCleanup: (fn: VoidFunction) => void;

  /**
   * Execute a function or promise safely within the abort-aware context.
   *
   * - For sync functions: Throws if aborted, otherwise executes normally
   * - For async functions: Returns a never-resolving promise if aborted, otherwise executes normally
   * - For promises: Returns a never-resolving promise if aborted, otherwise awaits the promise
   *
   * This prevents wasted work after a computation has been cancelled.
   *
   * @param fnOrPromise - Function to execute or promise to await
   * @param args - Arguments to pass to the function (if applicable)
   * @returns The result of the function/promise, or a never-resolving promise if aborted
   *
   * @example
   * ```ts
   * const mySignal = signal({ count }, async ({ deps, safe }) => {
   *   await fetch('/api/data', { signal: abortSignal });
   *
   *   // Safely delay - never resolves if aborted
   *   await safe(wait.delay(300));
   *
   *   // Safely run expensive operation
   *   const processed = safe(() => expensiveOperation(deps.count));
   *
   *   // Works with async functions too
   *   const result = await safe(async () => {
   *     return processData(processed);
   *   });
   *
   *   return result;
   * });
   * ```
   */
  safe<T>(promise: PromiseLike<T>): Promise<T>;
  safe<T>(fn: () => T): T;
  safe<T, TArgs extends any[]>(fn: (...args: TArgs) => T, ...args: TArgs): T;

  /**
   * Execute a logic function with the context itself as the first argument.
   *
   * This is a convenience method that combines `safe()` with passing the context,
   * allowing you to write reusable logic functions that receive the full context.
   *
   * **Behavior:**
   * - Wraps the logic function with `safe()` for abort safety
   * - Passes the context as the first argument to the logic function
   * - Supports additional arguments after the context
   * - Works with both sync and async logic functions
   *
   * @param logic - Function that receives the context as first argument
   * @param args - Additional arguments to pass to the logic function
   * @returns The result of the logic function
   * @throws {AbortedComputationError} If computation was aborted before execution
   *
   * @example Basic usage
   * ```ts
   * const count = signal(1);
   *
   * const computed = signal({ count }, (context) => {
   *   return context.use((ctx) => {
   *     return ctx.deps.count * 2;
   *   });
   * });
   * // computed() === 2
   * ```
   *
   * @example With additional arguments
   * ```ts
   * const count = signal(1);
   *
   * const multiply = (ctx, factor: number) => {
   *   return ctx.deps.count * factor;
   * };
   *
   * const computed = signal({ count }, (context) => {
   *   return context.use(multiply, 5);
   * });
   * // computed() === 5
   * ```
   *
   * @example Reusable logic functions
   * ```ts
   * const count = signal(1);
   * const multiplier = signal(2);
   *
   * // Define once, use everywhere
   * const multiply = (ctx) => ctx.deps.count * ctx.deps.multiplier;
   *
   * const result1 = signal({ count, multiplier }, (ctx) => ctx.use(multiply));
   * const result2 = signal({ count, multiplier }, (ctx) => ctx.use(multiply) + 10);
   * ```
   *
   * @example Async logic
   * ```ts
   * const userId = signal(1);
   *
   * const fetchUser = async (ctx) => {
   *   const response = await fetch(`/api/users/${ctx.deps.userId}`, {
   *     signal: ctx.abortSignal
   *   });
   *   return response.json();
   * };
   *
   * const user = signal({ userId }, async (context) => {
   *   return await context.use(fetchUser);
   * });
   * ```
   *
   * @example With cleanup
   * ```ts
   * const count = signal(1);
   *
   * const computed = signal({ count }, (context) => {
   *   return context.use((ctx) => {
   *     ctx.onCleanup(() => console.log('Cleanup!'));
   *     return ctx.deps.count * 2;
   *   });
   * });
   * ```
   *
   * @example Composing with other context methods
   * ```ts
   * const count = signal(1);
   *
   * const computed = signal({ count }, (context) => {
   *   return context.use((ctx) => {
   *     const step1 = ctx.safe(() => ctx.deps.count * 2);
   *     const step2 = ctx.safe(() => step1 + 10);
   *     return step2;
   *   });
   * });
   * ```
   */
  use<TArgs extends any[], TResult>(
    logic: (context: this, ...args: TArgs) => TResult,
    ...args: TArgs
  ): TResult;

  /**
   * Trigger an immediate recomputation of the signal from within the compute function.
   *
   * - Safe to call even if computation is aborted (no-op)
   * - Schedules the next computation after current one completes
   * - Useful for self-scheduling patterns (polling, intervals)
   *
   * @example Polling pattern
   * ```ts
   * const liveData = signal(async (context) => {
   *   const data = await fetchData();
   *   // Schedule next refresh after getting data
   *   setTimeout(() => context.refresh(), 1000);
   *   return data;
   * });
   * ```
   *
   * @example Exponential backoff
   * ```ts
   * const resilientData = signal(async (context) => {
   *   try {
   *     return await fetchData();
   *   } catch (error) {
   *     // Retry after 2 seconds
   *     setTimeout(() => context.refresh(), 2000);
   *     throw error;
   *   }
   * });
   * ```
   */
  refresh(): void;

  /**
   * Mark the signal as stale from within the compute function (lazy recomputation).
   *
   * - Safe to call even if computation is aborted (no-op)
   * - Signal will recompute on next access
   * - Useful for cache invalidation without immediate refresh
   *
   * @example Cache with TTL
   * ```ts
   * const cachedData = signal(async (context) => {
   *   const data = await fetchExpensiveData();
   *   // Mark stale after 5 minutes
   *   setTimeout(() => context.stale(), 5 * 60 * 1000);
   *   return data;
   * });
   * ```
   */
  stale(): void;
}

export type WithUse<T> = T & {
  use<TArgs extends any[], TReturn>(
    logic: (context: WithUse<T>, ...args: TArgs) => TReturn,
    ...args: TArgs
  ): TReturn;
};

export type PredefinedEquals = "strict" | "shallow" | "deep";

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

export type SignalExtraOptions<
  TValue,
  TKind extends SignalKind = SignalKind
> = {
  /**
   * Plugins to extend this signal's behavior.
   *
   * Plugins are functions that receive the signal instance and can:
   * - Subscribe to changes
   * - Add side effects
   * - Track lifecycle
   * - Return optional cleanup functions
   *
   * Plugins run once when the signal is created and when added to tags.
   *
   * @example
   * ```ts
   * const logger: Plugin<number> = (signal) => {
   *   return signal.on(() => console.log('Value:', signal()));
   * };
   *
   * const count = signal(0, { use: [logger] });
   * ```
   */
  use?: UseList<TValue, TKind>;
};

/**
 * List of plugins and tags that can be used with signals of a given kind.
 *
 * ## Type Safety Rules
 *
 * - **Mutable signals/tags** (TKind = "mutable") accept:
 *   - Mutable-specific plugins: `Plugin<T, "mutable">`
 *   - General plugins: `Plugin<T, SignalKind>`
 *   - Mutable-specific tags: `Tag<T, "mutable">`
 *   - General tags: `Tag<T, SignalKind>`
 *
 * - **Computed signals/tags** (TKind = "computed") accept:
 *   - Computed-specific plugins: `Plugin<T, "computed">`
 *   - General plugins: `Plugin<T, SignalKind>`
 *   - Computed-specific tags: `Tag<T, "computed">`
 *   - General tags: `Tag<T, SignalKind>`
 *
 * - **Mixed signals/tags** (TKind = SignalKind) accept:
 *   - Any general plugins: `Plugin<T, SignalKind>`
 *   - Any general tags: `Tag<T, SignalKind>`
 *
 * ## Known Limitations
 *
 * Due to TypeScript's structural typing, cross-kind tag assignment in array contexts
 * may not always produce compile-time errors. For example:
 * ```ts
 * const computedTag = tag<number, "computed">();
 * const mutableSig = signal(0, { use: [computedTag] }); // ⚠️ No error, but logically wrong
 * ```
 *
 * **Runtime behavior:** If a mutable signal is added to a computed-only tag, the runtime
 * will NOT prevent this (tags don't track kinds at runtime). However, this is a logical
 * error - the tag's semantic contract is violated.
 *
 * **Best practice:** Use general tags `tag<T>()` when you need to accept both kinds,
 * and only use specific kinds `tag<T, "mutable">` or `tag<T, "computed">` when you have
 * a strong semantic reason to restrict the tag's usage.
 *
 * @example
 * ```ts
 * // ✅ Recommended: Use general tags by default
 * const allCounters = tag<number>();  // Accepts both mutable & computed signals
 *
 * // ✅ OK: Specific kind when semantically meaningful
 * const mutableStores = tag<AppState, "mutable">();  // Only writable state
 * const derivedViews = tag<string, "computed">();    // Only computed values
 *
 * // ⚠️ Caution: Cross-kind usage may not error at compile-time
 * const computed = tag<number, "computed">();
 * signal(0, { use: [computed] });  // Mutable signal with computed tag - no TS error!
 * ```
 */
export type UseList<TValue, TKind extends SignalKind> = ReadonlyArray<
  // Use tuple trick to prevent distributive conditional types
  // Checks if TKind is exactly "mutable" or "computed" (not a union)
  [TKind] extends ["mutable"]
    ?
        | Plugin<TValue, "mutable">
        | Plugin<TValue, SignalKind>
        | Tag<TValue, "mutable">
        | Tag<TValue, SignalKind>
    : [TKind] extends ["computed"]
    ?
        | Plugin<TValue, "computed">
        | Plugin<TValue, SignalKind>
        | Tag<TValue, "computed">
        | Tag<TValue, SignalKind>
    : // TKind is SignalKind (union of both) - accept general plugins/tags only
      Plugin<TValue, SignalKind> | Tag<TValue, SignalKind>
>;

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
  equals?: PredefinedEquals | EqualsFn<T>;
  /** Debug name for the signal */
  name?: string;
  /** Fallback function to recover from errors */
  fallback?: (error: unknown) => T;

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

  /**
   * Tags to add this signal to.
   *
   * Signals are automatically added to specified tags during creation.
   * When a signal is disposed, it is automatically removed from all tags.
   *
   * **Note:** The `tags` property is defined separately in each signal function signature
   * with the appropriate kind constraint (mutable or computed).
   *
   * @example
   * ```ts
   * const formFields = tag<string>();
   * const name = signal('', { tags: [formFields] });
   * ```
   */
  // Note: tags property is defined in signal function signatures, not here
  // This is to ensure proper type constraints for mutable vs computed signals
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
