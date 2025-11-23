// TypeScript-only tests for the loadable API.
// These are compile-time checks – they should not be imported at runtime.

import { loadable } from "./loadable";
import type {
  Loadable,
  LoadingLoadable,
  SuccessLoadable,
  ErrorLoadable,
} from "../types";

// Utility to assert inferred types at compile time
function expectType<T>(_value: T): void {
  // no runtime behaviour
}

// ---------------------------------------------------------------------------
// Helper: declare some test promises
// ---------------------------------------------------------------------------

declare const promiseNumber: PromiseLike<number>;
declare const promiseString: PromiseLike<string>;
declare const promiseUser: PromiseLike<{ id: number; name: string }>;

// ---------------------------------------------------------------------------
// loadable.loading(promise) - LoadingLoadable
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// loadable.success(value) - SuccessLoadable
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// loadable.error(error) - ErrorLoadable
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// loadable.is() type guard
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// loadable.get() - Get or create loadable from promise
// ---------------------------------------------------------------------------

const getLoadNumber = loadable.get(promiseNumber);
expectType<Loadable<number>>(getLoadNumber);
// First call creates loading, subsequent calls may return success/error
expectType<"loading" | "success" | "error">(getLoadNumber.status);

const getLoadString = loadable.get(promiseString);
expectType<Loadable<string>>(getLoadString);

const getLoadUser = loadable.get(promiseUser);
expectType<Loadable<{ id: number; name: string }>>(getLoadUser);

// ---------------------------------------------------------------------------
// loadable.set() - Associate loadable with promise
// ---------------------------------------------------------------------------

const setLoad1 = loadable.set(promiseNumber, successNumber);
expectType<SuccessLoadable<number>>(setLoad1);

const setLoad2 = loadable.set(promiseString, loadingString);
expectType<LoadingLoadable<string>>(setLoad2);

const setLoad3 = loadable.set(
  promiseUser,
  loadable.error<{ id: number; name: string }>(new Error("Failed"))
);
expectType<ErrorLoadable<{ id: number; name: string }>>(setLoad3);

// ---------------------------------------------------------------------------
// loadable() - Normalize any value to loadable
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Status narrowing with discriminated union
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Complex scenarios
// ---------------------------------------------------------------------------

// Union types
const unionLoadable = loadable.success<string | number>(42);
expectType<SuccessLoadable<string | number>>(unionLoadable);
expectType<string | number>(unionLoadable.value);

// Optional types
const optionalLoadable = loadable.success<string | undefined>(undefined);
expectType<SuccessLoadable<string | undefined>>(optionalLoadable);
expectType<string | undefined>(optionalLoadable.value);

// Nullable types
const nullableLoadable = loadable.success<string | null>(null);
expectType<SuccessLoadable<string | null>>(nullableLoadable);
expectType<string | null>(nullableLoadable.value);

// Generic types
interface Result<T> {
  data: T;
  timestamp: number;
}

const genericLoadable = loadable.success<Result<number>>({
  data: 42,
  timestamp: Date.now(),
});
expectType<SuccessLoadable<Result<number>>>(genericLoadable);
expectType<Result<number>>(genericLoadable.value);

// Array of loadables
const loadableArray: Array<Loadable<number>> = [
  loadable.loading(promiseNumber),
  loadable.success(42),
  loadable.error(new Error("Failed")),
];
expectType<Array<Loadable<number>>>(loadableArray);

// Map of loadables
const loadableMap: Record<string, Loadable<string>> = {
  a: loadable.success("hello"),
  b: loadable.loading(promiseString),
  c: loadable.error(new Error("Failed")),
};
expectType<Record<string, Loadable<string>>>(loadableMap);

// Async function returning loadable
async function fetchData(): Promise<Loadable<number>> {
  const data = await promiseNumber;
  return loadable.success(data);
}

const asyncResult = fetchData();
expectType<PromiseLike<Loadable<number>>>(asyncResult);

// Helper function to map loadable values
function mapLoadable<T, U>(l: Loadable<T>, fn: (value: T) => U): Loadable<U> {
  if (l.status === "success") {
    return loadable.success(fn(l.value));
  }
  if (l.status === "loading") {
    return loadable.loading(l.promise.then(fn));
  }
  return loadable.error(l.error);
}

const mapped = mapLoadable(successNumber, (n) => n * 2);
expectType<Loadable<number>>(mapped);

// Helper to extract value or default
function getValueOr<T>(l: Loadable<T>, defaultValue: T): T {
  return l.status === "success" ? l.value : defaultValue;
}

const extracted = getValueOr(successNumber, 0);
expectType<number>(extracted);

// Chaining loadables
const chain1 = loadable.success(5);
const chain2 = mapLoadable(chain1, (n) => n.toString());
expectType<Loadable<string>>(chain2);

// Error recovery
function recoverFromError<T>(l: Loadable<T>, recovery: T): SuccessLoadable<T> {
  if (l.status === "error") {
    return loadable.success(recovery);
  }
  if (l.status === "success") {
    return l;
  }
  // Loading state - need to handle somehow
  throw new Error("Cannot recover from loading state");
}

const recovered = recoverFromError(errorWithNumber as Loadable<number>, 0);
expectType<SuccessLoadable<number>>(recovered);
