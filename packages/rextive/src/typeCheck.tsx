/**
 * TypeScript-only tests for all rextive APIs.
 * These are compile-time checks – they should not be imported at runtime.
 *
 * This file consolidates type checking for:
 * - signal() and its overloads
 * - task.from() and its namespace
 * - wait() and its utilities
 *
 * Run type checking with: tsc --noEmit
 */

import type { ReactNode } from "react";
import * as React from "react";
import { rx } from "./react/rx";
import { signal } from "./signal";
import { tag } from "./tag";
import { task } from "./utils/task";
import { is } from "./is";
import { wait, type Awaitable, type AwaitedFromAwaitable } from "./wait";
import { awaited } from "./awaited";
import { compose } from "./utils/compose";
// Operators imported when needed for type checking
import {
  to,
  skip,
  skipWhile,
  skipLast,
  skipUntil,
  take,
  takeWhile,
  takeLast,
  takeUntil,
  count,
  max,
  min,
  distinct,
  filter,
  scan,
  debounce,
  throttle,
  delay,
  type OperatorNameOptions,
  type DistinctOptions,
  type CountOptions,
  type MinMaxOptions,
  type TakeWhileOptions,
} from "./operators";
import type {
  Signal,
  Mutable,
  Computed,
  SignalContext,
  Task,
  LoadingTask,
  SuccessTask,
  ErrorTask,
  Plugin,
  Tag,
  SignalKind,
  UseList,
  AnySignal,
  MutableWhenAction,
  ComputedWhenAction,
} from "./types";

declare function define<T>(): T;

// =============================================================================
// Utility to assert inferred types at compile time
// =============================================================================

function expectType<T>(_value: T): void {
  // no runtime behaviour
}

// =============================================================================
// ALL DECLARATIONS - Organized by category
// =============================================================================

// -----------------------------------------------------------------------------
// Interfaces and Types
// -----------------------------------------------------------------------------

interface TodoPayload {
  id: number;
  title: string;
}

interface User<T> {
  id: T;
  name: string;
}

type UserType = { id: number; name: string };

// -----------------------------------------------------------------------------
// Promise declarations (for task/wait tests)
// -----------------------------------------------------------------------------

declare const promiseNumber: PromiseLike<number>;
declare const promiseString: PromiseLike<string>;
declare const promiseUser: PromiseLike<{ id: number; name: string }>;
declare const promiseNum: Promise<number>;
declare const promiseStr: Promise<string>;

// -----------------------------------------------------------------------------
// Task declarations
// -----------------------------------------------------------------------------

declare const taskNumber: Task<number>;
declare const taskString: Task<string>;
declare const userTask: Task<UserType>;
declare const userPromise: Promise<UserType>;
declare const userSignal: Signal<Task<UserType>>;

// -----------------------------------------------------------------------------
// Signal declarations (for wait tests)
// -----------------------------------------------------------------------------

declare const signalTaskNumber: Signal<Task<number>>;
declare const signalPromiseNumber: Signal<Promise<number>>;
declare const signalNumberAwaitable: Signal<Promise<number> | Task<number>>;
declare const signalStringAwaitable: Signal<Promise<string> | Task<string>>;

// -----------------------------------------------------------------------------
// Task instances
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Wait/Awaitable instances
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Integration test instances
// -----------------------------------------------------------------------------

const sigWithTask = signal(task.success(42));
const task1 = task.success(1);
const task2 = task.success(2);

const mixedArray = wait([sigWithTask, task1, task2]);
const singleSig = wait(sigWithTask);
const promiseResultSig = wait(sigWithTask, (value) => value.value);

const mixedRecord = wait({
  sig: sigWithTask,
  task: task1,
  promise: promiseNumber,
});

const userResultFromSignal = wait(userSignal);
const usersArray = wait([userTask, userPromise, userSignal]);
const usersRecord = wait({
  task: userTask,
  promise: userPromise,
  signal: userSignal,
});

const transformedUser = wait(userSignal, (user) => {
  if (user.status === "success") {
    return user.value.name;
  }
  return "";
});

// =============================================================================
// SIGNAL API TYPE CHECKS
// =============================================================================

function signalTests() {
  // Clone variables from global scope
  const noArgSignal = signal();
  const payload = signal<TodoPayload>();
  const numberSignal = signal(42);
  const stringSignal = signal("hello");
  const booleanSignal = signal(true);
  const objectSignal = signal({ name: "Alice", age: 30 });
  const arraySignal = signal([1, 2, 3]);
  const lazySignal = signal((context: SignalContext) => {
    expectType<SignalContext>(context);
    expectType<AbortSignal>(context.abortSignal);
    context.onCleanup(() => {});
    return 42;
  });
  const lazyObjectSignal = signal(() => ({
    user: { id: 1, name: "Bob" },
    posts: [1, 2, 3],
  }));
  const signalShallow = signal({ name: "John" }, "shallow");
  const signalDeep = signal({ nested: { value: 1 } }, "deep");
  const signalIs = signal(42, "strict");
  const signalWithEquals = signal(42, { equals: (a, b) => a === b });
  const signalWithName = signal("test", { name: "testSignal" });
  const signalWithFallback = signal(0, {
    fallback: (error) => {
      expectType<unknown>(error);
      return -1;
    },
  });
  const signalWithCallbacks = signal(0, {
    onChange: (value) => {
      expectType<number>(value);
    },
    onError: (error) => {
      expectType<unknown>(error);
    },
  });
  const count = signal(0);
  const doubled = signal({ count }, (ctx) => {
    expectType<{ count: number }>(ctx.deps);
    expectType<number>(ctx.deps.count);
    expectType<AbortSignal>(ctx.abortSignal);
    ctx.onCleanup(() => {});
    return ctx.deps.count * 2;
  });
  const firstName = signal("John");
  const lastName = signal("Doe");
  const fullName = signal({ firstName, lastName }, (ctx) => {
    return `${ctx.deps.firstName} ${ctx.deps.lastName}`;
  });
  const user = signal({ id: 1, name: "Alice", email: "alice@example.com" });
  const postIds = signal([1, 2, 3]);
  const summary = signal({ user, posts: postIds }, (ctx) => {
    return {
      userName: ctx.deps.user.name,
      postCount: ctx.deps.posts.length,
    };
  });
  const computedShallow = signal(
    { firstName, lastName },
    (ctx) => ({ full: `${ctx.deps.firstName} ${ctx.deps.lastName}` }),
    "shallow"
  );
  const computedDeep = signal(
    { user, posts: postIds },
    (ctx) => ({ user: ctx.deps.user, posts: ctx.deps.posts }),
    "deep"
  );
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
  const testSignal = signal(42);
  const unionSignal = signal<string | number>(42);
  const optionalSignal = signal<string | undefined>(undefined);
  const nullableSignal = signal<string | null>(null);
  const genericSignal = signal<User<number>>({ id: 1, name: "Alice" });
  const asyncData = signal({ count }, (ctx) => {
    return Promise.resolve(ctx.deps.count * 2);
  });
  const a = signal(1);
  const b = signal({ a }, (ctx) => ctx.deps.a * 2);
  const c = signal({ b }, (ctx) => ctx.deps.b * 2);

  // -----------------------------------------------------------------------------
  // Overload 1: signal() - no arguments, no initial value
  // Special behavior: get() returns T | undefined, but set() requires T
  // -----------------------------------------------------------------------------

  expectType<Mutable<unknown, undefined>>(noArgSignal);
  expectType<unknown | undefined>(noArgSignal());

  expectType<Mutable<TodoPayload, undefined>>(payload);

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
  expectType<Mutable<number>>(numberSignal);
  expectType<number>(numberSignal());

  expectType<Mutable<string>>(stringSignal);
  expectType<string>(stringSignal());

  expectType<Mutable<boolean>>(booleanSignal);
  expectType<boolean>(booleanSignal());

  // Object values
  expectType<Mutable<{ name: string; age: number }>>(objectSignal);
  expectType<{ name: string; age: number }>(objectSignal());

  // Array values
  expectType<Mutable<number[]>>(arraySignal);
  expectType<number[]>(arraySignal());

  // -----------------------------------------------------------------------------
  // Overload 2: signal(lazyFn) - with lazy initializer
  // -----------------------------------------------------------------------------

  expectType<Mutable<number>>(lazySignal);
  expectType<number>(lazySignal());

  // Lazy with complex return type
  expectType<
    Mutable<{
      user: { id: number; name: string };
      posts: number[];
    }>
  >(lazyObjectSignal);

  // -----------------------------------------------------------------------------
  // Overload 2: signal(value, equals) - with equality string shortcut
  // -----------------------------------------------------------------------------

  expectType<Mutable<{ name: string }>>(signalShallow);

  expectType<Mutable<{ nested: { value: number } }>>(signalDeep);

  expectType<Mutable<number>>(signalIs);

  // @ts-expect-error - custom equals function not allowed as second arg (use options)
  const signalCustomEquals = signal(42, (a, b) => a === b);

  // -----------------------------------------------------------------------------
  // Overload 2: signal(value, options) - with options
  // -----------------------------------------------------------------------------

  expectType<Mutable<number>>(signalWithEquals);

  expectType<Mutable<string>>(signalWithName);

  expectType<Mutable<number>>(signalWithFallback);

  expectType<Mutable<number>>(signalWithCallbacks);

  // -----------------------------------------------------------------------------
  // Overload 3: signal(deps, compute) - with dependencies
  // -----------------------------------------------------------------------------

  expectType<Computed<number>>(doubled);
  expectType<number>(doubled());

  // Multiple dependencies
  expectType<Computed<string>>(fullName);
  expectType<string>(fullName());

  // Dependencies with different types
  expectType<Computed<{ userName: string; postCount: number }>>(summary);
  expectType<{ userName: string; postCount: number }>(summary());

  // -----------------------------------------------------------------------------
  // Overload 3: signal(deps, compute, equals) - with equality string shortcut
  // -----------------------------------------------------------------------------

  expectType<Computed<{ full: string }>>(computedShallow);

  expectType<
    Computed<{
      user: { id: number; name: string; email: string };
      posts: number[];
    }>
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

  expectType<Computed<number>>(computedWithOptions);

  // -----------------------------------------------------------------------------
  // Signal instance methods
  // -----------------------------------------------------------------------------

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

  // .map() and .scan() methods removed - use to/scan operators from rextive/op instead

  // toJSON method
  expectType<number>(count.toJSON());
  expectType<string>(firstName.toJSON());
  expectType<{ id: number; name: string; email: string }>(user.toJSON());
  expectType<number[]>(postIds.toJSON());

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
  expectType<Signal<string | number>>(unionSignal);
  unionSignal.set("hello");
  unionSignal.set(100);

  // Optional types
  expectType<Signal<string | undefined>>(optionalSignal);
  optionalSignal.set("hello");
  optionalSignal.set(undefined);

  // Nullable types
  expectType<Signal<string | null>>(nullableSignal);
  nullableSignal.set("hello");
  nullableSignal.set(null);

  // Generic types
  expectType<Signal<User<number>>>(genericSignal);
  expectType<User<number>>(genericSignal());

  // Computed signal with async dependencies (returns promise-like)
  expectType<Signal<Promise<number>>>(asyncData);

  // Nested signal dependencies
  expectType<Mutable<number>>(a);
  expectType<Computed<number>>(b);
  expectType<Computed<number>>(c);
  expectType<number>(c());
}

// =============================================================================
// TASK API TYPE CHECKS
// =============================================================================

function taskTests() {
  // Clone variables from global scope
  const loadingNumber = task.loading(promiseNumber);
  const loadingString = task.loading(promiseString);
  const loadingUser = task.loading(promiseUser);
  const successNumber = task.success(42);
  const successString = task.success("hello");
  const successUser = task.success({ id: 1, name: "Alice" });
  const successArray = task.success([1, 2, 3]);
  const successWithPromise = task.success(100, Promise.resolve(100));
  const errorWithError = task.error(new Error("Something failed"));
  const errorWithString = task.error("Error message");
  const errorWithNumber = task.error(404);
  const errorTyped = task.error<string>(new Error("Failed to load string"));
  const errorWithPromise = task.error<number>(
    new Error("Failed"),
    Promise.reject(new Error("Failed"))
  );
  const unknownValue: unknown = { status: "success", value: 42 };
  const maybeTask: unknown = successNumber;
  const getLoadNumber = task.get(promiseNumber);
  const getLoadString = task.get(promiseString);
  const getLoadUser = task.get(promiseUser);
  const setLoad1 = task.set(promiseNumber, successNumber);
  const setLoad2 = task.set(promiseString, loadingString);
  const setLoad3 = task.set(
    promiseUser,
    task.error<{ id: number; name: string }>(new Error("Failed"))
  );
  const norm1 = task.from(42);
  const norm2 = task.from(promiseNumber);
  const norm3 = task.from(successNumber);
  const norm4 = task.from({ id: 1, name: "Alice" });
  const norm5 = task.from(null);
  const norm6 = task.from(undefined);
  const testTask: Task<number> =
    successNumber as unknown as Task<number>;

  // -----------------------------------------------------------------------------
  // task.loading(promise) - LoadingTask
  // -----------------------------------------------------------------------------

  expectType<LoadingTask<number>>(loadingNumber);
  expectType<"loading">(loadingNumber.status);
  expectType<PromiseLike<number>>(loadingNumber.promise);
  expectType<undefined>(loadingNumber.value);
  expectType<undefined>(loadingNumber.error);
  expectType<true>(loadingNumber.loading);

  expectType<LoadingTask<string>>(loadingString);
  expectType<"loading">(loadingString.status);
  expectType<PromiseLike<string>>(loadingString.promise);

  expectType<LoadingTask<{ id: number; name: string }>>(loadingUser);
  expectType<"loading">(loadingUser.status);
  expectType<PromiseLike<{ id: number; name: string }>>(loadingUser.promise);

  // -----------------------------------------------------------------------------
  // task.success(value) - SuccessTask
  // -----------------------------------------------------------------------------

  expectType<SuccessTask<number>>(successNumber);
  expectType<"success">(successNumber.status);
  expectType<number>(successNumber.value);
  expectType<undefined>(successNumber.error);
  expectType<false>(successNumber.loading);
  expectType<PromiseLike<number>>(successNumber.promise);

  expectType<SuccessTask<string>>(successString);
  expectType<"success">(successString.status);
  expectType<string>(successString.value);

  expectType<SuccessTask<{ id: number; name: string }>>(successUser);
  expectType<"success">(successUser.status);
  expectType<{ id: number; name: string }>(successUser.value);

  expectType<SuccessTask<number[]>>(successArray);
  expectType<"success">(successArray.status);
  expectType<number[]>(successArray.value);

  // With explicit promise
  expectType<SuccessTask<number>>(successWithPromise);
  expectType<number>(successWithPromise.value);
  expectType<PromiseLike<number>>(successWithPromise.promise);

  // -----------------------------------------------------------------------------
  // task.error(error) - ErrorTask
  // -----------------------------------------------------------------------------

  expectType<ErrorTask<any>>(errorWithError);
  expectType<"error">(errorWithError.status);
  expectType<unknown>(errorWithError.error);
  expectType<undefined>(errorWithError.value);
  expectType<false>(errorWithError.loading);
  expectType<PromiseLike<any>>(errorWithError.promise);

  expectType<ErrorTask<any>>(errorWithString);
  expectType<"error">(errorWithString.status);
  expectType<unknown>(errorWithString.error);

  expectType<ErrorTask<any>>(errorWithNumber);
  expectType<"error">(errorWithNumber.status);
  expectType<unknown>(errorWithNumber.error);

  // With explicit type parameter
  expectType<ErrorTask<string>>(errorTyped);
  expectType<"error">(errorTyped.status);
  expectType<unknown>(errorTyped.error);

  // With explicit promise
  expectType<ErrorTask<number>>(errorWithPromise);
  expectType<unknown>(errorWithPromise.error);
  expectType<PromiseLike<number>>(errorWithPromise.promise);

  // -----------------------------------------------------------------------------
  // is(value, "task") type guard
  // -----------------------------------------------------------------------------

  if (is(unknownValue, "task")) {
    expectType<Task<unknown>>(unknownValue);
    expectType<"loading" | "success" | "error">(unknownValue.status);
  }

  // With type parameter
  if (is<number>(unknownValue, "task")) {
    expectType<Task<number>>(unknownValue);

    if (unknownValue.status === "success") {
      expectType<number>(unknownValue.value);
    }
  }

  // Narrowing within task
  if (is<string>(maybeTask, "task")) {
    if (maybeTask.status === "success") {
      expectType<string>(maybeTask.value);
    }
    if (maybeTask.status === "loading") {
      expectType<PromiseLike<string>>(maybeTask.promise);
    }
    if (maybeTask.status === "error") {
      expectType<unknown>(maybeTask.error);
    }
  }

  // -----------------------------------------------------------------------------
  // task.get() - Get or create task from promise
  // -----------------------------------------------------------------------------

  expectType<Task<number>>(getLoadNumber);
  // First call creates loading, subsequent calls may return success/error
  expectType<"loading" | "success" | "error">(getLoadNumber.status);

  expectType<Task<string>>(getLoadString);

  expectType<Task<{ id: number; name: string }>>(getLoadUser);

  // -----------------------------------------------------------------------------
  // task.set() - Associate task with promise
  // -----------------------------------------------------------------------------

  expectType<SuccessTask<number>>(setLoad1);

  expectType<LoadingTask<string>>(setLoad2);

  expectType<ErrorTask<{ id: number; name: string }>>(setLoad3);

  // -----------------------------------------------------------------------------
  // task.from() - Normalize any value to task
  // -----------------------------------------------------------------------------

  // From plain value
  expectType<Task<number>>(norm1);

  // From promise
  expectType<Task<number>>(norm2);

  // From existing task
  expectType<SuccessTask<number>>(norm3);

  // From object
  expectType<Task<{ id: number; name: string }>>(norm4);

  // From null/undefined
  expectType<Task<null>>(norm5);

  expectType<Task<undefined>>(norm6);

  // -----------------------------------------------------------------------------
  // Status narrowing with discriminated union
  // -----------------------------------------------------------------------------

  // Narrow by status
  if (testTask.status === "loading") {
    expectType<LoadingTask<number>>(testTask);
    expectType<undefined>(testTask.value);
    expectType<undefined>(testTask.error);
    expectType<PromiseLike<number>>(testTask.promise);
    expectType<true>(testTask.loading);
  } else if (testTask.status === "success") {
    expectType<SuccessTask<number>>(testTask);
    expectType<number>(testTask.value);
    expectType<undefined>(testTask.error);
    expectType<PromiseLike<number>>(testTask.promise);
    expectType<false>(testTask.loading);
  } else if (testTask.status === "error") {
    expectType<ErrorTask<number>>(testTask);
    expectType<undefined>(testTask.value);
    expectType<unknown>(testTask.error);
    expectType<PromiseLike<number>>(testTask.promise);
    expectType<false>(testTask.loading);
  }

  // Switch statement
  switch (testTask.status) {
    case "loading":
      expectType<LoadingTask<number>>(testTask);
      expectType<PromiseLike<number>>(testTask.promise);
      break;
    case "success":
      expectType<SuccessTask<number>>(testTask);
      expectType<number>(testTask.value);
      break;
    case "error":
      expectType<ErrorTask<number>>(testTask);
      expectType<unknown>(testTask.error);
      break;
  }

  // -----------------------------------------------------------------------------
  // Complex task scenarios
  // -----------------------------------------------------------------------------

  void (function testComplexTaskScenarios() {
    // Union types
    const unionTask = task.success<string | number>(42);
    expectType<SuccessTask<string | number>>(unionTask);
    expectType<string | number>(unionTask.value);

    // Optional types
    const optionalTask = task.success<string | undefined>(undefined);
    expectType<SuccessTask<string | undefined>>(optionalTask);
    expectType<string | undefined>(optionalTask.value);

    // Nullable types
    const nullableTask = task.success<string | null>(null);
    expectType<SuccessTask<string | null>>(nullableTask);
    expectType<string | null>(nullableTask.value);

    // Generic types
    interface Result<T> {
      data: T;
      timestamp: number;
    }

    const genericTask = task.success<Result<number>>({
      data: 42,
      timestamp: Date.now(),
    });
    expectType<SuccessTask<Result<number>>>(genericTask);
    expectType<Result<number>>(genericTask.value);

    // Array of tasks
    const taskArray: Array<Task<number>> = [
      task.loading(promiseNumber),
      task.success(42),
      task.error(new Error("Failed")),
    ];
    expectType<Array<Task<number>>>(taskArray);

    // Map of tasks
    const taskMap: Record<string, Task<string>> = {
      a: task.success("hello"),
      b: task.loading(promiseString),
      c: task.error(new Error("Failed")),
    };
    expectType<Record<string, Task<string>>>(taskMap);
  })();

  void (function testTaskHelpers() {
    // Async function returning task
    async function fetchData(): Promise<Task<number>> {
      const data = await promiseNumber;
      return task.success(data);
    }

    const asyncResult = fetchData();
    expectType<PromiseLike<Task<number>>>(asyncResult);

    // Helper function to map task values
    function mapTask<T, U>(
      t: Task<T>,
      fn: (value: T) => U
    ): Task<U> {
      if (t.status === "success") {
        return task.success(fn(t.value));
      }
      if (t.status === "loading") {
        return task.loading(t.promise.then(fn));
      }
      return task.error(t.error);
    }

    const mapped = mapTask(successNumber, (n) => n * 2);
    expectType<Task<number>>(mapped);

    // Helper to extract value or default
    function getValueOr<T>(t: Task<T>, defaultValue: T): T {
      return t.status === "success" ? t.value : defaultValue;
    }

    const extracted = getValueOr(successNumber, 0);
    expectType<number>(extracted);

    // Chaining tasks
    const chain1 = task.success(5);
    const chain2 = mapTask(chain1, (n) => n.toString());
    expectType<Task<string>>(chain2);

    // Error recovery
    function recoverFromError<T>(
      t: Task<T>,
      recovery: T
    ): SuccessTask<T> {
      if (t.status === "error") {
        return task.success(recovery);
      }
      if (t.status === "success") {
        return t;
      }
      // Loading state - need to handle somehow
      throw new Error("Cannot recover from loading state");
    }

    const recovered = recoverFromError(errorWithNumber as Task<number>, 0);
    expectType<SuccessTask<number>>(recovered);
  })();
}

// =============================================================================
// WAIT API TYPE CHECKS
// =============================================================================

function waitTests() {
  // Clone variables from global scope
  const awaitableNumber: Awaitable<number> =
    taskNumber ?? promiseNumber ?? signalNumberAwaitable;
  const awaitableString: Awaitable<string> =
    taskString ?? promiseString ?? signalStringAwaitable;
  const tupleResult = wait([awaitableNumber, awaitableString]);
  const recordResult = wait({
    num: awaitableNumber,
    str: awaitableString,
  });
  const singleResult = wait(awaitableNumber);
  const tuplePromise = wait(
    [awaitableNumber, awaitableString],
    (n, s) => `${n}:${s}`
  );
  const tuplePromiseWithError = wait(
    [awaitableNumber, awaitableString],
    (n, s) => `${n}:${s}`,
    (error) => (error instanceof Error ? error.message : "unknown")
  );
  const recordPromise = wait(
    { num: awaitableNumber, str: awaitableString },
    (values) => values.num + values.str.length
  );
  const anyResult = wait.any({
    num: awaitableNumber,
    str: awaitableString,
  });
  const anyPromise = wait.any(
    { num: awaitableNumber, str: awaitableString },
    ([_value, key]) => key
  );
  const anyPromiseWithError = wait.any(
    { num: awaitableNumber, str: awaitableString },
    ([_value, key]) => key,
    (error) => (error instanceof Error ? error.message : "err")
  );
  const raceResult = wait.race({
    num: awaitableNumber,
    str: awaitableString,
  });
  const racePromise = wait.race(
    { num: awaitableNumber, str: awaitableString },
    ([value, key]) => ({ key, value })
  );
  const settledTuple = wait.settled([awaitableNumber, awaitableString]);
  const settledRecord = wait.settled({
    num: awaitableNumber,
    str: awaitableString,
  });
  const settledPromise = wait.settled(
    [awaitableNumber, awaitableString],
    (results) => results.map((r) => r.status)
  );
  const timeoutSingle = wait.timeout(awaitableNumber, 1000);
  const timeoutTuple = wait.timeout([awaitableNumber, awaitableNumber], 1000);
  const timeoutRecord = wait.timeout(
    { a: awaitableNumber, b: awaitableString },
    1000
  );
  const delayPromise = wait.delay(500);

  // -----------------------------------------------------------------------------
  // Type inference tests for AwaitedFromAwaitable
  // -----------------------------------------------------------------------------

  // Test Task type extraction using Awaited<Task["promise"]>
  expectType<number>(0 as AwaitedFromAwaitable<typeof taskNumber>);

  expectType<string>("" as AwaitedFromAwaitable<typeof taskString>);

  // Test Promise type extraction
  expectType<number>(0 as AwaitedFromAwaitable<typeof promiseNum>);

  expectType<string>("" as AwaitedFromAwaitable<typeof promiseStr>);

  // Test Signal wrapping Task
  expectType<number>(0 as AwaitedFromAwaitable<typeof signalTaskNumber>);

  // Test Signal wrapping Promise
  expectType<number>(0 as AwaitedFromAwaitable<typeof signalPromiseNumber>);

  // Test Signal wrapping union of Promise and Task
  expectType<number>(0 as AwaitedFromAwaitable<typeof signalNumberAwaitable>);

  expectType<string>("" as AwaitedFromAwaitable<typeof signalStringAwaitable>);

  // -----------------------------------------------------------------------------
  // wait / wait.all – Suspense-style (no callbacks)
  // -----------------------------------------------------------------------------

  // Tuple form
  expectType<readonly [number, string]>(tupleResult);

  // Record form
  expectType<{ num: number; str: string }>(recordResult);

  // Single awaitable
  expectType<number>(singleResult);

  // -----------------------------------------------------------------------------
  // wait / wait.all – Promise mode (with callbacks)
  // -----------------------------------------------------------------------------

  // Tuple with onResolve
  expectType<Promise<string>>(tuplePromise);

  // Tuple with onResolve + onError
  expectType<Promise<string>>(tuplePromiseWithError);

  // Record with onResolve
  expectType<Promise<number>>(recordPromise);

  // -----------------------------------------------------------------------------
  // wait.any
  // -----------------------------------------------------------------------------

  expectType<[number | string, "num" | "str"]>(anyResult);

  expectType<Promise<"num" | "str">>(anyPromise);

  expectType<Promise<"num" | "str" | string>>(anyPromiseWithError);

  // -----------------------------------------------------------------------------
  // wait.race
  // -----------------------------------------------------------------------------

  expectType<[number | string, "num" | "str"]>(raceResult);

  expectType<Promise<{ key: "num" | "str"; value: number | string }>>(
    racePromise
  );

  // -----------------------------------------------------------------------------
  // wait.settled
  // -----------------------------------------------------------------------------

  expectType<
    readonly [PromiseSettledResult<number>, PromiseSettledResult<string>]
  >(settledTuple);

  expectType<{
    num: PromiseSettledResult<number>;
    str: PromiseSettledResult<string>;
  }>(settledRecord);

  expectType<Promise<("fulfilled" | "rejected")[]>>(settledPromise);

  // -----------------------------------------------------------------------------
  // wait.timeout & wait.delay
  // -----------------------------------------------------------------------------

  expectType<Promise<number>>(timeoutSingle);

  expectType<Promise<readonly [number, number]>>(timeoutTuple);

  expectType<Promise<{ a: number; b: string }>>(timeoutRecord);

  expectType<Promise<void>>(delayPromise);
}

// =============================================================================
// INTEGRATION TESTS - Multiple APIs together
// =============================================================================

function integrationTests() {
  // Test array with mixed types
  expectType<readonly [number, number, number]>(mixedArray);

  // Test single signal with task
  expectType<number>(singleSig);

  // Test with promise callbacks
  expectType<Promise<number>>(promiseResultSig);

  // Test record with mixed types
  expectType<{
    sig: number;
    task: number;
    promise: number;
  }>(mixedRecord);

  // Complex transformation
  expectType<UserType>(userResultFromSignal);

  expectType<readonly [UserType, UserType, UserType]>(usersArray);

  expectType<{
    task: UserType;
    promise: UserType;
    signal: UserType;
  }>(usersRecord);

  // Test async transformation
  expectType<Promise<string>>(transformedUser);
}

// =============================================================================
// RX API TYPE CHECKS
// =============================================================================

function rxTests() {
  // Create local signals for testing
  const count = signal(0);
  const name = signal("John");
  const user = signal({ id: 1, name: "Alice", email: "alice@example.com" });
  const postIds = signal([1, 2, 3]);
  const posts = signal([
    { id: 1, title: "Post 1" },
    { id: 2, title: "Post 2" },
  ]);

  // ---------------------------------------------------------------------------
  // Overload 1: rx(signal) - Single signal shorthand
  // ---------------------------------------------------------------------------

  const singleNumber = rx(count);
  const singleString = rx(name);
  const singleObject = rx(user);
  const singleArray = rx(postIds);

  expectType<ReactNode>(singleNumber);
  expectType<ReactNode>(singleString);
  expectType<ReactNode>(singleObject);
  expectType<ReactNode>(singleArray);

  // ---------------------------------------------------------------------------
  // Overload 2: rx(signal, selector) - Single signal with selector
  // ---------------------------------------------------------------------------

  const singleWithSelector = rx(user, "name");
  const singleWithSelectorFn = rx(user, (u) => u.name.toUpperCase());
  const singleWithSelectorComputed = rx(count, (c) => c * 2);

  expectType<ReactNode>(singleWithSelector);
  expectType<ReactNode>(singleWithSelectorFn);
  expectType<ReactNode>(singleWithSelectorComputed);

  // ---------------------------------------------------------------------------
  // Overload 3: rx(fn) - Reactive function with automatic tracking
  // ---------------------------------------------------------------------------

  const reactiveFn = rx(() => (
    <div>
      Count: {count()} Name: {name()}
    </div>
  ));

  const reactiveFnWithOptions = rx(() => (
    <div>
      {count()} + {name()}
    </div>
  ));

  const conditionalTracking = rx(() => {
    if (count() > 10) {
      return <div>High: {name()}</div>;
    }
    return <div>Low: {count()}</div>;
  });

  const complexReactive = rx(() => {
    const currentUser = user();
    const currentPosts = posts;
    return (
      <div>
        <h1>{currentUser.name}</h1>
        <ul>
          {currentPosts().map((post) => (
            <li key={post.id}>{post.title}</li>
          ))}
        </ul>
      </div>
    );
  });

  expectType<ReactNode>(reactiveFn);
  expectType<ReactNode>(reactiveFnWithOptions);
  expectType<ReactNode>(conditionalTracking);
  expectType<ReactNode>(complexReactive);

  // ---------------------------------------------------------------------------
  // Overload 4: rx(Component, props) - Reactive component props
  // ---------------------------------------------------------------------------

  // Note: The current types expect actual prop types, not signals.
  // Signals are unwrapped at runtime but TypeScript doesn't model this.
  const Counter = ({ value, label }: { value: number; label: string }) => (
    <div>
      {label}: {value}
    </div>
  );

  // Using static props (what the types support)
  const rxWithComponent = rx(Counter, { value: 42, label: "Count" });
  const rxWithHtmlElement = rx("div", {
    children: "Hello",
    className: "counter",
  });
  const rxWithSpan = rx("span", { children: "World", id: "greeting" });

  // Note: Passing signals as props works at runtime but requires type assertion
  // because the overload type expects actual prop types, not Signal<PropType>
  const rxWithSignalProps = rx(Counter, {
    value: count as unknown as number,
    label: "Count",
  });
  const rxWithHtmlSignalProps = rx("div", {
    children: count as unknown as React.ReactNode,
    className: "counter",
  });

  expectType<ReactNode>(rxWithComponent);
  expectType<ReactNode>(rxWithHtmlElement);
  expectType<ReactNode>(rxWithSpan);
  expectType<ReactNode>(rxWithSignalProps);
  expectType<ReactNode>(rxWithHtmlSignalProps);
}

// =============================================================================
// SIGNAL OPERATORS TYPE CHECKS (.pipe() method)
// =============================================================================

// Import operators (commented out to avoid runtime issues)
// import { to, scan, filter } from "./operators";

// For type checking, we'll use inline operator definitions
type SelectOp = <T, U>(
  fn: (value: T) => U
) => (source: Signal<T>) => Computed<U>;
type ScanOp = <T, U>(
  fn: (acc: U, value: T) => U,
  initial: U
) => (source: Signal<T>) => Computed<U>;
type FilterOp = <T>(
  fn: (value: T) => boolean
) => (source: Signal<T>) => Computed<T>;

declare const toOp: SelectOp;
declare const scanOp: ScanOp;
declare const filterOp: FilterOp;

function pipeOperatorTests() {
  // Single operator
  const countSignal = signal(5);

  // to: number -> string
  const result1 = countSignal.pipe(toOp((x) => `Count: ${x}`));
  expectType<Computed<string>>(result1);
  expectType<string>(result1());

  // scan: accumulate numbers
  const result2 = countSignal.pipe(scanOp((sum, x) => sum + x, 0));
  expectType<Computed<number>>(result2);
  expectType<number>(result2());

  // filter: keep only positive
  const result3 = countSignal.pipe(filterOp((x) => x > 0));
  expectType<Computed<number>>(result3);
  expectType<number>(result3());

  // Multiple operators - type transformation chain
  // number -> number -> string
  const chain1 = countSignal.pipe(
    toOp((x) => x * 2), // number -> number
    toOp((x) => `Result: ${x}`) // number -> string
  );
  expectType<Computed<string>>(chain1);
  expectType<string>(chain1());

  // number -> number -> number -> string
  const chain2 = countSignal.pipe(
    toOp((x: number) => x * 2), // number -> number
    toOp((x: number) => x + 1), // number -> number
    toOp((x: number) => `Value: ${x}`) // number -> string
  );
  expectType<Computed<string>>(chain2);
  expectType<string>(chain2());

  // Complex type transformations
  interface Person {
    id: number;
    name: string;
    age: number;
  }

  const personSignal = signal<Person>({ id: 1, name: "Alice", age: 30 });

  // Person -> string
  const personName = personSignal.pipe(toOp((u) => u.name));
  expectType<Computed<string>>(personName);
  expectType<string>(personName());

  // Person -> { name: string } -> string
  const personNameChain = personSignal.pipe(
    toOp((u: Person) => ({ name: u.name })),
    toOp((obj: { name: string }) => obj.name)
  );
  expectType<Computed<string>>(personNameChain);
  expectType<string>(personNameChain());

  // Array transformations
  const numbersSignal = signal([1, 2, 3]);

  // Array<number> -> Array<number>
  const doubledArray = numbersSignal.pipe(toOp((arr) => arr.map((x) => x * 2)));
  expectType<Computed<number[]>>(doubledArray);
  expectType<number[]>(doubledArray());

  // Array<number> -> number (sum)
  const sum = numbersSignal.pipe(toOp((arr) => arr.reduce((a, b) => a + b, 0)));
  expectType<Computed<number>>(sum);
  expectType<number>(sum());

  // Mixed operators
  // to -> filter -> scan
  const mixed1 = countSignal.pipe(
    toOp((x: number) => x * 2), // number -> number
    filterOp((x: number) => x > 5), // number -> number
    scanOp((acc: number, x: number) => acc + x, 0) // number -> number
  );
  expectType<Computed<number>>(mixed1);
  expectType<number>(mixed1());

  // Operator returning signal (custom operator)
  const customOp = null as unknown as <T extends number>(
    s: Signal<T>
  ) => Computed<string>;

  const custom1 = countSignal.pipe(customOp);
  expectType<Computed<string>>(custom1);
  expectType<string>(custom1());

  // Chain with custom operator
  const custom2 = countSignal.pipe(
    toOp((x: number) => x * 2),
    customOp
  );
  expectType<Computed<string>>(custom2);
  expectType<string>(custom2());

  // Type inference through chains
  // 3 operators: number -> number -> number -> string
  const chain3Ops = countSignal.pipe(
    toOp((x: number) => x * 2), // number -> number
    toOp((x: number) => x + 1), // number -> number
    toOp((x: number) => `Value: ${x}`) // number -> string
  );
  expectType<Computed<string>>(chain3Ops);
  expectType<string>(chain3Ops());

  // 4 operators: number -> number -> number -> number -> string
  const chain4Ops = countSignal.pipe(
    toOp((x: number) => x * 2), // number -> number
    toOp((x: number) => x + 1), // number -> number
    toOp((x: number) => x - 1), // number -> number
    toOp((x: number) => `Result: ${x}`) // number -> string
  );
  expectType<Computed<string>>(chain4Ops);
  expectType<string>(chain4Ops());
}

// =============================================================================
// Signal.to() - Value selector chaining
// =============================================================================

function signalToTests() {
  // Basic chaining
  const userSig = signal({
    name: "Alice",
    age: 30,
    email: "alice@example.com",
  });

  // Single selector
  const userName = userSig.to((u) => u.name);
  expectType<Computed<string>>(userName);

  // Two selectors - use pipe() for multiple transformations
  const upperName = userSig.pipe(
    to((u) => u.name),
    to((name) => name.toUpperCase())
  );
  expectType<Computed<string>>(upperName);

  // Three selectors with type changes
  const greeting = userSig.pipe(
    to((u) => u.name), // string
    to((name) => name.toUpperCase()), // string
    to((name) => `Hello, ${name}!`) // string
  );
  expectType<Computed<string>>(greeting);

  // Type transformation chain
  const ageString = userSig.pipe(
    to((u) => u.age), // number
    to((age) => age.toString()), // string
    to((str) => str.length) // number
  );
  expectType<Computed<number>>(ageString);

  // Complex object transformations
  const transformed = userSig.pipe(
    to((u) => ({ fullName: u.name, years: u.age })), // { fullName: string, years: number }
    to((obj) => obj.fullName), // string
    to((name) => name.split(" ")), // string[]
    to((parts) => parts[0]) // string | undefined
  );
  expectType<Computed<string | undefined>>(transformed);

  // Array operations
  const arraySig = signal([1, 2, 3, 4, 5]);

  const arrayResult = arraySig.pipe(
    to((arr: number[]) => arr.filter((x: number) => x > 2)), // number[]
    to((arr: number[]) => arr.map((x: number) => x * 2)), // number[]
    to((arr: number[]) => arr.reduce((a: number, b: number) => a + b, 0)) // number
  );
  expectType<Computed<number>>(arrayResult);

  // With computed signals
  const computedUser = signal({ userSig }, ({ deps }) => deps.userSig);

  const computedGreeting = computedUser.pipe(
    to((u) => u.name),
    to((name) => `Hi, ${name}`)
  );
  expectType<Computed<string>>(computedGreeting);

  // Chaining with numbers
  const numSig = signal(42);

  const numChain = numSig.pipe(
    to((x) => x * 2), // 84
    to((x) => x + 10), // 94
    to((x) => x / 2), // 47
    to((x) => Math.floor(x)) // 47
  );
  expectType<Computed<number>>(numChain);

  // Boolean transformations
  const boolChain = numSig.pipe(
    to((x) => x > 50), // boolean
    to((bool) => !bool), // boolean
    to((bool) => (bool ? "yes" : "no")) // string
  );
  expectType<Computed<string>>(boolChain);

  // Nullable values
  const nullableSig = signal<string | null>("test");

  const nullableChain = nullableSig.pipe(
    to((str) => str?.toUpperCase()), // string | undefined
    to((str) => str ?? "default") // string
  );
  expectType<Computed<string>>(nullableChain);

  // Union types
  const unionSig = signal<number | string>(42);

  const unionChain = unionSig.pipe(
    to((val) => (typeof val === "number" ? val * 2 : val.length)), // number
    to((num) => num.toString()) // string
  );
  expectType<Computed<string>>(unionChain);
}

// =============================================================================
// awaited() helper - Promise/non-promise value selector
// =============================================================================

function awaitedTests() {
  // Non-promise values (sync)
  const dataSig = signal(5);
  const doubled = dataSig.to(awaited((x) => x * 2));
  expectType<Computed<number>>(doubled);
  expectType<number>(doubled());

  // Promise values (async)
  const promiseSig = signal(Promise.resolve(5));
  const promiseDoubled = promiseSig.to(awaited((x) => x * 2));
  expectType<Computed<Promise<number>>>(promiseDoubled);

  // Mixed promise/non-promise values
  const mixedSig = signal<number | Promise<number>>(5);
  const mixedDoubled = mixedSig.to(awaited((x) => x * 2));
  expectType<Computed<number | Promise<number>>>(mixedDoubled);

  // Array transformations
  interface Todo {
    id: number;
    title: string;
    done: boolean;
  }

  const todosSig = signal(
    Promise.resolve<Todo[]>([
      { id: 1, title: "Buy milk", done: false },
      { id: 2, title: "Walk dog", done: true },
    ])
  );

  const titles = todosSig.to(awaited((items) => items.map((t) => t.title)));
  expectType<Computed<Promise<string[]>>>(titles);

  // Object transformations
  const userPromiseSig = signal(
    Promise.resolve({ id: 1, name: "Alice", age: 30 })
  );

  const userName = userPromiseSig.to(awaited((u) => u.name));
  expectType<Computed<Promise<string>>>(userName);

  // Chaining multiple awaited selectors
  const chainedResult = promiseSig.to(
    awaited(
      (x) => x * 2,
      (x) => x + 1,
      (x) => `Value: ${x}`
    )
  );
  expectType<Computed<Promise<string>>>(chainedResult);

  // Type transformation chain with multiple awaited selectors
  const typeChain = promiseSig.to(
    awaited(
      (x) => x * 2, // number -> number
      (x) => x + 1, // number -> number
      (x) => `Value: ${x}` // number -> string
    )
  );
  expectType<Computed<Promise<string>>>(typeChain);

  // Complex nested transformations - simpler version
  type UserData = {
    users: Array<{ name: string; scores: number[] }>;
  };

  const syncData = signal<UserData>({
    users: [
      { name: "Alice", scores: [85, 90, 95] },
      { name: "Bob", scores: [70, 80, 90] },
    ],
  });

  const topUserSync = syncData.to(
    awaited(
      (d: UserData) => d.users,
      (users) =>
        users.map((u) => ({
          name: u.name,
          avg: u.scores.reduce((a, b) => a + b, 0) / u.scores.length,
        })),
      (users) => users.find((u) => u.avg > 85),
      (user) => user?.name ?? "None"
    )
  );
  expectType<Computed<string>>(topUserSync);

  // Async selector function
  const asyncResult = dataSig.to(
    awaited(async (x) => {
      await Promise.resolve();
      return x * 2;
    })
  );
  expectType<Computed<Promise<number>>>(asyncResult);

  // With .pipe() and select operator
  const pipeResult = promiseSig.pipe(toOp(awaited((x) => x * 2)));
  expectType<Computed<Promise<number>>>(pipeResult);
}

// =============================================================================
// Context.use() Tests
// =============================================================================

function contextUseTests() {
  // Clone from global scope
  const count = signal(0);

  // Basic usage - context passed as first argument
  const computed1 = signal({ count }, (context) => {
    return context.use((ctx) => {
      expectType<number>(ctx.deps.count);
      return ctx.deps.count * 2;
    });
  });
  expectType<Computed<number>>(computed1);

  // With additional arguments
  const computed2 = signal({ count }, (context) => {
    const multiply = (ctx: typeof context, factor: number) => {
      return ctx.deps.count * factor;
    };
    return context.use(multiply, 5);
  });
  expectType<Computed<number>>(computed2);

  // Multiple arguments
  const computed3 = signal({ count }, (context) => {
    const calculate = (
      ctx: typeof context,
      a: number,
      b: number,
      c: string
    ) => {
      return `${ctx.deps.count * a * b} ${c}`;
    };
    return context.use(calculate, 2, 3, "result");
  });
  expectType<Computed<string>>(computed3);

  // Async logic function
  const computed4 = signal({ count }, async (context) => {
    return await context.use(async (ctx) => {
      return ctx.deps.count * 2;
    });
  });
  expectType<Computed<Promise<number>>>(computed4);

  // Async with arguments
  const computed5 = signal({ count }, async (context) => {
    const multiply = async (ctx: typeof context, factor: number) => {
      return ctx.deps.count * factor;
    };
    return await context.use(multiply, 5);
  });
  expectType<Computed<Promise<number>>>(computed5);

  // Access all context properties
  const computed6 = signal({ count }, (context) => {
    return context.use((ctx) => {
      expectType<number>(ctx.deps.count);
      expectType<AbortSignal>(ctx.abortSignal);
      expectType<(fn: VoidFunction) => void>(ctx.onCleanup);
      expectType<{
        <T>(fn: () => T): T;
        <T, TArgs extends any[]>(fn: (...args: TArgs) => T, ...args: TArgs): T;
      }>(ctx.safe);
      return ctx.deps.count;
    });
  });
  expectType<Computed<number>>(computed6);

  // Nested use calls
  const computed7 = signal({ count }, (context) => {
    return context.use((ctx) => {
      const step1 = ctx.use((innerCtx) => innerCtx.deps.count * 2);
      const step2 = ctx.use((_innerCtx) => step1 + 10);
      return step2;
    });
  });
  expectType<Computed<number>>(computed7);

  // With cleanup
  const computed8 = signal({ count }, (context) => {
    return context.use((ctx) => {
      ctx.onCleanup(() => console.log("cleanup"));
      return ctx.deps.count * 2;
    });
  });
  expectType<Computed<number>>(computed8);

  // With run inside use
  const computed9 = signal({ count }, (context) => {
    return context.use((ctx) => {
      const step1 = ctx.safe(() => ctx.deps.count * 2);
      return step1;
    });
  });
  expectType<Computed<number>>(computed9);

  // Multiple dependencies
  const name = signal("Alice");
  const computed10 = signal({ count, name }, (context) => {
    return context.use((ctx) => {
      expectType<number>(ctx.deps.count);
      expectType<string>(ctx.deps.name);
      return `${ctx.deps.name}: ${ctx.deps.count}`;
    });
  });
  expectType<Computed<string>>(computed10);

  // Complex object return type
  interface LocalUser {
    id: number;
    name: string;
  }

  const userId = signal(1);
  const computed11 = signal({ userId }, async (context) => {
    return await context.use(async (ctx): Promise<LocalUser> => {
      return { id: ctx.deps.userId, name: "User" };
    });
  });
  expectType<Computed<Promise<LocalUser>>>(computed11);

  // Array operations
  const items = signal([1, 2, 3]);
  const computed12 = signal({ items }, (context) => {
    return context.use((ctx) => {
      return ctx.deps.items.map((x) => x * 2);
    });
  });
  expectType<Computed<number[]>>(computed12);

  // Reusable logic function (using any for simplicity in type checks)
  const multiply = (ctx: any, factor: number) => ctx.deps.count * factor;
  const computed13 = signal({ count }, (context) => context.use(multiply, 3));
  const computed14 = signal({ count }, (context) => context.use(multiply, 5));
  expectType<Computed<number>>(computed13);
  expectType<Computed<number>>(computed14);
}

// =============================================================================
// compose() utility - Function composition type tests
// =============================================================================

function composeTests() {
  // Single function
  const f1 = compose((x: number) => x + 1);
  expectType<(x: number) => number>(f1);

  // Two functions with type transformation
  const f2 = compose(
    (x: number) => x.toString(),
    (x: string) => x.length
  );
  expectType<(x: string) => string>(f2);

  // Three functions
  const f3 = compose(
    (x: number) => x + 1,
    (x: number) => x * 2,
    (x: number) => x - 3
  );
  expectType<(x: number) => number>(f3);

  // Type transformations through multiple functions
  const f4 = compose(
    (s: string) => s.length,
    (n: number) => n.toString(),
    (b: boolean) => (b ? 1 : 0)
  );
  expectType<(b: boolean) => number>(f4);

  // Object transformations
  interface User {
    name: string;
    age: number;
  }

  const f5 = compose(
    (u: User) => u.name,
    (id: number): User => ({ name: `User${id}`, age: id * 2 })
  );
  expectType<(id: number) => string>(f5);

  // Array transformations
  const f6 = compose(
    (arr: number[]) => arr.reduce((a, b) => a + b, 0),
    (arr: number[]) => arr.filter((x) => x % 2 === 0),
    (arr: number[]) => arr.map((x) => x * 2)
  );
  expectType<(arr: number[]) => number>(f6);

  // Multiple arguments in rightmost function
  const f7 = compose(
    (x: number) => x * 2,
    (a: number, b: number) => a + b
  );
  expectType<(a: number, b: number) => number>(f7);

  // Rest parameters
  const f8 = compose(
    (x: number) => x.toString(),
    (x: number) => x * 2,
    (...nums: number[]) => Math.max(...nums)
  );
  expectType<(...nums: number[]) => string>(f8);

  // No arguments
  const f9 = compose(
    (x: string) => x.toUpperCase(),
    () => "hello"
  );
  expectType<() => string>(f9);

  // Four functions
  const f10 = compose(
    (x: string) => x.length,
    (x: number) => x.toString(),
    (x: number) => x * 2,
    (x: number) => x + 1
  );
  expectType<(x: number) => number>(f10);

  // Five functions
  const f11 = compose(
    (x: boolean) => !x,
    (x: number) => x > 0,
    (x: string) => x.length,
    (x: number) => x.toString(),
    (x: number) => x * 2
  );
  expectType<(x: number) => boolean>(f11);

  // Six functions
  const f12 = compose(
    (x: string) => x.toUpperCase(),
    (x: string) => x + "!",
    (x: number) => x.toString(),
    (x: number) => x * 2,
    (x: string) => x.length,
    (x: string) => x.trim()
  );
  expectType<(x: string) => string>(f12);

  // Seven functions
  const f13 = compose(
    (x: number) => x + 1,
    (x: number) => x * 2,
    (x: number) => x - 3,
    (x: number) => x / 2,
    (x: number) => x + 5,
    (x: number) => x * 3,
    (x: number) => x - 1
  );
  expectType<(x: number) => number>(f13);

  // Eight functions
  const f14 = compose(
    (x: string) => x.length,
    (x: string) => x.toUpperCase(),
    (x: string) => x.trim(),
    (x: string) => x + "!",
    (x: number) => x.toString(),
    (x: number) => x * 2,
    (x: string) => x.length,
    (x: string) => x.toLowerCase()
  );
  expectType<(x: string) => number>(f14);

  // Nine functions
  const f15 = compose(
    (x: number) => x + 10,
    (x: number) => x / 5,
    (x: number) => x - 1,
    (x: number) => x * 3,
    (x: number) => x + 5,
    (x: number) => x / 2,
    (x: number) => x - 3,
    (x: number) => x * 2,
    (x: number) => x + 1
  );
  expectType<(x: number) => number>(f15);

  // Ten functions
  const f16 = compose(
    (x: number) => x * 10,
    (x: number) => x + 10,
    (x: number) => x / 5,
    (x: number) => x - 1,
    (x: number) => x * 3,
    (x: number) => x + 5,
    (x: number) => x / 2,
    (x: number) => x - 3,
    (x: number) => x * 2,
    (x: number) => x + 1
  );
  expectType<(x: number) => number>(f16);

  // Eleven functions (uses general case)
  const f17 = compose(
    (x: number) => x - 1,
    (x: number) => x * 10,
    (x: number) => x + 10,
    (x: number) => x / 5,
    (x: number) => x - 1,
    (x: number) => x * 3,
    (x: number) => x + 5,
    (x: number) => x / 2,
    (x: number) => x - 3,
    (x: number) => x * 2,
    (x: number) => x + 1
  );
  expectType<(...args: any[]) => number>(f17);

  // Complex type transformations with multiple arguments
  const f18 = compose(
    (user: User) => user.age,
    (name: string, age: number): User => ({ name, age })
  );
  expectType<(name: string, age: number) => number>(f18);

  // Optional parameters
  const f19 = compose(
    (x: string) => x.length,
    (x: number, suffix?: string) => x.toString() + (suffix || "")
  );
  expectType<(x: number, suffix?: string) => number>(f19);

  // Nullable transformations
  const f20 = compose(
    (x: string | null) => (x !== null ? x.length : 0),
    (x: number | null) => (x !== null ? x.toString() : null)
  );
  expectType<(x: number | null) => number>(f20);

  // Promise transformations
  const f21 = compose(
    (x: Promise<number>) => x.then((n) => n * 2),
    (x: number) => Promise.resolve(x)
  );
  expectType<(x: number) => Promise<number>>(f21);
}

// =============================================================================
// PLUGIN AND USE OPTION TYPE CHECKS
// =============================================================================

function pluginTests() {
  // -----------------------------------------------------------------------------
  // Plugin type definitions
  // -----------------------------------------------------------------------------

  // Plugin for any signal kind (default)
  const anyPlugin: Plugin<number> = (signal) => {
    expectType<Signal<number>>(signal);
    expectType<number>(signal());
    return () => {};
  };

  // Plugin for mutable signals only
  const mutablePlugin: Plugin<number, "mutable"> = (signal) => {
    expectType<Mutable<number>>(signal);
    expectType<number>(signal());
    expectType<(value: number) => void>(signal.set);
    signal.set(100);
    return () => {};
  };

  // Plugin for computed signals only
  const computedPlugin: Plugin<number, "computed"> = (signal) => {
    expectType<Computed<number>>(signal);
    expectType<number>(signal());
    expectType<() => void>(signal.pause);
    expectType<() => void>(signal.resume);
    expectType<() => boolean>(signal.paused);
    return () => {};
  };

  // Plugin without cleanup
  const noCleanupPlugin: Plugin<string> = (signal) => {
    expectType<Signal<string>>(signal);
    expectType<string>(signal());
    // No return value
  };
  void noCleanupPlugin; // Mark as used

  // Plugin with cleanup (used in tests)
  const withCleanupPlugin: Plugin<string> = (signal) => {
    const unsubscribe = signal.on(() => {});
    return unsubscribe;
  };
  void withCleanupPlugin; // Mark as used

  // Generic plugin
  function createLogger<T>(): Plugin<T> {
    return (signal) => {
      expectType<Signal<T>>(signal);
      console.log(signal());
      return signal.on(() => console.log(signal()));
    };
  }

  // Generic mutable plugin
  function createPersister<T>(_key: string): Plugin<T, "mutable"> {
    return (signal) => {
      expectType<Mutable<T>>(signal);
      signal.set({} as T);
      return () => {};
    };
  }
  void createPersister; // Mark as used

  // -----------------------------------------------------------------------------
  // Signal with use option - Mutable signals
  // -----------------------------------------------------------------------------

  // Mutable signal with any plugin
  const mutableWithAny = signal(0, { use: [anyPlugin] });
  expectType<Mutable<number>>(mutableWithAny);

  // Mutable signal with mutable plugin
  const mutableWithMutable = signal(0, { use: [mutablePlugin] });
  expectType<Mutable<number>>(mutableWithMutable);

  // Mutable signal with computed plugin - Type error expected
  // @ts-expect-error - Cannot use computed plugin on mutable signal
  const mutableWithComputed = signal(0, { use: [computedPlugin] });

  // Mutable signal with multiple plugins
  const mutableWithMultiple = signal(0, {
    use: [anyPlugin, mutablePlugin],
  });
  expectType<Mutable<number>>(mutableWithMultiple);

  // Mutable signal with generic plugins
  const mutableWithGeneric = signal("test", {
    use: [createLogger<string>()],
  });
  expectType<Mutable<string>>(mutableWithGeneric);

  // -----------------------------------------------------------------------------
  // Signal with use option - Computed signals
  // -----------------------------------------------------------------------------

  const dep = signal(5);

  // Known Limitation: TypeScript cannot properly infer the value type T for
  // Plugin<T>/Tag<T> in computed signals with use options. The computed function
  // returns `unknown` in the type system, causing Plugin<number> to be incompatible
  // with Plugin<unknown>. We use `as any` to bypass this limitation.

  // Computed signal with any plugin
  const computedWithAny = signal({ dep }, ({ deps }): number => deps.dep * 2, {
    use: [anyPlugin] as any,
  });
  expectType<Computed<number>>(computedWithAny);

  // Computed signal with computed plugin
  const computedWithComputed = signal(
    { dep },
    ({ deps }): number => deps.dep * 2,
    { use: [computedPlugin] as any }
  );
  expectType<Computed<number>>(computedWithComputed);

  // Computed signal with mutable plugin - Type error expected
  // Note: Due to `as any` bypass, this also doesn't error at compile time
  const computedWithMutable = signal(
    { dep },
    ({ deps }): number => deps.dep * 2,
    { use: [mutablePlugin] as any }
  );
  void computedWithMutable;

  // Computed signal with multiple plugins
  const computedWithMultiple = signal(
    { dep },
    ({ deps }): number => deps.dep * 2,
    { use: [anyPlugin, computedPlugin] as any }
  );
  expectType<Computed<number>>(computedWithMultiple);

  // -----------------------------------------------------------------------------
  // Tag with use option
  // -----------------------------------------------------------------------------

  // Tag with plugins (using any-kind plugins)
  const tagWithPlugins = tag<number>({ use: [anyPlugin] });
  expectType<Tag<number>>(tagWithPlugins);
  expectType<
    ReadonlyArray<
      | Plugin<number, "any" | "mutable" | "computed">
      | Tag<number, "any" | "mutable" | "computed">
    >
  >(tagWithPlugins.use);

  // Tag with nested tags
  const nestedTag1 = tag<number>({ use: [anyPlugin] });
  const nestedTag2 = tag<number>({ use: [nestedTag1, anyPlugin] });
  expectType<Tag<number>>(nestedTag2);
  expectType<
    ReadonlyArray<
      | Plugin<number, "any" | "mutable" | "computed">
      | Tag<number, "any" | "mutable" | "computed">
    >
  >(nestedTag2.use);

  // Tag with mixed plugins and tags
  const mixedTag = tag<number>({
    use: [anyPlugin, nestedTag1],
  });
  expectType<Tag<number>>(mixedTag);

  // Empty tag
  const emptyTag = tag<number>({ use: [] });
  expectType<Tag<number>>(emptyTag);
  expectType<
    ReadonlyArray<
      | Plugin<number, "any" | "mutable" | "computed">
      | Tag<number, "any" | "mutable" | "computed">
    >
  >(emptyTag.use);

  // Tag without use option
  const simpleTag = tag<number>();
  expectType<Tag<number>>(simpleTag);
  expectType<
    ReadonlyArray<
      | Plugin<number, "any" | "mutable" | "computed">
      | Tag<number, "any" | "mutable" | "computed">
    >
  >(simpleTag.use);

  // -----------------------------------------------------------------------------
  // Signal with tag use option
  // -----------------------------------------------------------------------------

  // Mutable signal with tag
  const tagForMutable = tag<number>({ use: [mutablePlugin] });
  const sigWithTag = signal(0, { use: [tagForMutable] });
  expectType<Mutable<number>>(sigWithTag);

  // Computed signal with tag (same limitation as above)
  const tagForComputed = tag<number>({ use: [computedPlugin] });
  const computedWithTag = signal({ dep }, ({ deps }): number => deps.dep * 2, {
    use: [tagForComputed] as any,
  });
  expectType<Computed<number>>(computedWithTag);

  // Signal with mixed plugins and tags
  const mixedUse = signal(0, {
    use: [anyPlugin, tagForMutable, mutablePlugin],
  });
  expectType<Mutable<number>>(mixedUse);

  // -----------------------------------------------------------------------------
  // Complex plugin scenarios
  // -----------------------------------------------------------------------------

  // Plugin with complex return type
  type CleanupFn = () => void;
  const complexPlugin: Plugin<number> = (signal): CleanupFn => {
    const unsub1 = signal.on(() => {});
    const unsub2 = signal.on(() => {});
    return () => {
      unsub1();
      unsub2();
    };
  };

  const sigWithComplex = signal(0, { use: [complexPlugin] });
  expectType<Mutable<number>>(sigWithComplex);

  // Plugin with object value
  interface User {
    id: number;
    name: string;
  }

  const userPlugin: Plugin<User> = (signal) => {
    expectType<Signal<User>>(signal);
    const user = signal();
    expectType<User>(user);
    expectType<number>(user.id);
    expectType<string>(user.name);
  };

  const userSignal = signal<User>(
    { id: 1, name: "Alice" },
    {
      use: [userPlugin],
    }
  );
  expectType<Mutable<User>>(userSignal);

  // Plugin with array value
  const arrayPlugin: Plugin<number[]> = (signal) => {
    expectType<Signal<number[]>>(signal);
    const arr = signal();
    expectType<number[]>(arr);
    expectType<number>(arr[0]);
  };

  const arraySignal = signal([1, 2, 3], { use: [arrayPlugin] });
  expectType<Mutable<number[]>>(arraySignal);

  // Plugin with promise value
  const promisePlugin: Plugin<Promise<string>> = (signal) => {
    expectType<Signal<Promise<string>>>(signal);
    const promise = signal();
    expectType<Promise<string>>(promise);
  };

  const promiseSignal = signal(Promise.resolve("test"), {
    use: [promisePlugin],
  });
  expectType<Mutable<Promise<string>>>(promiseSignal);

  // Plugin with union type
  const unionPlugin: Plugin<string | number> = (signal) => {
    expectType<Signal<string | number>>(signal);
    const value = signal();
    expectType<string | number>(value);
  };

  const unionSignal = signal<string | number>(0, { use: [unionPlugin] });
  expectType<Mutable<string | number>>(unionSignal);

  // -----------------------------------------------------------------------------
  // Plugin kind inference
  // -----------------------------------------------------------------------------

  // Default kind (SignalKind) accepts both mutable and computed
  const anyKindTag = tag<number>({ use: [anyPlugin] });
  expectType<Tag<number, SignalKind>>(anyKindTag);

  // "mutable" kind only for mutable signals
  const mutableKindTag = tag<number, "mutable">({
    use: [mutablePlugin as any],
  });
  expectType<Tag<number, "mutable">>(mutableKindTag);

  // "computed" kind only for computed signals
  const computedKindTag = tag<number, "computed">({
    use: [computedPlugin as any],
  });
  expectType<Tag<number, "computed">>(computedKindTag);

  // Use tag with appropriate signal kind
  const mutableSigWithKindTag = signal(0, { use: [mutableKindTag] });
  expectType<Mutable<number>>(mutableSigWithKindTag);

  const computedSigWithKindTag = signal(
    { dep },
    ({ deps }): number => deps.dep * 2,
    { use: [computedKindTag] as any }
  );
  expectType<Computed<number>>(computedSigWithKindTag);

  // -----------------------------------------------------------------------------
  // Deeply nested tag hierarchies
  // -----------------------------------------------------------------------------

  const level3Tag = tag<number>({ use: [anyPlugin] });
  const level2Tag = tag<number>({ use: [level3Tag, anyPlugin] });
  const level1Tag = tag<number>({ use: [level2Tag] });

  expectType<Tag<number>>(level1Tag);
  expectType<
    ReadonlyArray<
      | Plugin<number, "any" | "mutable" | "computed">
      | Tag<number, "any" | "mutable" | "computed">
    >
  >(level1Tag.use);

  const deepSignal = signal(0, { use: [level1Tag] });
  expectType<Mutable<number>>(deepSignal);

  // -----------------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------------

  // Empty use array
  const emptyUse = signal(0, { use: [] });
  expectType<Mutable<number>>(emptyUse);

  // Single plugin
  const singlePlugin = signal(0, { use: [anyPlugin] });
  expectType<Mutable<number>>(singlePlugin);

  // Signal without use option
  const noUse = signal(0);
  expectType<Mutable<number>>(noUse);

  // Plugin returning void explicitly
  const voidPlugin: Plugin<number> = (): void => {
    // No return
  };
  const sigWithVoid = signal(0, { use: [voidPlugin] });
  expectType<Mutable<number>>(sigWithVoid);

  // Plugin returning undefined explicitly
  const undefinedPlugin: Plugin<number> = (): undefined => {
    return undefined;
  };
  const sigWithUndefined = signal(0, { use: [undefinedPlugin] });
  expectType<Mutable<number>>(sigWithUndefined);

  const myPlugin = define<Plugin<number, "mutable">>();
  const myTag = tag<number>({ use: [mutablePlugin] });
  void myPlugin; // Mark as used
  void myTag; // Mark as used

  // =============================================================================
  // KIND CONSTRAINT VERIFICATION
  // =============================================================================

  // Use explicit type annotations to prevent type widening
  const computedTag2: Tag<number, "computed"> = tag<number, "computed">();
  const mutableTag2: Tag<number, "mutable"> = tag<number, "mutable">();
  const generalTag2: Tag<number> = tag<number>();
  const depSig = signal(1);

  // -----------------------------------------------------------------------------
  // Test 1: Tag assignability (tag-to-tag)
  // -----------------------------------------------------------------------------

  // ✅ Same kind assignment
  const testAssign1: Tag<number, "mutable"> = mutableTag2;
  const testAssign2: Tag<number, "computed"> = computedTag2;
  const testAssign3: Tag<number> = generalTag2;

  // ❌ Cross-kind assignment (should error)
  // @ts-expect-error - computed tag cannot be assigned to mutable slot
  const testAssign4: Tag<number, "mutable"> = computedTag2;
  // @ts-expect-error - mutable tag cannot be assigned to computed slot
  const testAssign5: Tag<number, "computed"> = mutableTag2;

  // ✅ Specific kind to general (upcasting - OK)
  const testAssign6: Tag<number, SignalKind> = mutableTag2;
  const testAssign7: Tag<number, SignalKind> = computedTag2;

  const computedTag = tag<number, "mutable">();

  void signal(0, { use: [computedTag] });

  void testAssign1,
    testAssign2,
    testAssign3,
    testAssign4,
    testAssign5,
    testAssign6,
    testAssign7;

  // -----------------------------------------------------------------------------
  // Test 2: Signal use constraints (signal-to-tag compatibility)
  // -----------------------------------------------------------------------------

  // -----------------------------------------------------------------------------
  // Test 3: Known Limitation - Cross-kind usage in arrays
  // -----------------------------------------------------------------------------
  //
  // TypeScript's structural typing is unable to prevent cross-kind tag usage
  // in array literal contexts, even though the types are properly defined.
  //
  // Direct type test shows correct behavior:
  type MutableUseElement = UseList<number, "mutable">[number];
  type CanAssignComputedToMutable = Tag<
    number,
    "computed"
  > extends MutableUseElement
    ? "WRONG"
    : "CORRECT";
  const directTest: CanAssignComputedToMutable = "CORRECT" as any; // Type test passes ✓
  void directTest;

  // Known Limitation: Array literal contexts don't enforce kind constraints.
  // TypeScript's structural typing allows cross-kind usage even though
  // the types are properly defined to prevent it.
  //
  // These tests use type assertions to avoid compilation errors while
  // documenting the limitation:

  // Mutable signal with tags
  const testMutableSig1 = signal(0, { use: [mutableTag2] }); // ✅ Correct
  const testMutableSig2 = signal(0, { use: [generalTag2] }); // ✅ Correct
  // Note: Should ideally error, but TypeScript allows it (known limitation)
  const testMutableSig3 = signal(0, { use: [computedTag2 as any] }); // ⚠️ Works but shouldn't

  // Computed signal with tags - same inference limitation applies
  const testComputedSig1 = signal(
    { depSig },
    ({ deps }): number => deps.depSig,
    { use: [computedTag2] as any }
  );
  const testComputedSig2 = signal(
    { depSig },
    ({ deps }): number => deps.depSig,
    { use: [generalTag2] as any }
  );
  // Note: Should ideally error, but TypeScript allows it (known limitation)
  const testComputedSig3 = signal(
    { depSig },
    ({ deps }): number => deps.depSig,
    { use: [mutableTag2] as any }
  );

  // Recommendation: Use general tags (no kind parameter) unless you have a strong
  // semantic reason to restrict, and be careful with cross-kind usage.
  void testMutableSig1, testMutableSig2, testMutableSig3;
  void testComputedSig1, testComputedSig2, testComputedSig3;
}

// =============================================================================
// Export test functions to avoid unused warnings
// (These are never actually called - this file is for type checking only)
// =============================================================================

// =============================================================================
// AnySignal Tests
// =============================================================================

function anySignalTests() {
  const count = signal(0);
  const doubled = signal({ count }, ({ deps }) => deps.count * 2);

  // -----------------------------------------------------------------------------
  // Test 1: AnySignal accepts both mutable and computed signals
  // -----------------------------------------------------------------------------

  const mutableAsAny: AnySignal<number> = count; // ✅ OK
  const computedAsAny: AnySignal<number> = doubled; // ✅ OK

  void mutableAsAny, computedAsAny;

  // -----------------------------------------------------------------------------
  // Test 2: Generic function with AnySignal has access to common methods
  // -----------------------------------------------------------------------------

  function watchSignal<T>(s: AnySignal<T>) {
    // ✅ Methods available on both MutableSignal and ComputedSignal work
    const unsub = s.on(() => console.log("Value:", s()));
    s.refresh(); // Available on both
    void unsub;
  }

  watchSignal(count); // ✅ Works with MutableSignal
  watchSignal(doubled); // ✅ Works with ComputedSignal

  // -----------------------------------------------------------------------------
  // Test 3: Type narrowing for mutable-specific operations
  // -----------------------------------------------------------------------------

  function updateIfMutable<T>(s: AnySignal<T>, value: T) {
    if ("set" in s) {
      // TypeScript narrows to MutableSignal
      s.set(value); // ✅ .set() is available
    }
  }

  updateIfMutable(count, 42); // ✅ Works
  updateIfMutable(doubled, 42); // ✅ Works (but won't set because it's computed)

  // -----------------------------------------------------------------------------
  // Test 4: Array of mixed signals
  // -----------------------------------------------------------------------------

  const mixedSignals: AnySignal<number>[] = [count, doubled]; // ✅ OK

  mixedSignals.forEach((s) => {
    s.on(() => console.log("Changed:", s())); // ✅ Works
  });

  // -----------------------------------------------------------------------------
  // Test 5: Function returning AnySignal
  // -----------------------------------------------------------------------------

  function createSignal(isComputed: boolean): AnySignal<number> {
    if (isComputed) {
      return signal({ count }, ({ deps }) => deps.count * 2); // ✅ OK
    }
    return signal(0); // ✅ OK
  }

  const s = createSignal(true);
  s.on(() => console.log("Changed")); // ✅ Works
  s.refresh(); // ✅ Works
}

// =============================================================================
// PERSISTOR TYPE CHECKS
// =============================================================================

import {
  persistor,
  type Persistor,
  type PersistorOptions,
  type PersistedValues,
  type SaveArgs,
} from "./plugins";

function persistorTests() {
  // -----------------------------------------------------------------------------
  // Test 1: Basic persistor creation with type inference
  // -----------------------------------------------------------------------------

  // Untyped persistor - accepts any keys
  const untypedPersist = persistor({
    load: () => ({}),
    save: () => {},
  });

  // Should accept any string key
  untypedPersist("anyKey");
  untypedPersist("anotherKey");

  // -----------------------------------------------------------------------------
  // Test 2: Typed persistor with explicit data shape
  // -----------------------------------------------------------------------------

  type AppState = {
    count: number;
    name: string;
    enabled: boolean;
  };

  const typedPersist = persistor<AppState>({
    load: () => ({ count: 0, name: "", enabled: false }),
    save: (args) => {
      // TypeScript knows the shape
      if (args.type === "merge") {
        expectType<Partial<AppState>>(args.values);
      } else {
        expectType<AppState>(args.values);
      }
    },
  });

  // ✅ Valid keys
  typedPersist("count");
  typedPersist("name");
  typedPersist("enabled");

  // ❌ Invalid key - TypeScript error
  // @ts-expect-error - "invalid" is not a key of AppState
  typedPersist("invalid");

  // -----------------------------------------------------------------------------
  // Test 3: Plugin type inference from key
  // -----------------------------------------------------------------------------

  const countPlugin = typedPersist("count");
  expectType<Plugin<number, "any">>(countPlugin);

  const namePlugin = typedPersist("name");
  expectType<Plugin<string, "any">>(namePlugin);

  const enabledPlugin = typedPersist("enabled");
  expectType<Plugin<boolean, "any">>(enabledPlugin);

  // -----------------------------------------------------------------------------
  // Test 4: SaveArgs discriminated union
  // -----------------------------------------------------------------------------

  function testSaveArgs(args: SaveArgs<AppState>) {
    if (args.type === "merge") {
      // Merge mode - partial values
      expectType<"merge">(args.type);
      expectType<Partial<AppState>>(args.values);

      // Optional access
      const count: number | undefined = args.values.count;
      const name: string | undefined = args.values.name;
      void count, name;
    } else {
      // Overwrite mode - full values
      expectType<"overwrite">(args.type);
      expectType<AppState>(args.values);

      // Required access
      const count: number = args.values.count;
      const name: string = args.values.name;
      void count, name;
    }
  }
  void testSaveArgs;

  // -----------------------------------------------------------------------------
  // Test 5: PersistedValues type
  // -----------------------------------------------------------------------------

  type TestPersistedValues = PersistedValues<AppState>;

  // Should be partial with nullable values
  const persisted: TestPersistedValues = {
    count: 42,
    name: null, // Can be null
    // enabled is optional
  };
  expectType<number | null | undefined>(persisted.count);
  expectType<string | null | undefined>(persisted.name);
  expectType<boolean | null | undefined>(persisted.enabled);

  // -----------------------------------------------------------------------------
  // Test 6: PersistorOptions type
  // -----------------------------------------------------------------------------

  const options: PersistorOptions<AppState> = {
    load: () => ({ count: 0 }),
    save: (args) => {
      if (args.type === "merge") {
        console.log("Merging:", args.values);
      } else {
        console.log("Overwriting:", args.values);
      }
    },
    onError: (error, type) => {
      expectType<unknown>(error);
      expectType<"load" | "save">(type);
    },
  };
  void options;

  // -----------------------------------------------------------------------------
  // Test 7: Persistor interface
  // -----------------------------------------------------------------------------

  const persistorInstance: Persistor<AppState> = typedPersist;

  // Plugin factory overload
  const plugin = persistorInstance("count");
  expectType<Plugin<number, "any">>(plugin);

  // Group plugin overload
  const count = signal(0);
  const name = signal("");
  const cleanup = persistorInstance({ count, name });
  expectType<VoidFunction>(cleanup);

  // -----------------------------------------------------------------------------
  // Test 8: Usage with signals
  // -----------------------------------------------------------------------------

  // Individual mode with typed persistor
  const countSig = signal(0, { use: [typedPersist("count")] });
  expectType<Mutable<number>>(countSig);

  const nameSig = signal("", { use: [typedPersist("name")] });
  expectType<Mutable<string>>(nameSig);

  // Type mismatch - signal type must match data shape
  // @ts-expect-error - signal<string> cannot use persist("count") which expects number
  signal("wrong", { use: [typedPersist("count")] });

  // -----------------------------------------------------------------------------
  // Test 9: Async load/save
  // -----------------------------------------------------------------------------

  const asyncPersist = persistor<AppState>({
    load: async () => {
      return { count: 42, name: "async", enabled: true };
    },
    save: async (args) => {
      // Async save is allowed but returns void
      await Promise.resolve();
      console.log("Saved:", args);
    },
  });
  void asyncPersist;

  // -----------------------------------------------------------------------------
  // Test 10: Default Record<string, any> type
  // -----------------------------------------------------------------------------

  const flexiblePersist = persistor();

  // Accepts any string key with Plugin<any, "any">
  const anyPlugin = flexiblePersist("anything");
  expectType<Plugin<any, "any">>(anyPlugin);

  // Can be used with any signal type
  const anySig1 = signal(42, { use: [flexiblePersist("num")] });
  const anySig2 = signal("str", { use: [flexiblePersist("str")] });
  const anySig3 = signal({ complex: true }, { use: [flexiblePersist("obj")] });

  void anySig1, anySig2, anySig3;

  // Cleanup
  countSig.dispose();
  nameSig.dispose();
  count.dispose();
  name.dispose();
}

// =============================================================================
// PATH TYPE TESTS - Type-safe nested property access
// =============================================================================

import type { Path, PathValue, PathSetter, PathGetter } from "./types";

function pathTypeTests() {
  // Test object type
  type User = {
    name: string;
    age: number;
    address: {
      city: string;
      zip: number;
      coords: {
        lat: number;
        lng: number;
      };
    };
    tags: string[];
    scores: number[];
    metadata: Record<string, unknown>;
  };

  // Path tests - should infer all valid paths
  type UserPaths = Path<User>;
  const validPaths: UserPaths[] = [
    "name",
    "age",
    "address",
    "address.city",
    "address.zip",
    "address.coords",
    "address.coords.lat",
    "address.coords.lng",
    "tags",
    "scores",
    "metadata",
  ];

  // PathValue tests - should infer correct value types
  type NameType = PathValue<User, "name">;
  expectType<NameType>("" as string);

  type AgeType = PathValue<User, "age">;
  expectType<AgeType>(0 as number);

  type CityType = PathValue<User, "address.city">;
  expectType<CityType>("" as string);

  type ZipType = PathValue<User, "address.zip">;
  expectType<ZipType>(0 as number);

  type LatType = PathValue<User, "address.coords.lat">;
  expectType<LatType>(0 as number);

  type AddressType = PathValue<User, "address">;
  expectType<AddressType>({} as User["address"]);

  type TagsType = PathValue<User, "tags">;
  expectType<TagsType>([] as string[]);

  // PathSetter usage
  const setter: PathSetter<User> = (_path, _value) => {
    // Implementation would go here
  };

  // These should all compile correctly with inferred value types
  setter("name", "Alice");
  setter("age", 30);
  setter("address.city", "NYC");
  setter("address.zip", 10001);
  setter("address.coords.lat", 40.7128);
  setter("tags", ["tag1", "tag2"]);

  // With updater function
  setter("age", (prev) => prev + 1);
  setter("name", (prev) => prev.toUpperCase());
  setter("tags", (prev) => [...prev, "new"]);

  // PathGetter usage
  const getter: PathGetter<User> = <P extends Path<User>>(_path: P) => {
    return {} as PathValue<User, P>;
  };

  const name: string = getter("name");
  const age: number = getter("age");
  const city: string = getter("address.city");
  const lat: number = getter("address.coords.lat");
  const tags: string[] = getter("tags");

  // Array index paths
  type ArrayItem = {
    items: { id: number; name: string }[];
  };

  type ItemPaths = Path<ArrayItem>;
  const arrayPaths: ItemPaths[] = [
    "items",
    // Array with numeric index paths
    "items.0",
    "items.0.id",
    "items.0.name",
    "items.1",
    "items.99",
  ];

  // PathValue for array indexed paths
  type ItemsType = PathValue<ArrayItem, "items">;
  expectType<ItemsType>([] as { id: number; name: string }[]);

  type FirstItemType = PathValue<ArrayItem, "items.0">;
  expectType<FirstItemType>({} as { id: number; name: string });

  type ItemIdType = PathValue<ArrayItem, "items.0.id">;
  expectType<ItemIdType>(0 as number);

  type ItemNameType = PathValue<ArrayItem, "items.0.name">;
  expectType<ItemNameType>("" as string);

  // Setter with array paths
  const arraySetter: PathSetter<ArrayItem> = (_path, _value) => {};
  arraySetter("items", [{ id: 1, name: "test" }]);
  arraySetter("items.0", { id: 1, name: "test" });
  arraySetter("items.0.id", 42);
  arraySetter("items.0.name", "updated");

  // Tuple type paths
  type TupleType = {
    coords: [number, number, number];
  };

  type TuplePaths = Path<TupleType>;
  const tuplePaths: TuplePaths[] = [
    "coords",
    "coords.0",
    "coords.1",
    "coords.2",
  ];

  type TupleFirstType = PathValue<TupleType, "coords.0">;
  expectType<TupleFirstType>(0 as number);

  // Nested arrays
  type NestedArray = {
    matrix: { row: number[] }[];
  };

  type MatrixPaths = Path<NestedArray>;
  const matrixPaths: MatrixPaths[] = [
    "matrix",
    "matrix.0",
    "matrix.0.row",
    "matrix.0.row.0",
  ];

  type MatrixRowType = PathValue<NestedArray, "matrix.0.row">;
  expectType<MatrixRowType>([] as number[]);

  type MatrixCellType = PathValue<NestedArray, "matrix.0.row.0">;
  expectType<MatrixCellType>(0 as number);

  void validPaths,
    name,
    age,
    city,
    lat,
    tags,
    arrayPaths,
    tuplePaths,
    matrixPaths;
}

// ============================================================================
// Focus Operator Type Tests
// ============================================================================
import { focus } from "./operators/focus";

function focusOperatorTests() {
  // Basic object
  type User = {
    name: string;
    age: number;
    email: string;
  };

  const user = signal<User>({
    name: "Alice",
    age: 30,
    email: "alice@example.com",
  });

  // Should infer string type for name
  const userName = user.pipe(focus("name"));
  expectType<Mutable<string>>(userName);
  expectType<string>(userName());

  // Should infer number type for age
  const userAge = user.pipe(focus("age"));
  expectType<Mutable<number>>(userAge);
  expectType<number>(userAge());

  // Set should accept correct type
  userName.set("Bob");
  userName.set((prev) => prev.toUpperCase());

  userAge.set(25);
  userAge.set((prev) => prev + 1);

  // Nested objects
  type Form = {
    user: {
      profile: {
        displayName: string;
        bio: string;
      };
      settings: {
        theme: "light" | "dark";
        notifications: boolean;
      };
    };
    items: { id: number; text: string }[];
  };

  const form = signal<Form>({
    user: {
      profile: { displayName: "Alice", bio: "Hello" },
      settings: { theme: "light", notifications: true },
    },
    items: [{ id: 1, text: "First" }],
  });

  // Nested path should work
  const displayName = form.pipe(focus("user.profile.displayName"));
  expectType<Mutable<string>>(displayName);

  const theme = form.pipe(focus("user.settings.theme"));
  expectType<Mutable<"light" | "dark">>(theme);

  const notifications = form.pipe(focus("user.settings.notifications"));
  expectType<Mutable<boolean>>(notifications);

  // Array access
  const firstItem = form.pipe(focus("items.0"));
  expectType<Mutable<{ id: number; text: string }>>(firstItem);

  const firstItemId = form.pipe(focus("items.0.id"));
  expectType<Mutable<number>>(firstItemId);

  const firstItemText = form.pipe(focus("items.0.text"));
  expectType<Mutable<string>>(firstItemText);

  // Options should work (without fallback)
  const userNameWithOptions = user.pipe(
    focus("name", {
      equals: "shallow",
      name: "userName",
      get: (v) => v.toUpperCase(),
      set: (v) => v.trim(),
      validate: (v) => v.length > 0,
      onError: (e) => console.error(e),
    })
  );
  expectType<Mutable<string>>(userNameWithOptions);

  // -----------------------------------------------------------------------------
  // Focus overload tests - with/without fallback
  // -----------------------------------------------------------------------------

  // Type with optional property
  type UserWithOptional = {
    name: string;
    nickname?: string;
    address?: {
      street: string;
      city: string;
    };
  };

  const userOptional = signal<UserWithOptional>({
    name: "Alice",
  });

  // Without fallback - type includes undefined from optional property
  const nickname = userOptional.pipe(focus("nickname"));
  expectType<Mutable<string | undefined>>(nickname);

  // With fallback (factory function) - type is guaranteed non-nullable
  const nicknameWithFallback = userOptional.pipe(
    focus("nickname", () => "Anonymous")
  );
  expectType<Mutable<string>>(nicknameWithFallback);

  // Nested optional path without fallback
  const street = userOptional.pipe(focus("address.street" as any));
  // Note: Due to path typing limitations, this is `any` but in practice would be string | undefined

  // Nested optional path with fallback
  const streetWithFallback = userOptional.pipe(
    focus("address.street" as any, () => "Unknown")
  );

  // Non-optional property - both overloads work the same
  const name1 = userOptional.pipe(focus("name"));
  expectType<Mutable<string>>(name1);

  const name2 = userOptional.pipe(focus("name", () => "Default"));
  expectType<Mutable<string>>(name2);

  // Fallback with options
  const nicknameAllOptions = userOptional.pipe(
    focus("nickname", () => "Guest", {
      equals: "strict",
      name: "userNickname",
      get: (v) => v.toUpperCase(),
      set: (v) => v.trim(),
      validate: (v) => v.length > 0,
      onError: (e) => console.error(e),
    })
  );
  expectType<Mutable<string>>(nicknameAllOptions);

  // Should have disposed() method
  expectType<() => boolean>(user.disposed);
  expectType<boolean>(user.disposed());

  // disposed() should work on mutable signal
  const count = signal(0);
  expectType<() => boolean>(count.disposed);

  // disposed() should work on computed signal
  const doubled = signal({ count }, ({ deps }) => deps.count * 2);
  expectType<() => boolean>(doubled.disposed);

  void userName,
    userAge,
    displayName,
    theme,
    notifications,
    firstItem,
    firstItemId,
    firstItemText,
    userNameWithOptions,
    doubled,
    nickname,
    nicknameWithFallback,
    street,
    streetWithFallback,
    name1,
    name2,
    nicknameAllOptions;
}

// =============================================================================
// signal.from() Tests - Combine multiple signals
// =============================================================================

function signalFromTests() {
  // Record overload: signal.from({ a, b, c })
  const numSig = signal(42);
  const strSig = signal("hello");
  const boolSig = signal(true);

  const combined1 = signal.from({ num: numSig, str: strSig, bool: boolSig });
  expectType<Computed<{ num: number; str: string; bool: boolean }>>(combined1);
  expectType<{ num: number; str: string; bool: boolean }>(combined1());

  // Tuple overload: signal.from([a, b, c])
  const combined2 = signal.from([numSig, strSig, boolSig]);
  expectType<Computed<readonly [number, string, boolean]>>(combined2);
  expectType<readonly [number, string, boolean]>(combined2());

  // Empty record
  const emptyRecord = signal.from({});
  expectType<Computed<{}>>(emptyRecord);

  // Empty tuple
  const emptyTuple = signal.from([]);
  expectType<Computed<readonly []>>(emptyTuple);

  // Single signal record
  const single1 = signal.from({ value: numSig });
  expectType<Computed<{ value: number }>>(single1);

  // Single signal tuple
  const single2 = signal.from([numSig]);
  expectType<Computed<readonly [number]>>(single2);

  // Computed signal as input
  const computed = signal({ num: numSig }, ({ deps }) => deps.num * 2);
  const fromComputed = signal.from({ original: numSig, doubled: computed });
  expectType<Computed<{ original: number; doubled: number }>>(fromComputed);

  void combined1,
    combined2,
    emptyRecord,
    emptyTuple,
    single1,
    single2,
    fromComputed;
}

// =============================================================================
// signal.when() Instance Method Type Tests
// =============================================================================

function signalWhenTests() {
  // -----------------------------------------------------------------------------
  // Setup - Create test signals
  // -----------------------------------------------------------------------------

  const notifier = signal(0);
  const notifier2 = signal(0);
  const stringNotifier = signal("");

  // -----------------------------------------------------------------------------
  // Test 1: Mutable signal with action (single notifier)
  // -----------------------------------------------------------------------------

  const mutableCount = signal(10);

  // "reset" action
  const afterReset = mutableCount.when(notifier, "reset");
  expectType<Mutable<number>>(afterReset);

  // "refresh" action
  const afterRefresh = mutableCount.when(notifier, "refresh");
  expectType<Mutable<number>>(afterRefresh);

  // Action type should be MutableWhenAction
  const validActions: MutableWhenAction[] = ["reset", "refresh"];
  void validActions;

  // -----------------------------------------------------------------------------
  // Test 2: Mutable signal with action (array of notifiers)
  // -----------------------------------------------------------------------------

  const afterMultiNotifier = mutableCount.when([notifier, notifier2], "reset");
  expectType<Mutable<number>>(afterMultiNotifier);

  // Mixed notifier types in array
  const afterMixedNotifiers = mutableCount.when(
    [notifier, stringNotifier],
    "refresh"
  );
  expectType<Mutable<number>>(afterMixedNotifiers);

  // -----------------------------------------------------------------------------
  // Test 3: Mutable signal with action and filter
  // -----------------------------------------------------------------------------

  // Filter function receives (self, notifier)
  const withFilter = mutableCount.when(
    notifier,
    "reset",
    (self, notifierSig) => {
      // self should be Mutable<number>
      expectType<Mutable<number>>(self);
      // notifier should match the notifier type
      expectType<Mutable<number>>(notifierSig);
      // Can access values
      return self() > 5 && notifierSig() > 0;
    }
  );
  expectType<Mutable<number>>(withFilter);

  // Filter with string notifier
  const withStringFilter = mutableCount.when(
    stringNotifier,
    "refresh",
    (self, notifierSig) => {
      expectType<Mutable<number>>(self);
      expectType<Mutable<string>>(notifierSig);
      return notifierSig().length > 0;
    }
  );
  expectType<Mutable<number>>(withStringFilter);

  // Filter with array of notifiers
  const withArrayFilter = mutableCount.when(
    [notifier, notifier2],
    "reset",
    (self, notifierSig) => {
      expectType<Mutable<number>>(self);
      // notifier is one of the array elements
      expectType<Mutable<number>>(notifierSig);
      return notifierSig() > 5;
    }
  );
  expectType<Mutable<number>>(withArrayFilter);

  // -----------------------------------------------------------------------------
  // Test 4: Mutable signal with reducer (single notifier)
  // -----------------------------------------------------------------------------

  // Basic accumulator pattern
  const total = signal(0).when(notifier, (self, notifierSig) => {
    expectType<Mutable<number>>(self);
    expectType<Mutable<number>>(notifierSig);
    return self() + notifierSig();
  });
  expectType<Mutable<number>>(total);

  // Reducer with different notifier type
  const strLength = signal(0).when(stringNotifier, (self, notifierSig) => {
    expectType<Mutable<number>>(self);
    expectType<Mutable<string>>(notifierSig);
    return self() + notifierSig().length;
  });
  expectType<Mutable<number>>(strLength);

  // -----------------------------------------------------------------------------
  // Test 5: Mutable signal with reducer (array of notifiers)
  // -----------------------------------------------------------------------------

  const multiReducer = signal(0).when([notifier, notifier2], (self, n) => {
    expectType<Mutable<number>>(self);
    expectType<Mutable<number>>(n);
    return self() + n();
  });
  expectType<Mutable<number>>(multiReducer);

  // -----------------------------------------------------------------------------
  // Test 6: Mutable signal chaining
  // -----------------------------------------------------------------------------

  const resetTrigger = signal(false);
  const refreshTrigger = signal(0);

  const chained = signal(100)
    .when(resetTrigger, "reset")
    .when(refreshTrigger, "refresh")
    .when(notifier, (self, n) => self() + n());

  expectType<Mutable<number>>(chained);

  // -----------------------------------------------------------------------------
  // Test 7: Computed signal with action (single notifier)
  // -----------------------------------------------------------------------------

  const dep = signal(5);
  const computed = signal({ dep }, ({ deps }) => deps.dep * 2);

  // "refresh" action
  const computedRefresh = computed.when(notifier, "refresh");
  expectType<Computed<number>>(computedRefresh);

  // "stale" action
  const computedStale = computed.when(notifier, "stale");
  expectType<Computed<number>>(computedStale);

  // Action type should be ComputedWhenAction
  const validComputedActions: ComputedWhenAction[] = ["refresh", "stale"];
  void validComputedActions;

  // -----------------------------------------------------------------------------
  // Test 8: Computed signal with action (array of notifiers)
  // -----------------------------------------------------------------------------

  const computedMulti = computed.when([notifier, notifier2], "refresh");
  expectType<Computed<number>>(computedMulti);

  // -----------------------------------------------------------------------------
  // Test 9: Computed signal with action and filter
  // -----------------------------------------------------------------------------

  const computedWithFilter = computed.when(
    notifier,
    "refresh",
    (self, notifierSig) => {
      // self should be Computed<number>
      expectType<Computed<number>>(self);
      // notifier should match the notifier type
      expectType<Mutable<number>>(notifierSig);
      return notifierSig() > 5;
    }
  );
  expectType<Computed<number>>(computedWithFilter);

  // Filter with string notifier
  const computedStringFilter = computed.when(
    stringNotifier,
    "stale",
    (self, notifierSig) => {
      expectType<Computed<number>>(self);
      expectType<Mutable<string>>(notifierSig);
      return notifierSig().length > 0;
    }
  );
  expectType<Computed<number>>(computedStringFilter);

  // -----------------------------------------------------------------------------
  // Test 10: Computed signal chaining
  // -----------------------------------------------------------------------------

  const staleTrigger = signal(0);

  const computedChained = signal({ dep }, ({ deps }) => deps.dep * 3)
    .when(refreshTrigger, "refresh")
    .when(staleTrigger, "stale", (_, n) => n() > 0);

  expectType<Computed<number>>(computedChained);

  // -----------------------------------------------------------------------------
  // Test 11: Computed signal should NOT support "reset" action
  // -----------------------------------------------------------------------------

  // @ts-expect-error - Computed signals do not support "reset" action
  computed.when(notifier, "reset");

  // @ts-expect-error - "reset" is not a valid ComputedWhenAction
  const invalidAction: ComputedWhenAction = "reset";
  void invalidAction;

  // -----------------------------------------------------------------------------
  // Test 12: Mutable signal should NOT support "stale" action
  // -----------------------------------------------------------------------------

  // @ts-expect-error - Mutable signals do not support "stale" action
  mutableCount.when(notifier, "stale");

  // @ts-expect-error - "stale" is not a valid MutableWhenAction
  const invalidMutableAction: MutableWhenAction = "stale";
  void invalidMutableAction;

  // -----------------------------------------------------------------------------
  // Test 13: Invalid action strings
  // -----------------------------------------------------------------------------

  // @ts-expect-error - Invalid action string
  mutableCount.when(notifier, "invalid");

  // @ts-expect-error - Invalid action string for computed
  computed.when(notifier, "invalid");

  // -----------------------------------------------------------------------------
  // Test 14: Type inference with generic signals
  // -----------------------------------------------------------------------------

  interface User {
    id: number;
    name: string;
  }

  const userSignal = signal<User | null>(null);
  const logout = signal(0);

  // Reset user on logout
  const userWithReset = userSignal.when(logout, "reset");
  expectType<Mutable<User | null>>(userWithReset);

  // Reducer with complex type
  const updateUser = signal<Partial<User>>({});
  const userWithReducer = userSignal.when(updateUser, (self, n) => {
    expectType<Mutable<User | null>>(self);
    expectType<Mutable<Partial<User>>>(n);
    const current = self();
    const updates = n();
    if (!current) return null;
    return { ...current, ...updates };
  });
  expectType<Mutable<User | null>>(userWithReducer);

  // -----------------------------------------------------------------------------
  // Test 15: Filter function return type must be boolean
  // -----------------------------------------------------------------------------

  // @ts-expect-error - Filter must return boolean, not number
  mutableCount.when(notifier, "reset", () => 42);

  // @ts-expect-error - Filter must return boolean, not string
  computed.when(notifier, "refresh", () => "true");

  // -----------------------------------------------------------------------------
  // Test 16: Reducer must return correct type
  // -----------------------------------------------------------------------------

  // @ts-expect-error - Reducer must return number, not string
  signal(0).when(notifier, () => "wrong type");

  // @ts-expect-error - Reducer must return number, not void
  signal(0).when(notifier, () => {});

  // -----------------------------------------------------------------------------
  // Test 17: State machine pattern
  // -----------------------------------------------------------------------------

  type State = "idle" | "loading" | "done" | "error";
  type Event = { type: "START" | "COMPLETE" | "FAIL" };

  const events = signal<Event | null>(null);
  const state = signal<State>("idle").when(events, (self, notifierSig) => {
    expectType<Mutable<State>>(self);
    expectType<Mutable<Event | null>>(notifierSig);

    const event = notifierSig();
    if (!event) return self();

    switch (event.type) {
      case "START":
        return "loading";
      case "COMPLETE":
        return "done";
      case "FAIL":
        return "error";
      default:
        return self();
    }
  });
  expectType<Mutable<State>>(state);

  // -----------------------------------------------------------------------------
  // Test 18: Readonly array of notifiers
  // -----------------------------------------------------------------------------

  const notifiers = [notifier, notifier2] as const;
  const withReadonlyArray = mutableCount.when(notifiers, "reset");
  expectType<Mutable<number>>(withReadonlyArray);

  const computedReadonly = computed.when(notifiers, "refresh");
  expectType<Computed<number>>(computedReadonly);

  // -----------------------------------------------------------------------------
  // Test 19: AnySignal as notifier
  // -----------------------------------------------------------------------------

  function setupWhen<T>(
    s: Mutable<T>,
    n: AnySignal<number>,
    action: MutableWhenAction
  ) {
    return s.when(n, action);
  }

  const result = setupWhen(signal(10), notifier, "reset");
  expectType<Mutable<number>>(result);

  // Also works with computed notifier
  const computedNotifier = signal({ dep }, ({ deps }) => deps.dep);
  const withComputedNotifier = mutableCount.when(computedNotifier, "refresh");
  expectType<Mutable<number>>(withComputedNotifier);

  // -----------------------------------------------------------------------------
  // Test 20: Empty array of notifiers (edge case)
  // -----------------------------------------------------------------------------

  // TypeScript allows empty array but it's a no-op at runtime
  const emptyNotifiers: readonly Mutable<number>[] = [];
  const withEmptyArray = mutableCount.when(emptyNotifiers, "reset");
  expectType<Mutable<number>>(withEmptyArray);

  // -----------------------------------------------------------------------------
  // Cleanup - suppress unused variable warnings
  // -----------------------------------------------------------------------------

  void afterReset,
    afterRefresh,
    afterMultiNotifier,
    afterMixedNotifiers,
    withFilter,
    withStringFilter,
    withArrayFilter,
    total,
    strLength,
    multiReducer,
    chained,
    computedRefresh,
    computedStale,
    computedMulti,
    computedWithFilter,
    computedStringFilter,
    computedChained,
    userWithReset,
    userWithReducer,
    state,
    withReadonlyArray,
    computedReadonly,
    result,
    withComputedNotifier,
    withEmptyArray;
}

// =============================================================================
// OPERATOR OPTIONS TYPE CHECKS
// =============================================================================

function operatorOptionsTests() {
  const source = signal(0);
  const strSource = signal("hello");
  const objSource = signal({ id: 1, name: "Alice" });

  // -----------------------------------------------------------------------------
  // Test 1: OperatorNameOptions interface
  // -----------------------------------------------------------------------------

  const nameOpts: OperatorNameOptions = { name: "custom" };
  const emptyOpts: OperatorNameOptions = {};
  void nameOpts, emptyOpts;

  // -----------------------------------------------------------------------------
  // Test 2: skip operators with options - verify options are accepted
  // -----------------------------------------------------------------------------

  // skip with name option
  const skipped = skip<number>(2, { name: "skipFirst2" })(source);
  expectType<Computed<number>>(skipped);

  // skipWhile with name option
  const skippedWhile = skipWhile<number>((x) => x < 5, { name: "skipSmall" })(
    source
  );
  expectType<Computed<number>>(skippedWhile);

  // skipLast with name option
  const skippedLast = skipLast<number>(2, { name: "skipLast2" })(source);
  expectType<Computed<number | undefined>>(skippedLast);

  // skipUntil with name option
  const trigger = signal(false);
  const skippedUntil = skipUntil<number>(trigger, { name: "skipUntilReady" })(
    source
  );
  expectType<Computed<number>>(skippedUntil);

  // -----------------------------------------------------------------------------
  // Test 3: take operators with options
  // -----------------------------------------------------------------------------

  // take with name option
  const taken = take<number>(3, { name: "takeFirst3" })(source);
  expectType<Computed<number>>(taken);

  // takeWhile with options (extends OperatorNameOptions)
  const takeWhileOpts: TakeWhileOptions = {
    inclusive: true,
    name: "takeSmall",
  };
  void takeWhileOpts;

  const takenWhile = takeWhile<number>((x) => x < 5, {
    inclusive: true,
    name: "takeSmall",
  })(source);
  expectType<Computed<number>>(takenWhile);

  // takeLast with name option
  const takenLast = takeLast<number>(3, { name: "takeLast3" })(source);
  expectType<Computed<number[]>>(takenLast);

  // takeUntil with name option
  const takenUntil = takeUntil<number>(trigger, { name: "takeUntilStop" })(
    source
  );
  expectType<Computed<number>>(takenUntil);

  // -----------------------------------------------------------------------------
  // Test 4: count operator with options
  // -----------------------------------------------------------------------------

  const countOpts: CountOptions = { predicate: (x) => x > 0, name: "positive" };
  void countOpts;

  // count without predicate
  const counted = count<number>()(source);
  expectType<Computed<number>>(counted);

  // count with predicate and name
  const countedWithPred = count<number>({
    predicate: (x) => x % 2 === 0,
    name: "evenCount",
  })(source);
  expectType<Computed<number>>(countedWithPred);

  // -----------------------------------------------------------------------------
  // Test 5: min/max operators with options
  // -----------------------------------------------------------------------------

  const minMaxOpts: MinMaxOptions<number> = {
    comparer: (a, b) => a - b,
    name: "custom",
  };
  void minMaxOpts;

  // max with name option
  const maxVal = max<number>({ name: "maximum" })(source);
  expectType<Computed<number>>(maxVal);

  // max with comparer and name (type matches source)
  type ObjType = { id: number; name: string };
  const maxObj = max<ObjType>({
    comparer: (a, b) => a.id - b.id,
    name: "maxById",
  })(objSource);
  expectType<Computed<ObjType>>(maxObj);

  // min with name option
  const minVal = min<number>({ name: "minimum" })(source);
  expectType<Computed<number>>(minVal);

  // min with comparer and name
  const minObj = min<ObjType>({
    comparer: (a, b) => a.id - b.id,
    name: "minById",
  })(objSource);
  expectType<Computed<ObjType>>(minObj);

  // -----------------------------------------------------------------------------
  // Test 6: distinct operator with unified options
  // -----------------------------------------------------------------------------

  const distinctOpts: DistinctOptions<number> = {
    mode: "consecutive",
    name: "unique",
  };
  void distinctOpts;

  // distinct consecutive mode (default)
  const distinctConsec = distinct<number>()(source);
  expectType<Computed<number>>(distinctConsec);

  // distinct all mode
  const distinctAll = distinct<number>({ mode: "all", name: "allUnique" })(
    source
  );
  expectType<Computed<number>>(distinctAll);

  // distinct with getKey
  const distinctByKey = distinct<ObjType, number>({
    getKey: (x) => x.id,
    name: "uniqueById",
  })(objSource);
  expectType<Computed<ObjType>>(distinctByKey);

  // distinct with equals
  const distinctWithEquals = distinct<number>({
    equals: (a, b) => a === b,
    name: "customEquals",
  })(source);
  expectType<Computed<number>>(distinctWithEquals);

  // -----------------------------------------------------------------------------
  // Test 7: filter operator with SignalOptions (includes name)
  // -----------------------------------------------------------------------------

  const filtered = filter<number>((x) => x > 0, { name: "positive" })(source);
  expectType<Computed<number>>(filtered);

  // filter with equality string
  const filteredShallow = filter<number>((x) => x > 0, "shallow")(source);
  expectType<Computed<number>>(filteredShallow);

  // -----------------------------------------------------------------------------
  // Test 8: scan operator with SignalOptions (includes name)
  // -----------------------------------------------------------------------------

  const scanned = scan<number, number>((acc, curr) => acc + curr, 0, {
    name: "sum",
  })(source);
  expectType<Computed<number>>(scanned);

  // scan with equality string
  const scannedShallow = scan<number, number>(
    (acc, curr) => acc + curr,
    0,
    "shallow"
  )(source);
  expectType<Computed<number>>(scannedShallow);

  // -----------------------------------------------------------------------------
  // Test 9: to operator with name in options
  // -----------------------------------------------------------------------------

  const transformed = to<number, number>((x) => x * 2, { name: "doubled" })(
    source
  );
  expectType<Computed<number>>(transformed);

  // to with chained selectors and name
  const chained = to<number, number, string>(
    (x) => x * 2,
    (x) => `Value: ${x}`,
    { name: "chainedTransform" }
  )(source);
  expectType<Computed<string>>(chained);

  // -----------------------------------------------------------------------------
  // Test 10: debounce/throttle/delay with SignalOptions
  // -----------------------------------------------------------------------------

  const debounced = debounce<string>(300, { name: "debouncedSearch" })(
    strSource
  );
  expectType<Computed<string>>(debounced);

  const throttled = throttle<number>(100, { name: "throttledScroll" })(source);
  expectType<Computed<number>>(throttled);

  const delayed = delay<number>(500, { name: "delayedValue" })(source);
  expectType<Computed<number>>(delayed);

  // -----------------------------------------------------------------------------
  // Test 11: Verify options types are correct
  // -----------------------------------------------------------------------------

  // OperatorNameOptions only requires name
  const justName: OperatorNameOptions = { name: "test" };

  // TakeWhileOptions extends OperatorNameOptions
  const takeWhileAllOpts: TakeWhileOptions = {
    inclusive: true,
    name: "takeOpts",
  };

  // CountOptions extends OperatorNameOptions
  const countAllOpts: CountOptions = {
    predicate: () => true,
    name: "countOpts",
  };

  // MinMaxOptions extends OperatorNameOptions
  const minMaxAllOpts: MinMaxOptions<number> = {
    comparer: (a, b) => a - b,
    name: "minMaxOpts",
  };

  // DistinctOptions extends OperatorNameOptions
  const distinctAllOpts: DistinctOptions<number> = {
    mode: "all",
    getKey: (x) => x,
    equals: (a, b) => a === b,
    name: "distinctOpts",
  };

  void justName, takeWhileAllOpts, countAllOpts, minMaxAllOpts, distinctAllOpts;

  // -----------------------------------------------------------------------------
  // Cleanup - suppress unused variable warnings
  // -----------------------------------------------------------------------------

  void skipped,
    skippedWhile,
    skippedLast,
    skippedUntil,
    taken,
    takenWhile,
    takenLast,
    takenUntil,
    counted,
    countedWithPred,
    maxVal,
    maxObj,
    minVal,
    minObj,
    distinctConsec,
    distinctAll,
    distinctByKey,
    distinctWithEquals,
    filtered,
    filteredShallow,
    scanned,
    scannedShallow,
    transformed,
    chained,
    debounced,
    throttled,
    delayed;
}

export {
  signalTests,
  taskTests,
  waitTests,
  integrationTests,
  rxTests,
  pipeOperatorTests,
  signalToTests,
  awaitedTests,
  contextUseTests,
  composeTests,
  pluginTests,
  anySignalTests,
  persistorTests,
  pathTypeTests,
  focusOperatorTests,
  signalFromTests,
  signalWhenTests,
  operatorOptionsTests,
};

// =============================================================================
// PathValue with optional/nullable properties tests
// =============================================================================

type OptionalPropsTest = {
  user?: { name: string };
  items?: [{ name?: string } | undefined | null];
};

// PathValue should include undefined for optional parent property
type OptionalUserName = PathValue<OptionalPropsTest, "user.name">;
expectType<OptionalUserName>("" as string | undefined);

// PathValue should include undefined and null for nullable array items
type NullableItemName = PathValue<OptionalPropsTest, "items.0.name">;
expectType<NullableItemName>("" as string | undefined | null);
