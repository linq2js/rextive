/**
 * wait.ts
 *
 * This module provides a small "wait" DSL for coordinating async work:
 *
 * - **Suspense mode (sync)**: `wait(...)` without callbacks are synchronous helpers that:
 *   - Return plain values (or tuples/records)
 *   - Throw Promises while any awaitable is loading (React Suspense compatible)
 *   - Throw errors when awaitables fail
 *
 * - `wait.timeout` and `wait.delay` are Promise-only utilities.
 */
import type { Task, ResolveAwaitable, Signal } from "./types";
import { task } from "./utils/task";
import { isPromiseLike } from "./utils/isPromiseLike";
import { is } from "./is";

/**
 * Represents a value that can be awaited by wait().
 *
 * - A Task<T>
 * - A PromiseLike<T>
 * - A Signal holding either PromiseLike<T> or Task<T> (or a union of both)
 */
export type Awaitable<T> = Task<T> | PromiseLike<T> | Signal<T>;

/**
 * Extract the resolved value type from a single Awaitable.
 *
 * For Tasks, we use Awaited<T["promise"]> to extract the T from Task<T>.
 * For Signals, we recursively extract the type from what the signal returns.
 */
export type AwaitedFromAwaitable<A> = A extends Task<any>
  ? Awaited<A["promise"]>
  : A extends PromiseLike<infer T>
  ? T
  : A extends Signal<infer V>
  ? V extends Task<any>
    ? Awaited<V["promise"]>
    : V extends PromiseLike<infer T>
    ? T
    : V // Fallback to the signal's return type
  : never;

/**
 * Resolved values for tuple/array of awaitables.
 */
export type AwaitedFromTuple<TAwaitables extends readonly Awaitable<any>[]> = {
  [K in keyof TAwaitables]: AwaitedFromAwaitable<TAwaitables[K]>;
};

/**
 * Resolved values for record of awaitables.
 */
export type AwaitedFromRecord<
  TAwaitables extends Record<string, Awaitable<any>>
> = {
  [K in keyof TAwaitables]: AwaitedFromAwaitable<TAwaitables[K]>;
};

/**
 * Checks if a value should be treated as a "single" awaitable
 * (vs an object/record of awaitables).
 */
function isSingleAwaitable(value: unknown): boolean {
  return typeof value === "function" || isPromiseLike(value);
}

/**
 * Resolves an awaitable to a Task representation.
 *
 * - Signal -> call to get underlying value
 * - Value -> normalized via task.from()
 */
function resolveAwaitable(awaitable: Awaitable<any>): Task<any> {
  let value: unknown = awaitable;

  // If it's a signal, call it to get the underlying value
  if (is(value)) {
    value = (value as Signal<unknown>)();
  }

  return task.from(value);
}

/**
 * Synchronous "wait all" for a single awaitable.
 * Throws promise while loading, or error, or returns value.
 */
function waitAllSyncSingle<T>(awaitable: Awaitable<T>): T {
  const l = resolveAwaitable(awaitable);

  if (l.status === "loading") {
    throw l.promise;
  }

  if (l.status === "error") {
    throw l.error;
  }

  return l.value as T;
}

/**
 * Synchronous "wait all" for an array/tuple of awaitables.
 * Throws promise while any is loading, or first error, or returns values.
 */
function waitAllSyncArray<const TAwaitables extends readonly Awaitable<any>[]>(
  awaitables: TAwaitables
): AwaitedFromTuple<TAwaitables> {
  const tasks = awaitables.map(resolveAwaitable);

  // If any are loading, throw a combined promise
  const loading = tasks.find((t) => t.status === "loading");
  if (loading) {
    const promises = tasks.map((t) =>
      t.status === "loading" ? t.promise : Promise.resolve(t.value)
    );
    throw Promise.all(promises);
  }

  // If any errored, throw the first error
  const errored = tasks.find((t) => t.status === "error");
  if (errored) {
    throw errored.error;
  }

  // All succeeded
  return tasks.map((t) => t.value) as AwaitedFromTuple<TAwaitables>;
}

/**
 * Synchronous "wait all" for a record of awaitables.
 * Throws promise while any is loading, or first error, or returns record.
 */
function waitAllSyncRecord<
  const TAwaitables extends Record<string, Awaitable<any>>
>(awaitables: TAwaitables): AwaitedFromRecord<TAwaitables> {
  const entries = Object.entries(awaitables) as [string, Awaitable<unknown>][];

  const tasks = entries.map(([key, awaitable]) => ({
    key,
    task: resolveAwaitable(awaitable),
  }));

  const loading = tasks.find(({ task: t }) => t.status === "loading");
  if (loading) {
    const promises = tasks.map(({ task: t }) =>
      t.status === "loading" ? t.promise : Promise.resolve(t.value)
    );
    throw Promise.all(promises);
  }

  const errored = tasks.find(({ task: t }) => t.status === "error");
  if (errored) {
    throw errored.task.error;
  }

  const result: any = {};
  for (const { key, task: t } of tasks) {
    result[key] = t.value;
  }

  return result as AwaitedFromRecord<TAwaitables>;
}

/**
 * Async "wait all" for a single awaitable.
 * @internal Used by waitTimeout
 */
async function waitAllAsyncSingle<T>(awaitable: Awaitable<T>): Promise<T> {
  const l = resolveAwaitable(awaitable);

  if (l.status === "loading") {
    return (await l.promise) as T;
  }

  if (l.status === "error") {
    throw l.error;
  }

  return l.value as T;
}

/**
 * Async "wait all" for an array/tuple of awaitables.
 * @internal Used by waitTimeout
 */
async function waitAllAsyncArray<
  const TAwaitables extends readonly Awaitable<any>[]
>(awaitables: TAwaitables): Promise<AwaitedFromTuple<TAwaitables>> {
  const tasks = awaitables.map(resolveAwaitable);

  const promises = tasks.map((t) =>
    t.status === "loading"
      ? t.promise
      : t.status === "success"
      ? Promise.resolve(t.value)
      : Promise.reject(t.error)
  );

  return (await Promise.all(promises)) as AwaitedFromTuple<TAwaitables>;
}

/**
 * Async "wait all" for a record of awaitables.
 * @internal Used by waitTimeout
 */
async function waitAllAsyncRecord<
  const TAwaitables extends Record<string, Awaitable<any>>
>(awaitables: TAwaitables): Promise<AwaitedFromRecord<TAwaitables>> {
  const entries = Object.entries(awaitables) as [string, Awaitable<unknown>][];

  const tasks = entries.map(([key, awaitable]) => ({
    key,
    task: resolveAwaitable(awaitable),
  }));

  const promises = tasks.map(({ task: t }) =>
    t.status === "loading"
      ? t.promise
      : t.status === "success"
      ? Promise.resolve(t.value)
      : Promise.reject(t.error)
  );

  const resolved = await Promise.all(promises);
  const result: any = {};
  for (let i = 0; i < resolved.length; i++) {
    const { key } = tasks[i];
    result[key] = resolved[i];
  }
  return result as AwaitedFromRecord<TAwaitables>;
}

/**
 * Wait for awaitables to resolve. Suspense-compatible.
 *
 * @example Single awaitable
 * ```tsx
 * rx(() => {
 *   const user = wait(userSignal());
 *   return <div>{user.name}</div>;
 * });
 * ```
 *
 * @example Multiple awaitables (tuple)
 * ```tsx
 * rx(() => {
 *   const [user, posts] = wait([userSignal(), postsSignal()]);
 *   return <div>{user.name}: {posts.length} posts</div>;
 * });
 * ```
 *
 * @example Multiple awaitables (record)
 * ```tsx
 * rx(() => {
 *   const { user, posts } = wait({ user: userSignal(), posts: postsSignal() });
 *   return <div>{user.name}: {posts.length} posts</div>;
 * });
 * ```
 */
export function waitAll<T>(awaitable: Awaitable<T>): ResolveAwaitable<T>;

export function waitAll<const TAwaitables extends readonly Awaitable<any>[]>(
  awaitables: TAwaitables
): AwaitedFromTuple<TAwaitables>;

export function waitAll<
  const TAwaitables extends Record<string, Awaitable<any>>
>(awaitables: TAwaitables): AwaitedFromRecord<TAwaitables>;

// Implementation
export function waitAll(awaitableOrCollection: any): any {
  if (Array.isArray(awaitableOrCollection)) {
    return waitAllSyncArray(awaitableOrCollection);
  }
  if (isSingleAwaitable(awaitableOrCollection)) {
    return waitAllSyncSingle(awaitableOrCollection);
  }
  return waitAllSyncRecord(awaitableOrCollection);
}

/**
 * Waits for awaitables with a timeout. Resolves with the same shape as waitAll,
 * or rejects with a TimeoutError when the timeout elapses first.
 */
export class TimeoutError extends Error {
  constructor(message: string = "Operation timed out") {
    super(message);
    this.name = "TimeoutError";
  }
}

export function waitTimeout<T>(
  awaitable: Awaitable<T>,
  ms: number,
  error?: string | (() => unknown)
): Promise<T>;
export function waitTimeout<
  const TAwaitables extends readonly Awaitable<any>[]
>(
  awaitables: TAwaitables,
  ms: number,
  error?: string | (() => unknown)
): Promise<AwaitedFromTuple<TAwaitables>>;
export function waitTimeout<
  const TAwaitables extends Record<string, Awaitable<any>>
>(
  awaitables: TAwaitables,
  ms: number,
  error?: string | (() => unknown)
): Promise<AwaitedFromRecord<TAwaitables>>;
export function waitTimeout(
  awaitableOrCollection: any,
  ms: number,
  error?: string | (() => unknown)
): Promise<any> {
  const makeTimeoutError = () => {
    const err =
      typeof error === "function"
        ? error()
        : error
        ? new TimeoutError(error)
        : new TimeoutError();
    return err;
  };

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(makeTimeoutError());
    }, ms);
  });

  let mainPromise: Promise<any>;

  if (Array.isArray(awaitableOrCollection)) {
    mainPromise = waitAllAsyncArray(awaitableOrCollection);
  } else if (isSingleAwaitable(awaitableOrCollection)) {
    mainPromise = waitAllAsyncSingle(awaitableOrCollection);
  } else {
    mainPromise = waitAllAsyncRecord(awaitableOrCollection);
  }

  const promise = Promise.race([mainPromise, timeoutPromise]);
  task.from(promise);
  return promise;
}

/**
 * Simple delay helper. Returns a Promise that resolves after the given duration.
 */
export function waitDelay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Exported wait API:
 *
 * - wait() is the primary entry point (alias of waitAll)
 * - wait.all, wait.timeout, wait.delay provide Promise-based helpers
 */
/** Combined wait API type */
export type WaitApi = typeof waitAll & {
  all: typeof waitAll;
  timeout: typeof waitTimeout;
  delay: typeof waitDelay;
};

export const wait: WaitApi = Object.assign(waitAll, {
  all: waitAll,
  timeout: waitTimeout,
  delay: waitDelay,
});
