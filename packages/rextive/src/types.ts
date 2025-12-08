export const SIGNAL_TYPE = Symbol("SIGNAL_TYPE");
export const TAG_TYPE = Symbol("TAG_TYPE");

export type Nullable<T> = T | undefined;

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
export type Operator<TSource, TResult> = (source: TSource) => TResult;

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
  TOperators extends readonly Operator<any, any>[],
  TResult
> = TOperators extends [
  infer First extends Operator<any, any>,
  ...infer Rest extends Operator<any, any>[]
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
export type Pipe<TKind extends SignalKind, TValue> = {
  <T1>(
    op1: Operator<SignalOf<TValue, TKind, TValue>, T1>
  ): TryInjectDispose<T1>;

  // 2 operators
  <T1, T2>(
    op1: Operator<SignalOf<TValue, TKind, TValue>, T1>,
    op2: Operator<T1, T2>
  ): TryInjectDispose<T2>;

  // 3 operators
  <T1, T2, T3>(
    op1: Operator<SignalOf<TValue, TKind, TValue>, T1>,
    op2: Operator<T1, T2>,
    op3: Operator<T2, T3>
  ): TryInjectDispose<T3>;

  // 4 operators
  <T1, T2, T3, T4>(
    op1: Operator<SignalOf<TValue, TKind, TValue>, T1>,
    op2: Operator<T1, T2>,
    op3: Operator<T2, T3>,
    op4: Operator<T3, T4>
  ): TryInjectDispose<T4>;

  // 5 operators
  <T1, T2, T3, T4, T5>(
    op1: Operator<SignalOf<TValue, TKind, TValue>, T1>,
    op2: Operator<T1, T2>,
    op3: Operator<T2, T3>,
    op4: Operator<T3, T4>,
    op5: Operator<T4, T5>
  ): TryInjectDispose<T5>;

  // 6 operators
  <T1, T2, T3, T4, T5, T6>(
    op1: Operator<SignalOf<TValue, TKind, TValue>, T1>,
    op2: Operator<T1, T2>,
    op3: Operator<T2, T3>,
    op4: Operator<T3, T4>,
    op5: Operator<T4, T5>,
    op6: Operator<T5, T6>
  ): TryInjectDispose<T6>;

  // 7 operators
  <T1, T2, T3, T4, T5, T6, T7>(
    op1: Operator<SignalOf<TValue, TKind, TValue>, T1>,
    op2: Operator<T1, T2>,
    op3: Operator<T2, T3>,
    op4: Operator<T3, T4>,
    op5: Operator<T4, T5>,
    op6: Operator<T5, T6>,
    op7: Operator<T6, T7>
  ): TryInjectDispose<T7>;

  // 8 operators
  <T1, T2, T3, T4, T5, T6, T7, T8>(
    op1: Operator<SignalOf<TValue, TKind, TValue>, T1>,
    op2: Operator<T1, T2>,
    op3: Operator<T2, T3>,
    op4: Operator<T3, T4>,
    op5: Operator<T4, T5>,
    op6: Operator<T5, T6>,
    op7: Operator<T6, T7>,
    op8: Operator<T7, T8>
  ): TryInjectDispose<T8>;

  // 9 operators
  <T1, T2, T3, T4, T5, T6, T7, T8, T9>(
    op1: Operator<SignalOf<TValue, TKind, TValue>, T1>,
    op2: Operator<T1, T2>,
    op3: Operator<T2, T3>,
    op4: Operator<T3, T4>,
    op5: Operator<T4, T5>,
    op6: Operator<T5, T6>,
    op7: Operator<T6, T7>,
    op8: Operator<T7, T8>,
    op9: Operator<T8, T9>
  ): TryInjectDispose<T9>;

  // 10 operators
  <T1, T2, T3, T4, T5, T6, T7, T8, T9, T10>(
    op1: Operator<SignalOf<TValue, TKind, TValue>, T1>,
    op2: Operator<T1, T2>,
    op3: Operator<T2, T3>,
    op4: Operator<T3, T4>,
    op5: Operator<T4, T5>,
    op6: Operator<T5, T6>,
    op7: Operator<T6, T7>,
    op8: Operator<T7, T8>,
    op9: Operator<T8, T9>,
    op10: Operator<T9, T10>
  ): TryInjectDispose<T10>;
};

/**
 * Chain value transformations (selector pipeline)
 *
 * Unlike `pipe()` which works with signal operators, `to()` chains value selectors.
 * Each selector receives the result value of the previous selector and the SignalContext.
 *
 * Supports 1-10 selectors with full type inference.
 *
 * @example Single selector
 * ```ts
 * const user = signal({ name: "Alice", age: 30 });
 * const name = user.to(u => u.name); // "Alice"
 * ```
 *
 * @example Multiple selectors (chained)
 * ```ts
 * const greeting = user.to(
 *   u => u.name,              // "Alice"
 *   name => name.toUpperCase(), // "ALICE"
 *   name => `Hello, ${name}!`   // "Hello, ALICE!"
 * );
 * // greeting() === "Hello, ALICE!"
 * ```
 *
 * @example Using context in any selector
 * ```ts
 * const result = source.to(
 *   (val, ctx) => transform1(val),
 *   (val, ctx) => ctx.abortSignal ? val : fallback, // Access context
 *   (val, ctx) => transform3(val)
 * );
 * ```
 */
export type To<TValue> = {
  /**
   * Chain value transformations (selector pipeline)
   *
   * Unlike `pipe()` which works with signal operators, `to()` chains value selectors.
   * Each selector receives the result value of the previous selector and the SignalContext.
   *
   * Supports 1-10 selectors with full type inference.
   *
   * @example Single selector
   * ```ts
   * const user = signal({ name: "Alice", age: 30 });
   * const name = user.to(u => u.name); // "Alice"
   * ```
   *
   * @example Multiple selectors (chained)
   * ```ts
   * const greeting = user.to(
   *   u => u.name,              // "Alice"
   *   name => name.toUpperCase(), // "ALICE"
   *   name => `Hello, ${name}!`   // "Hello, ALICE!"
   * );
   * // greeting() === "Hello, ALICE!"
   * ```
   *
   * @example Using context in any selector
   * ```ts
   * const result = source.to(
   *   (val, ctx) => transform1(val),
   *   (val, ctx) => ctx.abortSignal ? val : fallback, // Access context
   *   (val, ctx) => transform3(val)
   * );
   * ```
   */
  <A>(s1: Selector<TValue, A>, options?: ToOptions<A>): Computed<A>;
  <A, B>(
    s1: Selector<TValue, A>,
    s2: Selector<A, B>,
    options?: ToOptions<B>
  ): Computed<B>;
  <A, B, C>(
    s1: Selector<TValue, A>,
    s2: Selector<A, B>,
    s3: Selector<B, C>,
    options?: ToOptions<C>
  ): Computed<C>;
  <A, B, C, D>(
    s1: Selector<TValue, A>,
    s2: Selector<A, B>,
    s3: Selector<B, C>,
    s4: Selector<C, D>,
    options?: ToOptions<D>
  ): Computed<D>;
  <A, B, C, D, E>(
    s1: Selector<TValue, A>,
    s2: Selector<A, B>,
    s3: Selector<B, C>,
    s4: Selector<C, D>,
    s5: Selector<D, E>,
    options?: ToOptions<E>
  ): Computed<E>;
  <A, B, C, D, E, F>(
    s1: Selector<TValue, A>,
    s2: Selector<A, B>,
    s3: Selector<B, C>,
    s4: Selector<C, D>,
    s5: Selector<D, E>,
    s6: Selector<E, F>,
    options?: ToOptions<F>
  ): Computed<F>;
  <A, B, C, D, E, F, G>(
    s1: Selector<TValue, A>,
    s2: Selector<A, B>,
    s3: Selector<B, C>,
    s4: Selector<C, D>,
    s5: Selector<D, E>,
    s6: Selector<E, F>,
    s7: Selector<F, G>,
    options?: ToOptions<G>
  ): Computed<G>;
  <A, B, C, D, E, F, G, H>(
    s1: Selector<TValue, A>,
    s2: Selector<A, B>,
    s3: Selector<B, C>,
    s4: Selector<C, D>,
    s5: Selector<D, E>,
    s6: Selector<E, F>,
    s7: Selector<F, G>,
    s8: Selector<G, H>,
    options?: ToOptions<H>
  ): Computed<H>;
  <A, B, C, D, E, F, G, H, I>(
    s1: Selector<TValue, A>,
    s2: Selector<A, B>,
    s3: Selector<B, C>,
    s4: Selector<C, D>,
    s5: Selector<D, E>,
    s6: Selector<E, F>,
    s7: Selector<F, G>,
    s8: Selector<G, H>,
    s9: Selector<H, I>,
    options?: ToOptions<I>
  ): Computed<I>;
  <A, B, C, D, E, F, G, H, I, J>(
    s1: Selector<TValue, A>,
    s2: Selector<A, B>,
    s3: Selector<B, C>,
    s4: Selector<C, D>,
    s5: Selector<D, E>,
    s6: Selector<E, F>,
    s7: Selector<F, G>,
    s8: Selector<G, H>,
    s9: Selector<H, I>,
    s10: Selector<I, J>,
    options?: ToOptions<J>
  ): Computed<J>;
};

/**
 * Base signal interface - common functionality for all signal types
 */
export type Signal<TValue, TInit = TValue> = Observable &
  Disposable &
  Accessor<TValue | TInit> & {
    /**
     * Unique identifier for this signal instance.
     * Auto-generated and immutable - guaranteed unique across all signals.
     * Useful for tracking, debugging, and as React keys.
     *
     * @example
     * ```ts
     * const count = signal(0);
     * console.log(count.uid); // "sig-1"
     *
     * const doubled = signal({ count }, ({ deps }) => deps.count * 2);
     * console.log(doubled.uid); // "sig-2"
     *
     * // Use as React key
     * signals.map(s => <div key={s.uid}>{s.displayName}</div>)
     * ```
     */
    readonly uid: string;

    /**
     * Display name for this signal (for debugging/devtools).
     * Can be auto-generated or user-provided via options.
     */
    readonly displayName: string;

    get(): TValue | TInit;

    /**
     * Read the current signal value WITHOUT triggering reactive tracking.
     *
     * Unlike `get()` which registers the access for reactive updates,
     * `peek()` returns the value silently without subscribing to changes.
     *
     * Use `peek()` when you need to read a value but don't want to create
     * a reactive dependency - for example, in event handlers, logging,
     * or when accessing values inside a computed signal that shouldn't
     * trigger recomputation when that value changes.
     *
     * @returns The current value (same as get())
     *
     * @example
     * ```ts
     * const count = signal(0);
     * const user = signal({ name: "Alice" });
     *
     * // In a tracking context, peek() won't create dependencies
     * trackingContext(() => {
     *   // This WILL create a dependency (triggers re-run when count changes)
     *   console.log("Count:", count());
     *
     *   // This WON'T create a dependency (no re-run when user changes)
     *   console.log("User (peeked):", user.peek());
     * });
     *
     * // Useful in event handlers to avoid unexpected re-renders
     * const handleClick = () => {
     *   const currentCount = count.peek(); // Read without tracking
     *   console.log("Current count:", currentCount);
     * };
     *
     * // In computed signals - access without creating dependency
     * const derived = signal({ count }, ({ deps }) => {
     *   const c = deps.count; // Tracked dependency
     *   const u = user.peek(); // NOT tracked - won't recompute when user changes
     *   return `${u.name} clicked ${c} times`;
     * });
     * ```
     */
    peek(): TValue | TInit;

    /**
     * Check if the signal has been disposed.
     *
     * @returns true if the signal has been disposed, false otherwise
     *
     * @example
     * ```ts
     * const count = signal(0);
     * console.log(count.disposed()); // false
     *
     * count.dispose();
     * console.log(count.disposed()); // true
     * ```
     */
    disposed(): boolean;

    /**
     * Get the current error state of the signal.
     *
     * Returns undefined if the signal is not in an error state.
     * Use this to check for errors without triggering a throw when reading the value.
     *
     * @returns The error if signal is in error state, undefined otherwise
     *
     * @example
     * ```ts
     * const data = signal({ userId }, async ({ deps }) => {
     *   const res = await fetch(`/user/${deps.userId}`);
     *   if (!res.ok) throw new Error("Not found");
     *   return res.json();
     * });
     *
     * // Check error state without throwing
     * if (data.error()) {
     *   console.error("Signal has error:", data.error());
     * } else {
     *   console.log("Value:", data());
     * }
     *
     * // Or use in reactive context
     * data.on(() => {
     *   const err = data.error();
     *   if (err) {
     *     showErrorToast(err);
     *   }
     * });
     * ```
     */
    error(): unknown | undefined;

    /**
     * Safely get the signal value without throwing.
     *
     * Returns the value if successful, or undefined if the signal is in an error state.
     * This is useful when you want to access the value without try-catch and handle
     * errors separately via `error()`.
     *
     * @returns The value if no error, undefined otherwise
     *
     * @example
     * ```ts
     * const data = signal({ userId }, async ({ deps }) => {
     *   const res = await fetch(`/user/${deps.userId}`);
     *   if (!res.ok) throw new Error("Not found");
     *   return res.json();
     * });
     *
     * // Safe access - never throws
     * const value = data.tryGet();
     * if (value !== undefined) {
     *   console.log("Got value:", value);
     * } else if (data.error()) {
     *   console.error("Error:", data.error());
     * }
     *
     * // In React render
     * function Component() {
     *   return rx(() => {
     *     const user = data.tryGet();
     *     const err = data.error();
     *
     *     if (err) return <Error error={err} />;
     *     if (!user) return <Loading />;
     *     return <div>{user.name}</div>;
     *   });
     * }
     * ```
     */
    tryGet(): TValue | TInit | undefined;

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

    to: To<TValue>;

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

export type Selector<TValue, TReturn> = (
  value: TValue,
  context: SignalContext
) => TReturn;

/**
 * Options for `.to()` method - equality strategy or full signal options
 */
export type ToOptions<T> = PredefinedEquals | SignalOptions<T>;

// ============================================================================
// PATH TYPES - Type-safe nested property access (similar to React Hook Form)
// ============================================================================

/**
 * Primitive types that terminate path traversal
 */
type Primitive = string | number | boolean | bigint | symbol | null | undefined;

/**
 * Check if a type is any (used to prevent infinite recursion)
 */
type IsAny<T> = 0 extends 1 & T ? true : false;

/**
 * Array key type for indexed access
 */
type ArrayKey = number;

/**
 * Tuple keys (numeric string literals for tuple indices)
 */
type TupleKeys<T extends readonly any[]> = Exclude<keyof T, keyof any[]>;

/**
 * Check if array is a tuple (has known length)
 */
type IsTuple<T extends readonly any[]> = number extends T["length"]
  ? false
  : true;

/**
 * Get all valid dot-notation paths for an object type.
 * Supports nested objects, arrays with numeric indices, and tuples.
 *
 * @example
 * ```ts
 * type User = { name: string; address: { city: string } };
 * type UserPaths = Path<User>;
 * // "name" | "address" | "address.city"
 *
 * type List = { items: { id: number }[] };
 * type ListPaths = Path<List>;
 * // "items" | `items.${number}` | `items.${number}.id`
 * ```
 */
export type Path<T> = T extends readonly any[]
  ? IsTuple<T> extends true
    ? TupleKeys<T> | PathImplArray<T, TupleKeys<T> & string>
    : `${ArrayKey}` | PathImplArray<T, `${ArrayKey}`>
  : PathImplObject<T>;

type PathImplObject<T> = {
  [K in keyof T & string]: IsAny<T[K]> extends true
    ? K
    : NonNullable<T[K]> extends Primitive
    ? K
    : NonNullable<T[K]> extends readonly any[]
    ? K | `${K}.${Path<NonNullable<T[K]>>}`
    : NonNullable<T[K]> extends object
    ? K | `${K}.${Path<NonNullable<T[K]>>}`
    : K;
}[keyof T & string];

type PathImplArray<
  T extends readonly any[],
  K extends string
> = T extends readonly (infer V)[]
  ? IsAny<V> extends true
    ? K
    : NonNullable<V> extends Primitive
    ? K
    : NonNullable<V> extends readonly any[]
    ? K | `${K}.${Path<NonNullable<V>>}`
    : NonNullable<V> extends object
    ? K | `${K}.${Path<NonNullable<V>>}`
    : K
  : K;

/**
 * Get the value type at a given path.
 * Handles nested objects, array indices, tuples, and optional/nullable properties.
 *
 * @example
 * ```ts
 * type User = { name: string; address: { city: string } };
 * type Name = PathValue<User, "name">; // string
 * type City = PathValue<User, "address.city">; // string
 *
 * type List = { items: { id: number }[] };
 * type ItemId = PathValue<List, "items.0.id">; // number
 *
 * type Optional = { user?: { name: string } };
 * type OptName = PathValue<Optional, "user.name">; // string | undefined
 * ```
 */
export type PathValue<
  T,
  P extends Path<T>
> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? NonNullable<T[K]> extends never
      ? Extract<T[K], null | undefined>
      : Rest extends Path<NonNullable<T[K]>>
      ? PathValue<NonNullable<T[K]>, Rest> | Extract<T[K], null | undefined>
      : never
    : K extends `${ArrayKey}`
    ? T extends readonly (infer V)[]
      ? NonNullable<V> extends never
        ? Extract<V, null | undefined>
        : Rest extends Path<NonNullable<V>>
        ? PathValue<NonNullable<V>, Rest> | Extract<V, null | undefined>
        : never
      : never
    : never
  : P extends keyof T
  ? T[P]
  : P extends `${ArrayKey}`
  ? T extends readonly (infer V)[]
    ? V
    : never
  : never;

/**
 * Type-safe setter function signature for nested paths.
 *
 * @example
 * ```ts
 * interface FormState {
 *   user: { name: string; age: number };
 *   tags: string[];
 * }
 *
 * const form = signal<FormState>({ user: { name: "", age: 0 }, tags: [] });
 *
 * // With PathSetter type:
 * type SetFn = PathSetter<FormState>;
 * // Equivalent to:
 * // <P extends Path<FormState>>(path: P, value: PathValue<FormState, P>) => void
 *
 * form.setPath("user.name", "Alice"); // ✅ value must be string
 * form.setPath("user.age", 30);       // ✅ value must be number
 * form.setPath("tags", ["a", "b"]);   // ✅ value must be string[]
 * ```
 */
export type PathSetter<T extends object> = <P extends Path<T>>(
  path: P,
  value: PathValue<T, P> | ((prev: PathValue<T, P>) => PathValue<T, P>)
) => void;

/**
 * Type-safe getter function signature for nested paths.
 */
export type PathGetter<T extends object> = <P extends Path<T>>(
  path: P
) => PathValue<T, P>;

export type TryInjectDispose<T> = T extends object
  ? T & { dispose: VoidFunction }
  : T;

export type SignalWhenAction = "refresh" | "reset" | "stale";

export type When<TValue, TInit, TKind extends SignalKind> = {
  /**
   * React to changes in notifier signal(s) by executing an action.
   *
   * Does NOT create a new signal - just registers subscription on this signal.
   * Auto-cleans up when this signal is disposed.
   *
   * If filter throws, error is routed through signal's error handling (onError callbacks, devtools).
   * Action is NOT executed when filter throws.
   *
   * **Available actions:**
   * - `"refresh"` - Force immediate recomputation (works on all signals)
   * - `"reset"` - Reset to initial value (mutable signals only)
   * - `"stale"` - Mark for lazy recomputation (computed signals only)
   *
   * @param notifier - Single signal or array of signals to watch
   * @param action - Action to execute: "refresh", "reset", or "stale"
   * @param filter - Optional filter function. Receives `(notifier, self)`.
   *                 Both are signals - call them to get values if needed.
   *                 Return true to execute action, false to skip.
   * @returns this - for chaining
   *
   * @example Basic reset on trigger
   * ```ts
   * const logout = signal(0);
   * const userData = signal<User | null>(null).when(logout, "reset");
   *
   * userData.set(someUser);
   * logout.set(n => n + 1); // userData resets to null
   * ```
   *
   * @example With filter (notifier, self)
   * ```ts
   * const refreshTrigger = signal(0);
   * const data = signal(fetchData).when(
   *   refreshTrigger,
   *   "refresh",
   *   (notifier, self) => notifier() > 5 // Only refresh if trigger value > 5
   * );
   * ```
   *
   * @example Multiple notifiers
   * ```ts
   * const trigger1 = signal(0);
   * const trigger2 = signal(0);
   * const data = signal(fetchData).when([trigger1, trigger2], "refresh");
   * ```
   */
  <N extends AnySignal<any>>(
    notifier: N | readonly N[],
    action: SignalWhenAction,
    filter?: (
      notifier: NonNullSignal<N>,
      self: SignalOf<TValue, TKind, TInit>
    ) => boolean
  ): SignalOf<TValue, TKind, TInit>;

  /**
   * React to changes in notifier signal(s) by executing a custom callback.
   *
   * Does NOT create a new signal - just registers subscription on this signal.
   * Auto-cleans up when this signal is disposed.
   *
   * If callback throws, the error is routed through signal's error handling (onError callbacks, devtools).
   *
   * **Callback signature:** `(self, notifier) => void`
   * - `self` - This signal instance (use `self.set()`, `self.refresh()`, etc.)
   * - `notifier` - The notifier signal that triggered (call `notifier()` to get value)
   *
   * @param notifier - Signal or array of signals to watch
   * @param action - Callback function that receives `(self, notifier)` and performs side effects.
   *                 Both are signals - call them to get values if needed.
   *                 Use `self.set()`, `self.refresh()`, `self.stale()` as needed.
   * @returns this - for chaining
   *
   * @example Accumulator pattern
   * ```ts
   * const addAmount = signal(0);
   * const total = signal(0).when(addAmount, (notifier, self) => {
   *   self.set(prev => prev + notifier()); // Add notifier's value to current
   * });
   *
   * addAmount.set(5);  // total = 5
   * addAmount.set(10); // total = 15
   * ```
   *
   * @example State machine
   * ```ts
   * const events = signal<Event | null>(null);
   * const state = signal<"idle" | "loading" | "done">("idle").when(events, (notifier, self) => {
   *   const event = notifier();
   *   if (event?.type === "START") self.set("loading");
   *   else if (event?.type === "COMPLETE") self.set("done");
   * });
   * ```
   *
   * @example Conditional refresh
   * ```ts
   * const networkStatus = signal<'online' | 'offline'>('online');
   * const data = signal(async () => fetchData()).when(networkStatus, (notifier, self) => {
   *   if (notifier() === 'online') {
   *     self.refresh(); // Only refresh when coming back online
   *   }
   * });
   * ```
   *
   * @example Side effects without state change
   * ```ts
   * const formSubmit = signal<FormData | null>(null);
   * const status = signal("idle").when(formSubmit, (notifier, self) => {
   *   const data = notifier();
   *   if (data) {
   *     analytics.track("form_submit", data);
   *     self.set("submitted");
   *   }
   * });
   * ```
   */
  <N extends AnySignal<any>>(
    notifier: N | readonly N[],
    action: (
      notifier: NonNullSignal<N>,
      self: SignalOf<TValue, TKind, TInit>
    ) => void
  ): SignalOf<TValue, TKind, TInit>;
};

export type NonNullSignal<S> = S extends Computed<infer T>
  ? Computed<T, any>
  : S extends Mutable<infer T, any>
  ? Mutable<T>
  : S;

export type Mutable<TValue, TInit = TValue> = Signal<TValue, TInit> & {
  /**
   * Update signal value via reducer function (returns new value)
   * @param reducer - Function that receives current value (TValue | TInit) and returns new value (TValue)
   */
  set(reducer: (prev: NoInfer<TValue | TInit>) => TValue): void;

  /**
   * Set signal value directly
   * @param value - New value (type: TValue, not TInit)
   */
  set(value: TValue): void;

  when: When<TValue, TInit, "mutable">;

  /**
   * Tuple for destructuring: `[signal, set]`.
   *
   * Returns the same signal instance and a simple setter function.
   * Useful for separating read (signal) from write (setter) in logic patterns.
   *
   * The setter is a simple `(value: TValue) => void` - no reducer overload.
   * For reducer pattern, use `signal.set(prev => ...)` directly.
   *
   * @example Basic usage
   * ```ts
   * const [count, setCount] = signal(0).tuple;
   *
   * setCount(5);      // Set value
   * count();          // Read value
   * count.on(...);    // Full signal capabilities
   * ```
   *
   * @example Logic pattern - expose readonly signal, keep setter private
   * ```ts
   * const authLogic = logic("authLogic", () => {
   *   const [loginRequest, login] = signal<Credentials | null>(null).tuple;
   *
   *   return {
   *     loginRequest,  // Signal - consumers can read & subscribe
   *     login,         // Trigger - semantic name for setting
   *   };
   * });
   *
   * // Consumer API:
   * authLogic().login({ username: "admin", password: "123" });
   * authLogic().loginRequest();  // Read current value
   * ```
   *
   * @example Action dispatch with .when()
   * ```ts
   * type TodoAction = { type: "add"; text: string } | { type: "edit"; id: number };
   *
   * const [todoAction, dispatch] = signal<TodoAction>().tuple;
   *
   * // React to actions
   * todoList.when(todoAction, (action) => {
   *   const a = action();
   *   if (a?.type === "add") addTodo(a.text);
   *   if (a?.type === "edit") editTodo(a.id);
   * });
   *
   * // Dispatch actions
   * dispatch({ type: "add", text: "Buy milk" });
   * dispatch({ type: "edit", id: 1 });
   * ```
   */
  readonly tuple: readonly [
    signal: Mutable<TValue, TInit>,
    set: (value: TValue) => void
  ];

  pipe: Pipe<"mutable", TValue>;
};

/**
 *
 * Computed signal - read-only, derived from dependencies
 * Created when signal() is called with dependencies
 */
export type Computed<TValue, TInit = TValue> = Signal<TValue, TInit> & {
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

  when: When<TValue, TInit, "computed">;

  pipe: Pipe<"computed", TValue>;
};

/**
 * Union type representing any signal (mutable or computed).
 *
 * Useful for generic functions that accept any signal type while still having
 * access to common methods like `on()`, `refresh()`, etc.
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
 *   s.on(() => console.log('Changed:', s()));
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
  | Mutable<TValue, TInit>
  | Computed<TValue, TInit>;

/**
 * Map of signal names to signal instances
 * Accepts both MutableSignal and ComputedSignal
 */
export type SignalMap = Record<string, AnySignal<any>>;

/**
 * Signal kind discriminator
 *
 * Tags can accept union kinds (e.g., "mutable" | "computed") to work with both types
 */
export type SignalKind = "mutable" | "computed" | "any";

/**
 * Helper type to get the signal type based on kind
 */
export type SignalOf<
  TValue,
  K extends SignalKind,
  TInit = TValue
> = K extends "any"
  ? AnySignal<TValue, TInit>
  : K extends "mutable"
  ? Mutable<TValue, TInit>
  : K extends "computed"
  ? Computed<TValue, TInit>
  : Signal<TValue, TInit>;

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
export type Plugin<TValue, TKind extends SignalKind = "any"> = (
  signal: SignalOf<TValue, TKind>
) => VoidFunction | void;

/**
 * A plugin that operates on a group of signals together.
 *
 * Unlike individual plugins which receive a single signal, group plugins receive
 * all signals at once, enabling coordinated behavior across related signals.
 *
 * @template TSignals - Record of signal names to signal instances
 * @returns Optional cleanup function called when `signal.use` result is invoked
 *
 * @example
 * ```ts
 * // Logger that tracks all signals in a group
 * const groupLogger: GroupPlugin<{ count: Signal<number>; name: Signal<string> }> =
 *   (signals) => {
 *     const unsubs = Object.entries(signals).map(([key, sig]) =>
 *       sig.on(() => console.log(`[${key}]`, sig()))
 *     );
 *     return () => unsubs.forEach(fn => fn());
 *   };
 *
 * // Coordinated persistence
 * const formPersister: GroupPlugin<typeof formSignals> = (signals) => {
 *   const save = () => {
 *     const data = Object.fromEntries(
 *       Object.entries(signals).map(([k, s]) => [k, s()])
 *     );
 *     localStorage.setItem('form', JSON.stringify(data));
 *   };
 *   const unsubs = Object.values(signals).map(s => s.on(save));
 *   return () => unsubs.forEach(fn => fn());
 * };
 * ```
 */
export type GroupPlugin<
  TSignals extends Record<string, AnySignal<any>> = Record<
    string,
    AnySignal<any>
  >
> = (signals: TSignals) => VoidFunction | void;

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
export type Tag<TValue, TKind extends SignalKind = any> = {
  [TAG_TYPE]: true;

  /**
   * Debug name for the tag.
   * Auto-generated if not provided (e.g., "tag-1", "tag-2").
   * Useful for devtools and debugging.
   */
  readonly displayName: string;

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
   * Map over all signals in this tag and collect results.
   *
   * @param mapper - Function to call for each signal
   * @returns Array of results from each signal (in iteration order)
   *
   * @example
   * ```ts
   * const formTag = signal.tag<string>();
   * // ... add signals to tag
   *
   * // Get all current values
   * const values = formTag.map(s => s.get()); // string[]
   *
   * // Reset all signals
   * formTag.map(s => s.reset());
   *
   * // Get signal names
   * const names = formTag.map(s => s.displayName);
   * ```
   */
  map<TResult>(mapper: (signal: SignalOf<TValue, TKind>) => TResult): TResult[];

  /**
   * Force immediate recomputation of all signals in this tag.
   *
   * For computed signals: triggers recomputation immediately.
   * For mutable signals: triggers subscribers (value unchanged).
   *
   * @example
   * ```ts
   * const dataTag = tag<Data>();
   * // ... add signals
   *
   * // Force all data signals to refetch
   * dataTag.refreshAll();
   * ```
   */
  refreshAll(): void;

  /**
   * Reset all mutable signals in this tag to their initial values.
   *
   * Only affects mutable signals (signals created with initial value).
   * Computed signals are skipped (they don't have reset()).
   *
   * @example
   * ```ts
   * const formTag = tag<string>();
   * // ... add form field signals
   *
   * // Reset all form fields
   * formTag.resetAll();
   * ```
   */
  resetAll(): void;

  /**
   * Mark all computed signals in this tag as stale for lazy recomputation.
   *
   * Only affects computed signals (they recompute on next access).
   * Mutable signals are skipped (they don't have stale()).
   *
   * @example
   * ```ts
   * const cacheTag = tag<CachedData>();
   * // ... add computed signals
   *
   * // Invalidate all cached data
   * cacheTag.staleAll();
   * ```
   */
  staleAll(): void;

  /**
   * Dispose all signals in this tag.
   *
   * After disposal, signals cannot be used anymore.
   * Disposed signals are automatically removed from this tag.
   *
   * **Warning:** This is destructive! Only use when you're done with all signals.
   *
   * @example
   * ```ts
   * const tempTag = tag<number>();
   * // ... add temporary signals
   *
   * // Cleanup all temporary signals
   * tempTag.disposeAll();
   * ```
   */
  disposeAll(): void;

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
   * The nth recomputation (0-indexed).
   * - First computation: 0
   * - After each recomputation: 1, 2, 3, ...
   * - After reset: resets to 0
   */
  nth: number;

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
 * Alias for PredefinedEquals - used in equals options throughout the library.
 * Prefer using this type when accepting equality strategy from users.
 */
export type EqualsStrategy = PredefinedEquals;

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
    ? Plugin<TValue, "mutable" | "any"> | Tag<TValue, "mutable" | "any">
    : [TKind] extends ["computed"]
    ? Plugin<TValue, "computed" | "any"> | Tag<TValue, "computed" | "any">
    : // TKind is SignalKind (union of both) - accept general plugins/tags only
      | Plugin<TValue, "any" | "mutable" | "computed">
        | Tag<TValue, "any" | "mutable" | "computed">
>;

export type SignalNameOptions = {
  /** Debug name for the signal */
  name?: string;
};

export type EqualsOrOptions<T> = PredefinedEquals | SignalOptions<T>;

/**
 * Options for signal creation
 */
export type SignalOptions<T> = SignalNameOptions & {
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

export type ResolveValueType = "awaited" | "task" | "value";

export type ResolveAwaitable<T> = T extends Signal<infer TValue>
  ? ResolveAwaitable<TValue>
  : T extends Task<any>
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
      : TType extends "task"
      ? Task<Awaited<T>>
      : TType extends "value"
      ? T
      : never
    : never;
};

export const LOGIC_TYPE = Symbol("LOGIC_TYPE");

/**
 * An instance returned by logic, automatically wrapped with dispose() method.
 */
export type Instance<T> = T & { dispose(): void };

/**
 * Utility type for creating mock instances in tests.
 *
 * Extracts the instance type from a Logic, preserving Signal types
 * so you can create mock instances with real signals for testing.
 *
 * @example
 * ```ts
 * const setupCartLogic = (overrides: Partial<TestInstance<typeof cartLogic>> = {}) => {
 *   const instance: TestInstance<typeof cartLogic> = {
 *     items: signal([]),
 *     itemCount: signal(0),
 *     addItem: vi.fn(),
 *     removeItem: vi.fn(),
 *     ...overrides,
 *   };
 *   logic.provide(cartLogic, () => instance);
 *   return instance;
 * };
 *
 * it('test', () => {
 *   const cart = setupCartLogic({ itemCount: signal(5) });
 *   // Manipulate state during test
 *   cart.items.set([mockItem]);
 * });
 * ```
 */
export type TestInstance<TLogic extends Logic<any>> = TLogic extends Logic<
  infer T
>
  ? {
      [key in keyof T]: T[key] extends Signal<infer TValue, infer TInit>
        ? Signal<TValue, TInit>
        : T[key];
    }
  : never;

/**
 * Infer the instance type from a logic.
 */
export type InferInstance<TLogic extends Logic<any>> = ReturnType<TLogic> & {
  dispose(): void;
};

/**
 * A logic unit - a factory for creating bundles of signals and methods.
 *
 * Supports:
 * - Singleton pattern: `myLogic()` returns cached instance
 * - Instance creation: `myLogic.create()` creates new instance
 * - Dependency injection: `myLogic.with(dep, mock)` overrides dependencies
 * - Test isolation: `myLogic.reset()` clears singleton and mocks
 *
 * @example
 * ```ts
 * const settings = logic(() => ({
 *   theme: 'dark',
 *   fontSize: 14,
 * }));
 *
 * const counter = logic(() => {
 *   const { fontSize } = settings(); // Dependency - auto-resolved
 *   const count = signal(0);
 *   return {
 *     count,
 *     increment: () => count.set(x => x + 1),
 *   };
 * });
 *
 * // Usage
 * const { count, increment } = counter(); // Singleton
 * const instance = counter.create();       // New instance
 *
 * // Testing
 * counter.with(settings, () => ({ theme: 'light', fontSize: 16 }));
 * counter.reset(); // Clear for next test
 * ```
 */
export interface Logic<T extends object> {
  /** Type brand for detection (e.g., in useScope) */
  [LOGIC_TYPE]: true;

  /**
   * Get or create the singleton instance.
   * Singleton persists for the app lifetime.
   * If a global override is set via logic.with(), returns the override instead.
   */
  (): Instance<T>;

  /** Debug name for devtools and error messages */
  readonly displayName: string;

  /**
   * Create a new instance (not singleton).
   * Each call returns a fresh instance with its own state.
   * The instance is auto-wrapped with disposable().
   *
   * Use this in tests for isolation:
   * @example
   * ```ts
   * it('should increment', () => {
   *   const instance = counter.create();
   *   instance.increment();
   *   expect(instance.count()).toBe(1);
   *   instance.dispose(); // Clean up
   * });
   * ```
   */
  create(): Instance<T>;
}

/**
 * Extract the type of the logic from the Logic interface.
 * @example
 * ```ts
 * type Counter = InferLogic<typeof counter>;
 * // = { count: Signal<number> }
 * ```
 */
export type InferLogic<TLogic extends Logic<any>> = TLogic extends Logic<
  infer T
>
  ? T
  : never;

/**
 * Extract only function properties from T and make them readonly.
 * Used by AbstractLogic to ensure only methods are exposed.
 *
 * @example
 * ```ts
 * type Input = {
 *   name: string;           // ❌ Excluded (not a function)
 *   count: number;          // ❌ Excluded (not a function)
 *   getName: () => string;  // ✅ Included
 *   setCount: (n: number) => void; // ✅ Included
 * };
 *
 * type Output = AbstractLogicInstance<Input>;
 * // = { readonly getName: () => string; readonly setCount: (n: number) => void }
 * ```
 */
export type AbstractLogicInstance<T> = {
  readonly [K in keyof T as T[K] extends (...args: any[]) => any
    ? K
    : never]: T[K];
};

/**
 * An abstract logic that must be overridden before use.
 * Unlike regular Logic, AbstractLogic:
 * - Has no `create()` method (only singleton access)
 * - Returns a readonly Proxy with only function properties
 * - Function stubs are cached and throw NotImplementedError when invoked
 * - Cannot be modified (set operations always throw)
 *
 * @example
 * ```ts
 * // Define abstract logic with just a type
 * const authProvider = logic.abstract<{
 *   getToken: () => Promise<string>;
 *   logout: () => void;
 *   config: { timeout: number }; // ❌ Non-function props excluded from output
 * }>("authProvider");
 *
 * // Can pass around without error
 * const auth = authProvider(); // ✅ OK - returns readonly proxy
 *
 * // Error when function is invoked without override
 * auth.getToken(); // ❌ NotImplementedError
 *
 * // Cannot set properties
 * (auth as any).getToken = () => {}; // ❌ TypeError: Cannot set on abstract logic
 *
 * // Consumer must provide implementation
 * logic.provide(authProvider, () => ({
 *   getToken: async () => localStorage.getItem("token") ?? "",
 *   logout: () => localStorage.removeItem("token"),
 * }));
 *
 * authProvider().getToken(); // ✅ Works now
 * ```
 */
export interface AbstractLogic<T extends object> {
  /** Type brand for detection */
  [LOGIC_TYPE]: true;

  /**
   * Get the singleton instance.
   * Returns a readonly Proxy with cached function stubs.
   * - Only function properties are exposed
   * - Function stubs throw NotImplementedError when invoked (before override)
   * - Set operations always throw TypeError
   */
  (): AbstractLogicInstance<T>;

  /** Debug name for devtools and error messages */
  readonly displayName: string;

  // Note: No create() method - abstract logics only have singleton access
}

/**
 * Internal symbol used to identify task objects at runtime.
 * This allows for reliable type checking without relying on duck typing.
 */
export const TASK_TYPE = Symbol("TASK_TYPE");

/**
 * Represents the status of an async operation.
 */
export type TaskStatus = "loading" | "success" | "error";

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
 * const loadingState: LoadingTask = {
 *   [TASK_TYPE]: true,
 *   status: "loading",
 *   promise: fetchUser(1),
 *   value: undefined,
 *   error: undefined,
 *   loading: true,
 * };
 * ```
 */
export type LoadingTask<TValue> = {
  [TASK_TYPE]: true;
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
 * const successState: SuccessTask<User> = {
 *   [TASK_TYPE]: true,
 *   status: "success",
 *   promise: Promise.resolve(user),
 *   value: { id: 1, name: "Alice" },
 *   error: undefined,
 *   loading: false,
 * };
 * ```
 */
export type SuccessTask<TValue> = {
  [TASK_TYPE]: true;
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
 * const errorState: ErrorTask = {
 *   [TASK_TYPE]: true,
 *   status: "error",
 *   promise: Promise.reject(new Error("Failed")),
 *   value: undefined,
 *   error: new Error("Failed"),
 *   loading: false,
 * };
 * ```
 */
export type ErrorTask<TValue> = {
  [TASK_TYPE]: true;
  status: "error";
  promise: PromiseLike<TValue>;
  value: undefined;
  error: unknown;
  loading: false;
};

/**
 * A discriminated union representing all possible states of an async operation.
 *
 * A Task encapsulates the three states of async data:
 * - `LoadingTask`: Operation in progress
 * - `SuccessTask<T>`: Operation completed successfully with data
 * - `ErrorTask`: Operation failed with error
 *
 * Each task maintains a reference to the underlying promise, allowing
 * integration with React Suspense and other promise-based systems.
 *
 * @template T - The type of data when operation succeeds
 *
 * @example
 * ```typescript
 * // Type-safe pattern matching
 * function renderTask<T>(task: Task<T>) {
 *   switch (task.status) {
 *     case "loading":
 *       return <Spinner />;
 *     case "success":
 *       return <div>{task.value}</div>; // TypeScript knows data exists
 *     case "error":
 *       return <Error error={task.error} />; // TypeScript knows error exists
 *   }
 * }
 * ```
 */
export type Task<T> = LoadingTask<T> | SuccessTask<T> | ErrorTask<T>;

/**
 * A lazy factory that produces and manages a single instance at a time.
 *
 * @template T - The type of value produced by the factory
 */
export type Producer<T> = Disposable & {
  /**
   * Get the current value, creating one if it doesn't exist.
   * This is lazy initialization - the factory is only called when needed.
   *
   * @returns The current value (creates new one if none exists)
   */
  current(): T;

  /**
   * Dispose the current value (if any) and create a new one.
   * Useful for resetting or cycling through instances.
   *
   * @param dispose - Whether to dispose the current value before creating new one (default: true)
   * @returns The newly created value
   *
   * @example Skip disposal to transfer ownership
   * ```ts
   * const old = producer.peek();
   * const newVal = producer.next(false); // old is NOT disposed
   * // caller is responsible for disposing old
   * ```
   */
  next(dispose?: boolean): T;

  /**
   * Check if there's a current value without triggering creation.
   *
   * @returns True if a value exists, false otherwise
   */
  has(): boolean;

  /**
   * Get the current value without creating a new one.
   *
   * @returns The current value or undefined if none exists
   */
  peek(): T | undefined;
};

// ============================================================================
// DEVTOOLS
// ============================================================================

/**
 * DevTools connector interface for external tooling integration.
 *
 * Set `globalThis.__REXTIVE_DEVTOOLS__` to enable devtools.
 * When undefined (default), no devtools overhead is incurred.
 *
 * @example
 * ```ts
 * // Enable devtools (e.g., in browser extension or dev setup)
 * globalThis.__REXTIVE_DEVTOOLS__ = {
 *   onSignalCreate: (signal) => console.log('Signal created:', signal.displayName),
 *   onSignalDispose: (signal) => console.log('Signal disposed:', signal.displayName),
 *   onSignalChange: (signal, value) => console.log('Signal changed:', signal.displayName, value),
 *   onTagCreate: (tag) => console.log('Tag created:', tag.displayName),
 * };
 * ```
 */
export type DevTools = {
  /** Called when a signal is created */
  onSignalCreate?(signal: AnySignal<any>): void;

  /** Called when a signal is disposed */
  onSignalDispose?(signal: AnySignal<any>): void;

  /** Called when a signal value changes */
  onSignalChange?(signal: AnySignal<any>, value: unknown): void;

  /** Called when a signal throws an error (computed signal, async error, etc.) */
  onSignalError?(signal: AnySignal<any>, error: unknown): void;

  /** Called when a signal's displayName is updated (e.g., by pipeSignals) */
  onSignalRename?(signal: AnySignal<any>): void;

  /** Called to completely remove signals from registry (for orphaned StrictMode scopes) */
  onForgetSignals?(signals: AnySignal<any>[]): void;

  /** Called when a tag is created */
  onTagCreate?(tag: Tag<any, any>): void;

  /** Called when a signal is added to a tag */
  onTagAdd?(tag: Tag<any, any>, signal: AnySignal<any>): void;

  /** Called when a signal is removed from a tag */
  onTagRemove?(tag: Tag<any, any>, signal: AnySignal<any>): void;
};
