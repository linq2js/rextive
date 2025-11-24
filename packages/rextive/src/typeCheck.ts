/**
 * TypeScript-only tests for all rextive APIs.
 * These are compile-time checks – they should not be imported at runtime.
 *
 * This file consolidates type checking for:
 * - signal() and its overloads
 * - loadable() and its namespace
 * - wait() and its utilities
 *
 * Run type checking with: tsc --noEmit
 */

import { signal } from "./signal";
import { loadable } from "./utils/loadable";
import { wait, type Awaitable, type AwaitedFromAwaitable } from "./wait";
import type {
  Signal,
  MutableSignal,
  ComputedSignal,
  SignalContext,
  ComputedSignalContext,
  Loadable,
  LoadingLoadable,
  SuccessLoadable,
  ErrorLoadable,
} from "./types";

// =============================================================================
// Utility to assert inferred types at compile time
// =============================================================================

function expectType<T>(_value: T): void {
  // no runtime behaviour
}

// =============================================================================
// SIGNAL API TYPE CHECKS
// =============================================================================

// -----------------------------------------------------------------------------
// Overload 1: signal() - no arguments, no initial value
// Special behavior: get() returns T | undefined, but set() requires T
// -----------------------------------------------------------------------------

const noArgSignal = signal();
expectType<MutableSignal<unknown, undefined>>(noArgSignal);
expectType<unknown | undefined>(noArgSignal());

// Example: signal with no initial value for typed data
interface TodoPayload {
  id: number;
  title: string;
}

const payload = signal<TodoPayload>();
expectType<MutableSignal<TodoPayload, undefined>>(payload);

// get() returns TodoPayload | undefined
expectType<TodoPayload | undefined>(payload());

// set() requires TodoPayload (not TodoPayload | undefined)
payload.set({ id: 1, title: "Buy milk" });
// @ts-expect-error - cannot set undefined
payload.set(undefined);

// -----------------------------------------------------------------------------
// Overload 2: signal(value) - with initial value
// -----------------------------------------------------------------------------

// Primitive values
const numberSignal = signal(42);
expectType<MutableSignal<number>>(numberSignal);
expectType<number>(numberSignal());

const stringSignal = signal("hello");
expectType<MutableSignal<string>>(stringSignal);
expectType<string>(stringSignal());

const booleanSignal = signal(true);
expectType<MutableSignal<boolean>>(booleanSignal);
expectType<boolean>(booleanSignal());

// Object values
const objectSignal = signal({ name: "Alice", age: 30 });
expectType<MutableSignal<{ name: string; age: number }>>(objectSignal);
expectType<{ name: string; age: number }>(objectSignal());

// Array values
const arraySignal = signal([1, 2, 3]);
expectType<MutableSignal<number[]>>(arraySignal);
expectType<number[]>(arraySignal());

// -----------------------------------------------------------------------------
// Overload 2: signal(lazyFn) - with lazy initializer
// -----------------------------------------------------------------------------

const lazySignal = signal((context: SignalContext) => {
  expectType<SignalContext>(context);
  expectType<AbortSignal>(context.abortSignal);
  context.cleanup(() => {});
  return 42;
});
expectType<MutableSignal<number>>(lazySignal);
expectType<number>(lazySignal());

// Lazy with complex return type
const lazyObjectSignal = signal(() => ({
  user: { id: 1, name: "Bob" },
  posts: [1, 2, 3],
}));
expectType<
  MutableSignal<{
    user: { id: number; name: string };
    posts: number[];
  }>
>(lazyObjectSignal);

// -----------------------------------------------------------------------------
// Overload 2: signal(value, equals) - with equality string shortcut
// -----------------------------------------------------------------------------

const signalShallow = signal({ name: "John" }, "shallow");
expectType<MutableSignal<{ name: string }>>(signalShallow);

const signalDeep = signal({ nested: { value: 1 } }, "deep");
expectType<MutableSignal<{ nested: { value: number } }>>(signalDeep);

const signalIs = signal(42, "strict");
expectType<MutableSignal<number>>(signalIs);

// @ts-expect-error - custom equals function not allowed as second arg (use options)
const signalCustomEquals = signal(42, (a, b) => a === b);

// -----------------------------------------------------------------------------
// Overload 2: signal(value, options) - with options
// -----------------------------------------------------------------------------

const signalWithEquals = signal(42, {
  equals: (a, b) => a === b,
});
expectType<MutableSignal<number>>(signalWithEquals);

const signalWithName = signal("test", {
  name: "testSignal",
});
expectType<MutableSignal<string>>(signalWithName);

const signalWithFallback = signal(0, {
  fallback: (error) => {
    expectType<unknown>(error);
    return -1;
  },
});
expectType<MutableSignal<number>>(signalWithFallback);

const signalWithCallbacks = signal(0, {
  onChange: (value) => {
    expectType<number>(value);
  },
  onError: (error) => {
    expectType<unknown>(error);
  },
});
expectType<MutableSignal<number>>(signalWithCallbacks);

// -----------------------------------------------------------------------------
// Overload 3: signal(deps, compute) - with dependencies
// -----------------------------------------------------------------------------

const count = signal(0);
const doubled = signal({ count }, (ctx) => {
  expectType<{ count: number }>(ctx.deps);
  expectType<number>(ctx.deps.count);
  expectType<AbortSignal>(ctx.abortSignal);
  ctx.cleanup(() => {});
  return ctx.deps.count * 2;
});
expectType<ComputedSignal<number>>(doubled);
expectType<number>(doubled());

// Multiple dependencies
const firstName = signal("John");
const lastName = signal("Doe");
const fullName = signal({ firstName, lastName }, (ctx) => {
  return `${ctx.deps.firstName} ${ctx.deps.lastName}`;
});
expectType<ComputedSignal<string>>(fullName);
expectType<string>(fullName());

// Dependencies with different types
const user = signal({ id: 1, name: "Alice" });
const posts = signal([1, 2, 3]);
const summary = signal({ user, posts }, (ctx) => {
  return {
    userName: ctx.deps.user.name,
    postCount: ctx.deps.posts.length,
  };
});
expectType<ComputedSignal<{ userName: string; postCount: number }>>(summary);
expectType<{ userName: string; postCount: number }>(summary());

// -----------------------------------------------------------------------------
// Overload 3: signal(deps, compute, equals) - with equality string shortcut
// -----------------------------------------------------------------------------

const computedShallow = signal(
  { firstName, lastName },
  (ctx) => ({ full: `${ctx.deps.firstName} ${ctx.deps.lastName}` }),
  "shallow"
);
expectType<ComputedSignal<{ full: string }>>(computedShallow);

const computedDeep = signal(
  { user, posts },
  (ctx) => ({ user: ctx.deps.user, posts: ctx.deps.posts }),
  "deep"
);
expectType<
  ComputedSignal<{ user: { id: number; name: string }; posts: number[] }>
>(computedDeep);

signal(
  { count },
  (ctx) => ctx.deps.count * 2,
  // @ts-expect-error - custom equals function not allowed as third arg (use options)
  (a, b) => a === b
);

// -----------------------------------------------------------------------------
// Overload 3: signal(deps, compute, options) - with options
// -----------------------------------------------------------------------------

const computedWithOptions = signal({ count }, (ctx) => ctx.deps.count * 2, {
  name: "doubled",
  equals: (a, b) => a === b,
  fallback: (error) => {
    expectType<unknown>(error);
    return 0;
  },
  onChange: (value) => {
    expectType<number>(value);
  },
});
expectType<ComputedSignal<number>>(computedWithOptions);

// -----------------------------------------------------------------------------
// Signal instance methods
// -----------------------------------------------------------------------------

const testSignal = signal(42);

// get() method
expectType<number>(testSignal.get());

// set() method
testSignal.set(100);
testSignal.set((current) => current + 1);

// on() method
const unsubscribe = testSignal.on(() => {
  console.log("changed");
});
expectType<() => void>(unsubscribe);

// dispose() method
testSignal.dispose();

// reset() method
testSignal.reset();

// displayName
expectType<string | undefined>(testSignal.displayName);

// map() method
const mapped = count.map((x) => x * 2);
expectType<ComputedSignal<number>>(mapped);

const mappedShallow = user.map((u) => u.name, "shallow");
expectType<ComputedSignal<string>>(mappedShallow);

const mappedWithOptions = user.map((u) => u.name, {
  equals: (a, b) => a === b,
  name: "userName",
});
expectType<ComputedSignal<string>>(mappedWithOptions);

count.map(
  (x) => x * 2,
  // @ts-expect-error - custom equals function not allowed as second arg (use options)
  (a, b) => a === b
);

// scan() method
const scanned = count.scan((acc, curr) => acc + curr, 0);
expectType<ComputedSignal<number>>(scanned);

const scannedShallow = count.scan(
  (acc, curr) => ({ sum: acc.sum + curr, count: acc.count + 1 }),
  { sum: 0, count: 0 },
  "shallow"
);
expectType<ComputedSignal<{ sum: number; count: number }>>(scannedShallow);

const scannedWithOptions = count.scan((acc, curr) => acc + curr, 0, {
  equals: (a, b) => a === b,
  name: "total",
});
expectType<ComputedSignal<number>>(scannedWithOptions);

count.scan(
  (acc, curr) => acc + curr,
  0,
  // @ts-expect-error - custom equals function not allowed as third arg (use options)
  (a, b) => a === b
);

// toJSON method
expectType<number>(count.toJSON());
expectType<string>(firstName.toJSON());
expectType<{ id: number; name: string }>(user.toJSON());
expectType<number[]>(posts.toJSON());

// -----------------------------------------------------------------------------
// Signal context features
// -----------------------------------------------------------------------------

void signal({ count }, (ctx) => {
  // Access abort signal
  expectType<AbortSignal>(ctx.abortSignal);

  // Use in fetch
  fetch("/api/data", { signal: ctx.abortSignal });

  return ctx.deps.count * 2;
});

// -----------------------------------------------------------------------------
// Edge cases and complex scenarios
// -----------------------------------------------------------------------------

// Union types
const unionSignal = signal<string | number>(42);
expectType<Signal<string | number>>(unionSignal);
unionSignal.set("hello");
unionSignal.set(100);

// Optional types
const optionalSignal = signal<string | undefined>(undefined);
expectType<Signal<string | undefined>>(optionalSignal);
optionalSignal.set("hello");
optionalSignal.set(undefined);

// Nullable types
const nullableSignal = signal<string | null>(null);
expectType<Signal<string | null>>(nullableSignal);
nullableSignal.set("hello");
nullableSignal.set(null);

// Generic types
interface User<T> {
  id: T;
  name: string;
}

const genericSignal = signal<User<number>>({ id: 1, name: "Alice" });
expectType<Signal<User<number>>>(genericSignal);
expectType<User<number>>(genericSignal());

// Computed signal with async dependencies (returns promise-like)
const asyncData = signal({ count }, (ctx) => {
  return Promise.resolve(ctx.deps.count * 2);
});
expectType<Signal<Promise<number>>>(asyncData);

// Nested signal dependencies
const a = signal(1);
const b = signal({ a }, (ctx) => ctx.deps.a * 2);
const c = signal({ b }, (ctx) => ctx.deps.b * 2);
expectType<MutableSignal<number>>(a);
expectType<ComputedSignal<number>>(b);
expectType<ComputedSignal<number>>(c);
expectType<number>(c());

// =============================================================================
// LOADABLE API TYPE CHECKS
// =============================================================================

// -----------------------------------------------------------------------------
// Helper: declare some test promises
// -----------------------------------------------------------------------------

declare const promiseNumber: PromiseLike<number>;
declare const promiseString: PromiseLike<string>;
declare const promiseUser: PromiseLike<{ id: number; name: string }>;

// -----------------------------------------------------------------------------
// loadable.loading(promise) - LoadingLoadable
// -----------------------------------------------------------------------------

const loadingNumber = loadable.loading(promiseNumber);
expectType<LoadingLoadable<number>>(loadingNumber);
expectType<"loading">(loadingNumber.status);
expectType<PromiseLike<number>>(loadingNumber.promise);
expectType<undefined>(loadingNumber.value);
expectType<undefined>(loadingNumber.error);
expectType<true>(loadingNumber.loading);

const loadingString = loadable.loading(promiseString);
expectType<LoadingLoadable<string>>(loadingString);
expectType<"loading">(loadingString.status);
expectType<PromiseLike<string>>(loadingString.promise);

const loadingUser = loadable.loading(promiseUser);
expectType<LoadingLoadable<{ id: number; name: string }>>(loadingUser);
expectType<"loading">(loadingUser.status);
expectType<PromiseLike<{ id: number; name: string }>>(loadingUser.promise);

// -----------------------------------------------------------------------------
// loadable.success(value) - SuccessLoadable
// -----------------------------------------------------------------------------

const successNumber = loadable.success(42);
expectType<SuccessLoadable<number>>(successNumber);
expectType<"success">(successNumber.status);
expectType<number>(successNumber.value);
expectType<undefined>(successNumber.error);
expectType<false>(successNumber.loading);
expectType<PromiseLike<number>>(successNumber.promise);

const successString = loadable.success("hello");
expectType<SuccessLoadable<string>>(successString);
expectType<"success">(successString.status);
expectType<string>(successString.value);

const successUser = loadable.success({ id: 1, name: "Alice" });
expectType<SuccessLoadable<{ id: number; name: string }>>(successUser);
expectType<"success">(successUser.status);
expectType<{ id: number; name: string }>(successUser.value);

const successArray = loadable.success([1, 2, 3]);
expectType<SuccessLoadable<number[]>>(successArray);
expectType<"success">(successArray.status);
expectType<number[]>(successArray.value);

// With explicit promise
const successWithPromise = loadable.success(100, Promise.resolve(100));
expectType<SuccessLoadable<number>>(successWithPromise);
expectType<number>(successWithPromise.value);
expectType<PromiseLike<number>>(successWithPromise.promise);

// -----------------------------------------------------------------------------
// loadable.error(error) - ErrorLoadable
// -----------------------------------------------------------------------------

const errorWithError = loadable.error(new Error("Something failed"));
expectType<ErrorLoadable<any>>(errorWithError);
expectType<"error">(errorWithError.status);
expectType<unknown>(errorWithError.error);
expectType<undefined>(errorWithError.value);
expectType<false>(errorWithError.loading);
expectType<PromiseLike<any>>(errorWithError.promise);

const errorWithString = loadable.error("Error message");
expectType<ErrorLoadable<any>>(errorWithString);
expectType<"error">(errorWithString.status);
expectType<unknown>(errorWithString.error);

const errorWithNumber = loadable.error(404);
expectType<ErrorLoadable<any>>(errorWithNumber);
expectType<"error">(errorWithNumber.status);
expectType<unknown>(errorWithNumber.error);

// With explicit type parameter
const errorTyped = loadable.error<string>(new Error("Failed to load string"));
expectType<ErrorLoadable<string>>(errorTyped);
expectType<"error">(errorTyped.status);
expectType<unknown>(errorTyped.error);

// With explicit promise
const errorWithPromise = loadable.error<number>(
  new Error("Failed"),
  Promise.reject(new Error("Failed"))
);
expectType<ErrorLoadable<number>>(errorWithPromise);
expectType<unknown>(errorWithPromise.error);
expectType<PromiseLike<number>>(errorWithPromise.promise);

// -----------------------------------------------------------------------------
// loadable.is() type guard
// -----------------------------------------------------------------------------

const unknownValue: unknown = { status: "success", value: 42 };

if (loadable.is(unknownValue)) {
  expectType<Loadable<unknown>>(unknownValue);
  expectType<"loading" | "success" | "error">(unknownValue.status);
}

// With type parameter
if (loadable.is<number>(unknownValue)) {
  expectType<Loadable<number>>(unknownValue);

  if (unknownValue.status === "success") {
    expectType<number>(unknownValue.value);
  }
}

// Narrowing within loadable
const maybeLoadable: unknown = successNumber;
if (loadable.is<string>(maybeLoadable)) {
  if (maybeLoadable.status === "success") {
    expectType<string>(maybeLoadable.value);
  }
  if (maybeLoadable.status === "loading") {
    expectType<PromiseLike<string>>(maybeLoadable.promise);
  }
  if (maybeLoadable.status === "error") {
    expectType<unknown>(maybeLoadable.error);
  }
}

// -----------------------------------------------------------------------------
// loadable.get() - Get or create loadable from promise
// -----------------------------------------------------------------------------

const getLoadNumber = loadable.get(promiseNumber);
expectType<Loadable<number>>(getLoadNumber);
// First call creates loading, subsequent calls may return success/error
expectType<"loading" | "success" | "error">(getLoadNumber.status);

const getLoadString = loadable.get(promiseString);
expectType<Loadable<string>>(getLoadString);

const getLoadUser = loadable.get(promiseUser);
expectType<Loadable<{ id: number; name: string }>>(getLoadUser);

// -----------------------------------------------------------------------------
// loadable.set() - Associate loadable with promise
// -----------------------------------------------------------------------------

const setLoad1 = loadable.set(promiseNumber, successNumber);
expectType<SuccessLoadable<number>>(setLoad1);

const setLoad2 = loadable.set(promiseString, loadingString);
expectType<LoadingLoadable<string>>(setLoad2);

const setLoad3 = loadable.set(
  promiseUser,
  loadable.error<{ id: number; name: string }>(new Error("Failed"))
);
expectType<ErrorLoadable<{ id: number; name: string }>>(setLoad3);

// -----------------------------------------------------------------------------
// loadable() - Normalize any value to loadable
// -----------------------------------------------------------------------------

// From plain value
const norm1 = loadable(42);
expectType<Loadable<number>>(norm1);

// From promise
const norm2 = loadable(promiseNumber);
expectType<Loadable<number>>(norm2);

// From existing loadable
const norm3 = loadable(successNumber);
expectType<SuccessLoadable<number>>(norm3);

// From object
const norm4 = loadable({ id: 1, name: "Alice" });
expectType<Loadable<{ id: number; name: string }>>(norm4);

// From null/undefined
const norm5 = loadable(null);
expectType<Loadable<null>>(norm5);

const norm6 = loadable(undefined);
expectType<Loadable<undefined>>(norm6);

// -----------------------------------------------------------------------------
// Status narrowing with discriminated union
// -----------------------------------------------------------------------------

const testLoadable: Loadable<number> = successNumber as any;

// Narrow by status
if (testLoadable.status === "loading") {
  expectType<LoadingLoadable<number>>(testLoadable);
  expectType<undefined>(testLoadable.value);
  expectType<undefined>(testLoadable.error);
  expectType<PromiseLike<number>>(testLoadable.promise);
  expectType<true>(testLoadable.loading);
} else if (testLoadable.status === "success") {
  expectType<SuccessLoadable<number>>(testLoadable);
  expectType<number>(testLoadable.value);
  expectType<undefined>(testLoadable.error);
  expectType<PromiseLike<number>>(testLoadable.promise);
  expectType<false>(testLoadable.loading);
} else if (testLoadable.status === "error") {
  expectType<ErrorLoadable<number>>(testLoadable);
  expectType<undefined>(testLoadable.value);
  expectType<unknown>(testLoadable.error);
  expectType<PromiseLike<number>>(testLoadable.promise);
  expectType<false>(testLoadable.loading);
}

// Switch statement
switch (testLoadable.status) {
  case "loading":
    expectType<LoadingLoadable<number>>(testLoadable);
    expectType<PromiseLike<number>>(testLoadable.promise);
    break;
  case "success":
    expectType<SuccessLoadable<number>>(testLoadable);
    expectType<number>(testLoadable.value);
    break;
  case "error":
    expectType<ErrorLoadable<number>>(testLoadable);
    expectType<unknown>(testLoadable.error);
    break;
}

// =============================================================================
// WAIT API TYPE CHECKS
// =============================================================================

// -----------------------------------------------------------------------------
// Type inference tests for AwaitedFromAwaitable
// -----------------------------------------------------------------------------

// Test Loadable type extraction using Awaited<Loadable["promise"]>
declare const loadableNumber: Loadable<number>;
expectType<number>(0 as AwaitedFromAwaitable<typeof loadableNumber>);

declare const loadableString: Loadable<string>;
expectType<string>("" as AwaitedFromAwaitable<typeof loadableString>);

// Test Promise type extraction
declare const promiseNum: Promise<number>;
expectType<number>(0 as AwaitedFromAwaitable<typeof promiseNum>);

declare const promiseStr: Promise<string>;
expectType<string>("" as AwaitedFromAwaitable<typeof promiseStr>);

// Test Signal wrapping Loadable
declare const signalLoadableNumber: Signal<Loadable<number>>;
expectType<number>(0 as AwaitedFromAwaitable<typeof signalLoadableNumber>);

// Test Signal wrapping Promise
declare const signalPromiseNumber: Signal<Promise<number>>;
expectType<number>(0 as AwaitedFromAwaitable<typeof signalPromiseNumber>);

// Test Signal wrapping union of Promise and Loadable
declare const signalNumberAwaitable: Signal<Promise<number> | Loadable<number>>;
expectType<number>(0 as AwaitedFromAwaitable<typeof signalNumberAwaitable>);

declare const signalStringAwaitable: Signal<Promise<string> | Loadable<string>>;
expectType<string>("" as AwaitedFromAwaitable<typeof signalStringAwaitable>);

// -----------------------------------------------------------------------------
// Helpers: concrete awaitables
// -----------------------------------------------------------------------------

const awaitableNumber: Awaitable<number> =
  loadableNumber ?? promiseNumber ?? signalNumberAwaitable;
const awaitableString: Awaitable<string> =
  loadableString ?? promiseString ?? signalStringAwaitable;

// -----------------------------------------------------------------------------
// wait / wait.all – Suspense-style (no callbacks)
// -----------------------------------------------------------------------------

// Tuple form
const tupleResult = wait([awaitableNumber, awaitableString]);
expectType<readonly [number, string]>(tupleResult);

// Record form
const recordResult = wait({
  num: awaitableNumber,
  str: awaitableString,
});
expectType<{ num: number; str: string }>(recordResult);

// Single awaitable
const singleResult = wait(awaitableNumber);
expectType<number>(singleResult);

// -----------------------------------------------------------------------------
// wait / wait.all – Promise mode (with callbacks)
// -----------------------------------------------------------------------------

// Tuple with onResolve
const tuplePromise = wait(
  [awaitableNumber, awaitableString],
  (n, s) => `${n}:${s}`
);
expectType<Promise<string>>(tuplePromise);

// Tuple with onResolve + onError
const tuplePromiseWithError = wait(
  [awaitableNumber, awaitableString],
  (n, s) => `${n}:${s}`,
  (error) => (error instanceof Error ? error.message : "unknown")
);
expectType<Promise<string>>(tuplePromiseWithError);

// Record with onResolve
const recordPromise = wait(
  { num: awaitableNumber, str: awaitableString },
  (values) => values.num + values.str.length
);
expectType<Promise<number>>(recordPromise);

// -----------------------------------------------------------------------------
// wait.any
// -----------------------------------------------------------------------------

const anyResult = wait.any({
  num: awaitableNumber,
  str: awaitableString,
});
expectType<[number | string, "num" | "str"]>(anyResult);

const anyPromise = wait.any(
  { num: awaitableNumber, str: awaitableString },
  ([_value, key]) => key
);
expectType<Promise<"num" | "str">>(anyPromise);

const anyPromiseWithError = wait.any(
  { num: awaitableNumber, str: awaitableString },
  ([_value, key]) => key,
  (error) => (error instanceof Error ? error.message : "err")
);
expectType<Promise<"num" | "str" | string>>(anyPromiseWithError);

// -----------------------------------------------------------------------------
// wait.race
// -----------------------------------------------------------------------------

const raceResult = wait.race({
  num: awaitableNumber,
  str: awaitableString,
});
expectType<[number | string, "num" | "str"]>(raceResult);

const racePromise = wait.race(
  { num: awaitableNumber, str: awaitableString },
  ([value, key]) => ({ key, value })
);
expectType<Promise<{ key: "num" | "str"; value: number | string }>>(
  racePromise
);

// -----------------------------------------------------------------------------
// wait.settled
// -----------------------------------------------------------------------------

const settledTuple = wait.settled([awaitableNumber, awaitableString]);
expectType<
  readonly [PromiseSettledResult<number>, PromiseSettledResult<string>]
>(settledTuple);

const settledRecord = wait.settled({
  num: awaitableNumber,
  str: awaitableString,
});
expectType<{
  num: PromiseSettledResult<number>;
  str: PromiseSettledResult<string>;
}>(settledRecord);

const settledPromise = wait.settled(
  [awaitableNumber, awaitableString],
  (results) => results.map((r) => r.status)
);
expectType<Promise<("fulfilled" | "rejected")[]>>(settledPromise);

// -----------------------------------------------------------------------------
// wait.timeout & wait.delay
// -----------------------------------------------------------------------------

const timeoutSingle = wait.timeout(awaitableNumber, 1000);
expectType<Promise<number>>(timeoutSingle);

const timeoutTuple = wait.timeout([awaitableNumber, awaitableNumber], 1000);
expectType<Promise<readonly [number, number]>>(timeoutTuple);

const timeoutRecord = wait.timeout(
  { a: awaitableNumber, b: awaitableString },
  1000
);
expectType<Promise<{ a: number; b: string }>>(timeoutRecord);

const delayPromise = wait.delay(500);
expectType<Promise<void>>(delayPromise);

// =============================================================================
// INTEGRATION TESTS - Multiple APIs together
// =============================================================================

// Test signal wrapping loadable (the problematic case from wait.test.ts)
const sigWithLoadable = signal(loadable.success(42));
const loadable1 = loadable.success(1);
const loadable2 = loadable.success(2);

// Test array with mixed types
const mixedArray = wait([sigWithLoadable, loadable1, loadable2]);
expectType<readonly [SuccessLoadable<number>, number, number]>(mixedArray);

// Test single signal with loadable
const singleSig = wait(sigWithLoadable);
expectType<SuccessLoadable<number>>(singleSig);

// Test with promise callbacks
const promiseResultSig = wait(sigWithLoadable, (value) => value.value);
expectType<Promise<number>>(promiseResultSig);

// Test record with mixed types
const mixedRecord = wait({
  sig: sigWithLoadable,
  loadable: loadable1,
  promise: promiseNumber,
});
expectType<{
  sig: SuccessLoadable<number>;
  loadable: number;
  promise: number;
}>(mixedRecord);

// Complex transformation
type UserType = { id: number; name: string };
declare const userLoadable: Loadable<UserType>;
declare const userPromise: Promise<UserType>;
declare const userSignal: Signal<Loadable<UserType>>;

const userResultFromSignal = wait(userSignal);
expectType<Loadable<UserType>>(userResultFromSignal);

const usersArray = wait([userLoadable, userPromise, userSignal]);
expectType<readonly [UserType, UserType, Loadable<UserType>]>(usersArray);

const usersRecord = wait({
  loadable: userLoadable,
  promise: userPromise,
  signal: userSignal,
});
expectType<{
  loadable: UserType;
  promise: UserType;
  signal: Loadable<UserType>;
}>(usersRecord);

// Test async transformation
const transformedUser = wait(userSignal, (user) => {
  if (user.status === "success") {
    return user.value.name;
  }
  return "";
});
expectType<Promise<string>>(transformedUser);

// =============================================================================
// Export nothing to avoid runtime issues
// =============================================================================

export {};
