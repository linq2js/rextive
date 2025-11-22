// TypeScript-only tests for the wait API.
// These are compile-time checks – they should not be imported at runtime.

import { wait, type Awaitable, type AwaitedFromAwaitable } from "./wait";
import type { Loadable, Signal } from "./types";
import { signal } from "./signal";
import { loadable } from "./utils/loadable";

// Utility to assert inferred types at compile time
function expectType<T>(_value: T): void {
  // no runtime behaviour
}

// ---------------------------------------------------------------------------
// Type inference tests for AwaitedFromAwaitable
// ---------------------------------------------------------------------------

// Test Loadable type extraction using Awaited<Loadable["promise"]>
declare const loadableNumber: Loadable<number>;
expectType<number>(0 as AwaitedFromAwaitable<typeof loadableNumber>);

declare const loadableString: Loadable<string>;
expectType<string>("" as AwaitedFromAwaitable<typeof loadableString>);

// Test Promise type extraction
declare const promiseNumber: Promise<number>;
expectType<number>(0 as AwaitedFromAwaitable<typeof promiseNumber>);

declare const promiseString: Promise<string>;
expectType<string>("" as AwaitedFromAwaitable<typeof promiseString>);

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

// ---------------------------------------------------------------------------
// Helpers: concrete awaitables
// ---------------------------------------------------------------------------

const awaitableNumber: Awaitable<number> =
  loadableNumber ?? promiseNumber ?? signalNumberAwaitable;
const awaitableString: Awaitable<string> =
  loadableString ?? promiseString ?? signalStringAwaitable;

// ---------------------------------------------------------------------------
// wait / wait.all – Suspense-style (no callbacks)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// wait / wait.all – Promise mode (with callbacks)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// wait.any
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// wait.race
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// wait.settled
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// wait.timeout & wait.delay
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Real-world usage patterns
// ---------------------------------------------------------------------------

// Test with actual signal wrapping loadable (the problematic case from wait.test.ts)
const sigWithLoadable = signal(loadable("success", 42));
const loadable1 = loadable("success", 1);
const loadable2 = loadable("success", 2);

// Test array with mixed types - Signal<any> means we get unknown from the signal
const mixedArray = wait([sigWithLoadable, loadable1, loadable2]);
// Due to Signal<any>, the signal's type is unknown, but loadables are still number
expectType<readonly [unknown, number, number]>(mixedArray);

// Test single signal with loadable - Signal<any> resolves to unknown
const singleSig = wait(sigWithLoadable);
expectType<unknown>(singleSig);

// Test with promise callbacks - still unknown
const promiseResultSig = wait(sigWithLoadable, (value) => value);
expectType<Promise<unknown>>(promiseResultSig);

// Test record with mixed types - signal gives unknown
const mixedRecord = wait({
  sig: sigWithLoadable,
  loadable: loadable1,
  promise: promiseNumber,
});
expectType<{ sig: unknown; loadable: number; promise: number }>(mixedRecord);

// Test with error handling - signal gives unknown
const withErrorHandling = wait(
  sigWithLoadable,
  (value) => String(value),
  () => "error"
);
expectType<Promise<string>>(withErrorHandling);

// ---------------------------------------------------------------------------
// Complex nested types
// ---------------------------------------------------------------------------

// Test deeply nested structures
type User = { id: number; name: string };
declare const userLoadable: Loadable<User>;
declare const userPromise: Promise<User>;
declare const userSignal: Signal<Loadable<User>>;

// With Signal<any>, userSignal resolves to unknown
const userResultFromSignal = wait(userSignal);
expectType<unknown>(userResultFromSignal);

const usersArray = wait([userLoadable, userPromise, userSignal]);
// Signal<any> means third element is unknown
expectType<readonly [User, User, unknown]>(usersArray);

const usersRecord = wait({
  loadable: userLoadable,
  promise: userPromise,
  signal: userSignal,
});
// Signal<any> means 'signal' field is unknown
expectType<{ loadable: User; promise: User; signal: unknown }>(usersRecord);

// Test async transformation - user is unknown from Signal<any>
const transformedUser = wait(userSignal, (user) => user);
expectType<Promise<unknown>>(transformedUser);

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

// Test with void
declare const voidPromise: Promise<void>;
const voidResult = wait(voidPromise);
expectType<void>(voidResult);

// Test with never (should still compile)
declare const neverPromise: Promise<never>;
const neverResult = wait(neverPromise);
expectType<never>(neverResult);

// Test with unknown
declare const unknownLoadable: Loadable<unknown>;
const unknownResult = wait(unknownLoadable);
expectType<unknown>(unknownResult);

// Test with any (should preserve any)
declare const anyLoadable: Loadable<any>;
const anyLoadableResult = wait(anyLoadable);
expectType<any>(anyLoadableResult);
