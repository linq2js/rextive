import { isPromiseLike } from "./isPromiseLike";

/**
 * Represents the status of an async operation.
 */
export type LoadableStatus = "loading" | "success" | "error";

/**
 * Internal symbol used to identify loadable objects at runtime.
 * This allows for reliable type checking without relying on duck typing.
 */
export const LOADABLE_TYPE = Symbol("LOADABLE_TYPE");

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

/**
 * Creates a loading loadable from a promise.
 *
 * @param promise - The promise representing the ongoing operation
 * @returns A LoadingLoadable wrapping the promise
 *
 * @example
 * ```typescript
 * const userPromise = fetchUser(1);
 * const loading = loadable("loading", userPromise);
 * // { status: "loading", promise: userPromise, data: undefined, error: undefined, loading: true }
 * ```
 */
export function loadable<TValue>(
  status: "loading",
  promise: PromiseLike<TValue>
): LoadingLoadable<TValue>;

/**
 * Creates a success loadable with data and the resolved promise.
 *
 * @template TValue - The type of the successful result
 * @param status - Must be "success"
 * @param value - The successful result data
 * @param promise - The resolved promise (optional, will create one if not provided)
 * @returns A SuccessLoadable containing the data
 *
 * @example
 * ```typescript
 * const user = { id: 1, name: "Alice" };
 * const success = loadable("success", user);
 * // { status: "success", promise: Promise.resolve(user), data: user, error: undefined, loading: false }
 * ```
 */
export function loadable<TValue>(
  status: "success",
  value: TValue,
  promise?: PromiseLike<TValue>
): SuccessLoadable<TValue>;

/**
 * Creates an error loadable with error information.
 *
 * @param status - Must be "error"
 * @param error - The error that occurred
 * @param promise - The rejected promise (optional, will create one if not provided)
 * @returns An ErrorLoadable containing the error
 *
 * @example
 * ```typescript
 * const err = new Error("User not found");
 * const error = loadable("error", err);
 * // { status: "error", promise: Promise.reject(err), data: undefined, error: err, loading: false }
 * ```
 */
export function loadable<TValue>(
  status: "error",
  error: unknown,
  promise?: PromiseLike<TValue>
): ErrorLoadable<TValue>;

/**
 * Internal implementation of the loadable factory function.
 * Use the typed overloads above for type-safe loadable creation.
 */
export function loadable(
  status: LoadableStatus,
  dataOrError?: unknown,
  promise?: PromiseLike<unknown>
): Loadable<any> {
  if (status === "loading") {
    if (!promise && isPromiseLike(dataOrError)) {
      promise = dataOrError as PromiseLike<unknown>;
    }

    if (!promise) {
      throw new Error("Loading loadable requires a promise");
    }
    return {
      [LOADABLE_TYPE]: true,
      status: "loading",
      promise,
      value: undefined,
      error: undefined,
      loading: true,
    };
  }

  if (status === "success") {
    const data = dataOrError;
    const resolvedPromise = promise || Promise.resolve(data);
    return {
      [LOADABLE_TYPE]: true,
      status: "success",
      promise: resolvedPromise,
      value: data,
      error: undefined,
      loading: false,
    };
  }

  if (status === "error") {
    const error = dataOrError;
    const rejectedPromise = promise || Promise.reject(error);
    if (rejectedPromise instanceof Promise) {
      // Prevent unhandled rejection warnings
      rejectedPromise.catch(() => {});
    }
    return {
      [LOADABLE_TYPE]: true,
      status: "error",
      promise: rejectedPromise,
      value: undefined,
      error,
      loading: false,
    };
  }

  throw new Error(`Invalid loadable status: ${status}`);
}

/**
 * Type guard to check if a value is a Loadable.
 *
 * This function performs runtime type checking using the LOADABLE_TYPE symbol,
 * which is more reliable than duck typing on the shape of the object.
 *
 * @template T - The expected data type of the loadable
 * @param value - The value to check
 * @returns True if value is a Loadable, false otherwise
 *
 * @example
 * ```typescript
 * const value: unknown = getAsyncData();
 *
 * if (isLoadable(value)) {
 *   // TypeScript knows value is Loadable<unknown>
 *   switch (value.status) {
 *     case "loading":
 *       console.log("Loading...");
 *       break;
 *     case "success":
 *       console.log("Data:", value.value);
 *       break;
 *     case "error":
 *       console.error("Error:", value.error);
 *       break;
 *   }
 * }
 * ```
 */
export function isLoadable<T = unknown>(value: unknown): value is Loadable<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    LOADABLE_TYPE in value &&
    (value as any)[LOADABLE_TYPE] === true
  );
}
