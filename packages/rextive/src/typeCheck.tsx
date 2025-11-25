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

import type { ReactNode } from "react";
import { rx } from "./react/rx";
import { signal } from "./signal";
import { loadable } from "./utils/loadable";
import { wait, type Awaitable, type AwaitedFromAwaitable } from "./wait";
import { awaited } from "./awaited";
import { compose } from "./utils/compose";
// Operators imported when needed for type checking
// import { select, scan, filter } from "./operators";
import type {
  Signal,
  MutableSignal,
  ComputedSignal,
  SignalContext,
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
// Promise declarations (for loadable/wait tests)
// -----------------------------------------------------------------------------

declare const promiseNumber: PromiseLike<number>;
declare const promiseString: PromiseLike<string>;
declare const promiseUser: PromiseLike<{ id: number; name: string }>;
declare const promiseNum: Promise<number>;
declare const promiseStr: Promise<string>;

// -----------------------------------------------------------------------------
// Loadable declarations
// -----------------------------------------------------------------------------

declare const loadableNumber: Loadable<number>;
declare const loadableString: Loadable<string>;
declare const userLoadable: Loadable<UserType>;
declare const userPromise: Promise<UserType>;
declare const userSignal: Signal<Loadable<UserType>>;

// -----------------------------------------------------------------------------
// Signal declarations (for wait tests)
// -----------------------------------------------------------------------------

declare const signalLoadableNumber: Signal<Loadable<number>>;
declare const signalPromiseNumber: Signal<Promise<number>>;
declare const signalNumberAwaitable: Signal<Promise<number> | Loadable<number>>;
declare const signalStringAwaitable: Signal<Promise<string> | Loadable<string>>;

// -----------------------------------------------------------------------------
// Basic signal instances
// -----------------------------------------------------------------------------

const count = signal(0);

const user = signal({ id: 1, name: "Alice", email: "alice@example.com" });
const postIds = signal([1, 2, 3]);
const posts = signal([
  { id: 1, title: "Post 1" },
  { id: 2, title: "Post 2" },
]);

// .map() and .scan() methods removed - use select/scan operators from rextive/op instead

// -----------------------------------------------------------------------------
// Loadable instances
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Wait/Awaitable instances
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Integration test instances
// -----------------------------------------------------------------------------

const sigWithLoadable = signal(loadable.success(42));
const loadable1 = loadable.success(1);
const loadable2 = loadable.success(2);

const mixedArray = wait([sigWithLoadable, loadable1, loadable2]);
const singleSig = wait(sigWithLoadable);
const promiseResultSig = wait(sigWithLoadable, (value) => value.value);

const mixedRecord = wait({
  sig: sigWithLoadable,
  loadable: loadable1,
  promise: promiseNumber,
});

const userResultFromSignal = wait(userSignal);
const usersArray = wait([userLoadable, userPromise, userSignal]);
const usersRecord = wait({
  loadable: userLoadable,
  promise: userPromise,
  signal: userSignal,
});

const transformedUser = wait(userSignal, (user) => {
  if (user.status === "success") {
    return user.value.name;
  }
  return "";
});

// -----------------------------------------------------------------------------
// React/rx instances
// -----------------------------------------------------------------------------

const name = signal("John");
const loading = signal(Promise.resolve("Hello"));

const staticWithWatch = rx(() => <div>Count: {5}</div>, {
  watch: [5],
});

const staticWithMultiWatch = rx(
  () => {
    const x = 10;
    const y = 20;
    return (
      <div>
        {x} + {y}
      </div>
    );
  },
  {
    watch: [10, 20],
  }
);

const singleNumber = rx(count);
const singleString = rx(name);
const singleObject = rx(user);
const singleArray = rx(postIds);

const singleWithWatch = rx(count, {
  watch: [5],
});

const multi1 = rx({ count, name }, (value) => {
  expectType<{ count: number; name: string }>(value);
  return (
    <div>
      {value.count}: {value.name}
    </div>
  );
});

const multi2 = rx({ user }, (value) => {
  expectType<{ user: { id: number; name: string; email: string } }>(value);
  return (
    <div>
      <h1>{value.user.name}</h1>
      <p>{value.user.email}</p>
    </div>
  );
});

const multi3 = rx({ posts }, (value) => {
  expectType<{ posts: Array<{ id: number; title: string }> }>(value);
  return (
    <ul>
      {value.posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
});

const withLoadable1 = rx({ count }, (_, loadable) => {
  expectType<{ count: Loadable<number> }>(loadable);

  if (loadable.count.status === "loading") {
    return <div>Loading...</div>;
  }

  if (loadable.count.status === "error") {
    return <div>Error: {String(loadable.count.error)}</div>;
  }

  return <div>Count: {loadable.count.value}</div>;
});

const withLoadable2 = rx({ loading }, (_, loadable) => {
  expectType<{
    loading: Loadable<string>;
  }>(loadable);

  if (loadable.loading.loading) {
    return <div>Loading...</div>;
  }

  return <div>{loadable.loading.value}</div>;
});

const withBoth = rx({ count, name }, (value, loadable) => {
  expectType<{ count: number; name: string }>(value);
  expectType<{
    count: Loadable<number>;
    name: Loadable<string>;
  }>(loadable);

  // Use loadable for conditional rendering
  if (loadable.name.loading) {
    return <div>Loading name...</div>;
  }

  // Use value for direct access (will suspend if needed)
  return (
    <div>
      Count: {value.count}, Name: {value.name}
    </div>
  );
});

const withWatch1 = rx(
  { count, name },
  (value) => (
    <div>
      {value.count}: {value.name}
    </div>
  ),
  {
    watch: [],
  }
);

const withWatch2 = rx({ count }, (value) => <div>{value.count}</div>, {
  watch: ["some", "deps"],
});

const complex1 = rx(
  {
    count,
    name,
    user,
    posts,
  },
  (value) => {
    expectType<{
      count: number;
      name: string;
      user: { id: number; name: string; email: string };
      posts: Array<{ id: number; title: string }>;
    }>(value);

    return (
      <div>
        <h1>{value.user.name}</h1>
        <p>Count: {value.count}</p>
        <p>Name: {value.name}</p>
        <ul>
          {value.posts.map((post) => (
            <li key={post.id}>{post.title}</li>
          ))}
        </ul>
      </div>
    );
  }
);

const complex2 = rx({ user, posts }, (value) => {
  const renderPosts = () =>
    value.posts.map((post) => <li key={post.id}>{post.title}</li>);

  return (
    <div>
      <header>
        <h1>{value.user.name}</h1>
      </header>
      <main>
        <ul>{renderPosts()}</ul>
      </main>
    </div>
  );
});

const conditional1 = rx({ count, name }, (value) => {
  if (value.count > 10) {
    return <div>High: {value.name}</div>;
  }
  return <div>Low: {value.name}</div>;
});

const conditional2 = rx({ user }, (value, loadable) => {
  if (loadable.user.status === "loading") {
    return <div>Loading user...</div>;
  }

  if (loadable.user.status === "error") {
    return <div>Error loading user</div>;
  }

  // Safe to use value here since we checked loadable
  return <div>Welcome, {value.user.name}!</div>;
});

const earlyReturn = rx({ count }, (value, loadable) => {
  if (loadable.count.loading) return <div>Loading...</div>;
  if (loadable.count.status === "error") return <div>Error</div>;

  return <div>{value.count}</div>;
});

const emptySignals = rx({}, (value) => {
  expectType<{}>(value);
  return <div>No signals</div>;
});

const singleInObject = rx({ count }, (value) => {
  expectType<{ count: number }>(value);
  return <div>{value.count}</div>;
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

  expectType<MutableSignal<unknown, undefined>>(noArgSignal);
  expectType<unknown | undefined>(noArgSignal());

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
  expectType<MutableSignal<number>>(numberSignal);
  expectType<number>(numberSignal());

  expectType<MutableSignal<string>>(stringSignal);
  expectType<string>(stringSignal());

  expectType<MutableSignal<boolean>>(booleanSignal);
  expectType<boolean>(booleanSignal());

  // Object values
  expectType<MutableSignal<{ name: string; age: number }>>(objectSignal);
  expectType<{ name: string; age: number }>(objectSignal());

  // Array values
  expectType<MutableSignal<number[]>>(arraySignal);
  expectType<number[]>(arraySignal());

  // -----------------------------------------------------------------------------
  // Overload 2: signal(lazyFn) - with lazy initializer
  // -----------------------------------------------------------------------------

  expectType<MutableSignal<number>>(lazySignal);
  expectType<number>(lazySignal());

  // Lazy with complex return type
  expectType<
    MutableSignal<{
      user: { id: number; name: string };
      posts: number[];
    }>
  >(lazyObjectSignal);

  // -----------------------------------------------------------------------------
  // Overload 2: signal(value, equals) - with equality string shortcut
  // -----------------------------------------------------------------------------

  expectType<MutableSignal<{ name: string }>>(signalShallow);

  expectType<MutableSignal<{ nested: { value: number } }>>(signalDeep);

  expectType<MutableSignal<number>>(signalIs);

  // @ts-expect-error - custom equals function not allowed as second arg (use options)
  const signalCustomEquals = signal(42, (a, b) => a === b);

  // -----------------------------------------------------------------------------
  // Overload 2: signal(value, options) - with options
  // -----------------------------------------------------------------------------

  expectType<MutableSignal<number>>(signalWithEquals);

  expectType<MutableSignal<string>>(signalWithName);

  expectType<MutableSignal<number>>(signalWithFallback);

  expectType<MutableSignal<number>>(signalWithCallbacks);

  // -----------------------------------------------------------------------------
  // Overload 3: signal(deps, compute) - with dependencies
  // -----------------------------------------------------------------------------

  expectType<ComputedSignal<number>>(doubled);
  expectType<number>(doubled());

  // Multiple dependencies
  expectType<ComputedSignal<string>>(fullName);
  expectType<string>(fullName());

  // Dependencies with different types
  expectType<ComputedSignal<{ userName: string; postCount: number }>>(summary);
  expectType<{ userName: string; postCount: number }>(summary());

  // -----------------------------------------------------------------------------
  // Overload 3: signal(deps, compute, equals) - with equality string shortcut
  // -----------------------------------------------------------------------------

  expectType<ComputedSignal<{ full: string }>>(computedShallow);

  expectType<
    ComputedSignal<{
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

  expectType<ComputedSignal<number>>(computedWithOptions);

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

  // .map() and .scan() methods removed - use select/scan operators from rextive/op instead

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
  expectType<MutableSignal<number>>(a);
  expectType<ComputedSignal<number>>(b);
  expectType<ComputedSignal<number>>(c);
  expectType<number>(c());
}

// =============================================================================
// LOADABLE API TYPE CHECKS
// =============================================================================

function loadableTests() {
  // Clone variables from global scope
  const loadingNumber = loadable.loading(promiseNumber);
  const loadingString = loadable.loading(promiseString);
  const loadingUser = loadable.loading(promiseUser);
  const successNumber = loadable.success(42);
  const successString = loadable.success("hello");
  const successUser = loadable.success({ id: 1, name: "Alice" });
  const successArray = loadable.success([1, 2, 3]);
  const successWithPromise = loadable.success(100, Promise.resolve(100));
  const errorWithError = loadable.error(new Error("Something failed"));
  const errorWithString = loadable.error("Error message");
  const errorWithNumber = loadable.error(404);
  const errorTyped = loadable.error<string>(new Error("Failed to load string"));
  const errorWithPromise = loadable.error<number>(
    new Error("Failed"),
    Promise.reject(new Error("Failed"))
  );
  const unknownValue: unknown = { status: "success", value: 42 };
  const maybeLoadable: unknown = successNumber;
  const getLoadNumber = loadable.get(promiseNumber);
  const getLoadString = loadable.get(promiseString);
  const getLoadUser = loadable.get(promiseUser);
  const setLoad1 = loadable.set(promiseNumber, successNumber);
  const setLoad2 = loadable.set(promiseString, loadingString);
  const setLoad3 = loadable.set(
    promiseUser,
    loadable.error<{ id: number; name: string }>(new Error("Failed"))
  );
  const norm1 = loadable(42);
  const norm2 = loadable(promiseNumber);
  const norm3 = loadable(successNumber);
  const norm4 = loadable({ id: 1, name: "Alice" });
  const norm5 = loadable(null);
  const norm6 = loadable(undefined);
  const testLoadable: Loadable<number> = successNumber as any;

  // -----------------------------------------------------------------------------
  // loadable.loading(promise) - LoadingLoadable
  // -----------------------------------------------------------------------------

  expectType<LoadingLoadable<number>>(loadingNumber);
  expectType<"loading">(loadingNumber.status);
  expectType<PromiseLike<number>>(loadingNumber.promise);
  expectType<undefined>(loadingNumber.value);
  expectType<undefined>(loadingNumber.error);
  expectType<true>(loadingNumber.loading);

  expectType<LoadingLoadable<string>>(loadingString);
  expectType<"loading">(loadingString.status);
  expectType<PromiseLike<string>>(loadingString.promise);

  expectType<LoadingLoadable<{ id: number; name: string }>>(loadingUser);
  expectType<"loading">(loadingUser.status);
  expectType<PromiseLike<{ id: number; name: string }>>(loadingUser.promise);

  // -----------------------------------------------------------------------------
  // loadable.success(value) - SuccessLoadable
  // -----------------------------------------------------------------------------

  expectType<SuccessLoadable<number>>(successNumber);
  expectType<"success">(successNumber.status);
  expectType<number>(successNumber.value);
  expectType<undefined>(successNumber.error);
  expectType<false>(successNumber.loading);
  expectType<PromiseLike<number>>(successNumber.promise);

  expectType<SuccessLoadable<string>>(successString);
  expectType<"success">(successString.status);
  expectType<string>(successString.value);

  expectType<SuccessLoadable<{ id: number; name: string }>>(successUser);
  expectType<"success">(successUser.status);
  expectType<{ id: number; name: string }>(successUser.value);

  expectType<SuccessLoadable<number[]>>(successArray);
  expectType<"success">(successArray.status);
  expectType<number[]>(successArray.value);

  // With explicit promise
  expectType<SuccessLoadable<number>>(successWithPromise);
  expectType<number>(successWithPromise.value);
  expectType<PromiseLike<number>>(successWithPromise.promise);

  // -----------------------------------------------------------------------------
  // loadable.error(error) - ErrorLoadable
  // -----------------------------------------------------------------------------

  expectType<ErrorLoadable<any>>(errorWithError);
  expectType<"error">(errorWithError.status);
  expectType<unknown>(errorWithError.error);
  expectType<undefined>(errorWithError.value);
  expectType<false>(errorWithError.loading);
  expectType<PromiseLike<any>>(errorWithError.promise);

  expectType<ErrorLoadable<any>>(errorWithString);
  expectType<"error">(errorWithString.status);
  expectType<unknown>(errorWithString.error);

  expectType<ErrorLoadable<any>>(errorWithNumber);
  expectType<"error">(errorWithNumber.status);
  expectType<unknown>(errorWithNumber.error);

  // With explicit type parameter
  expectType<ErrorLoadable<string>>(errorTyped);
  expectType<"error">(errorTyped.status);
  expectType<unknown>(errorTyped.error);

  // With explicit promise
  expectType<ErrorLoadable<number>>(errorWithPromise);
  expectType<unknown>(errorWithPromise.error);
  expectType<PromiseLike<number>>(errorWithPromise.promise);

  // -----------------------------------------------------------------------------
  // loadable.is() type guard
  // -----------------------------------------------------------------------------

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

  expectType<Loadable<number>>(getLoadNumber);
  // First call creates loading, subsequent calls may return success/error
  expectType<"loading" | "success" | "error">(getLoadNumber.status);

  expectType<Loadable<string>>(getLoadString);

  expectType<Loadable<{ id: number; name: string }>>(getLoadUser);

  // -----------------------------------------------------------------------------
  // loadable.set() - Associate loadable with promise
  // -----------------------------------------------------------------------------

  expectType<SuccessLoadable<number>>(setLoad1);

  expectType<LoadingLoadable<string>>(setLoad2);

  expectType<ErrorLoadable<{ id: number; name: string }>>(setLoad3);

  // -----------------------------------------------------------------------------
  // loadable() - Normalize any value to loadable
  // -----------------------------------------------------------------------------

  // From plain value
  expectType<Loadable<number>>(norm1);

  // From promise
  expectType<Loadable<number>>(norm2);

  // From existing loadable
  expectType<SuccessLoadable<number>>(norm3);

  // From object
  expectType<Loadable<{ id: number; name: string }>>(norm4);

  // From null/undefined
  expectType<Loadable<null>>(norm5);

  expectType<Loadable<undefined>>(norm6);

  // -----------------------------------------------------------------------------
  // Status narrowing with discriminated union
  // -----------------------------------------------------------------------------

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

  // -----------------------------------------------------------------------------
  // Complex loadable scenarios
  // -----------------------------------------------------------------------------

  void (function testComplexLoadableScenarios() {
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
  })();

  void (function testLoadableHelpers() {
    // Async function returning loadable
    async function fetchData(): Promise<Loadable<number>> {
      const data = await promiseNumber;
      return loadable.success(data);
    }

    const asyncResult = fetchData();
    expectType<PromiseLike<Loadable<number>>>(asyncResult);

    // Helper function to map loadable values
    function mapLoadable<T, U>(
      l: Loadable<T>,
      fn: (value: T) => U
    ): Loadable<U> {
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
    function recoverFromError<T>(
      l: Loadable<T>,
      recovery: T
    ): SuccessLoadable<T> {
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
  })();
}

// =============================================================================
// WAIT API TYPE CHECKS
// =============================================================================

function waitTests() {
  // Clone variables from global scope
  const awaitableNumber: Awaitable<number> =
    loadableNumber ?? promiseNumber ?? signalNumberAwaitable;
  const awaitableString: Awaitable<string> =
    loadableString ?? promiseString ?? signalStringAwaitable;
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

  // Test Loadable type extraction using Awaited<Loadable["promise"]>
  expectType<number>(0 as AwaitedFromAwaitable<typeof loadableNumber>);

  expectType<string>("" as AwaitedFromAwaitable<typeof loadableString>);

  // Test Promise type extraction
  expectType<number>(0 as AwaitedFromAwaitable<typeof promiseNum>);

  expectType<string>("" as AwaitedFromAwaitable<typeof promiseStr>);

  // Test Signal wrapping Loadable
  expectType<number>(0 as AwaitedFromAwaitable<typeof signalLoadableNumber>);

  // Test Signal wrapping Promise
  expectType<number>(0 as AwaitedFromAwaitable<typeof signalPromiseNumber>);

  // Test Signal wrapping union of Promise and Loadable
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

  // Test single signal with loadable
  expectType<number>(singleSig);

  // Test with promise callbacks
  expectType<Promise<number>>(promiseResultSig);

  // Test record with mixed types
  expectType<{
    sig: number;
    loadable: number;
    promise: number;
  }>(mixedRecord);

  // Complex transformation
  expectType<UserType>(userResultFromSignal);

  expectType<readonly [UserType, UserType, UserType]>(usersArray);

  expectType<{
    loadable: UserType;
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
  // ---------------------------------------------------------------------------
  // Overload 1: rx(render, options) - Static with options
  // ---------------------------------------------------------------------------

  // Static with watch dependencies
  expectType<ReactNode>(staticWithWatch);

  // Static with multiple watch deps
  expectType<ReactNode>(staticWithMultiWatch);

  // ---------------------------------------------------------------------------
  // Overload 2: rx(signal) - Single signal shorthand
  // ---------------------------------------------------------------------------

  // Number signal
  expectType<ReactNode>(singleNumber);

  // String signal
  expectType<ReactNode>(singleString);

  // Object signal - should render the object value
  expectType<ReactNode>(singleObject);

  // Array signal
  expectType<ReactNode>(singleArray);

  // ---------------------------------------------------------------------------
  // Overload 2: rx(signal, options) - Single signal with options
  // ---------------------------------------------------------------------------

  // Single signal with watch
  expectType<ReactNode>(singleWithWatch);

  // ---------------------------------------------------------------------------
  // Overload 3: rx(signals, render) - Multiple signals with value access
  // ---------------------------------------------------------------------------

  // Simple value access
  expectType<ReactNode>(multi1);

  // Value with object signal
  expectType<ReactNode>(multi2);

  // Value with array signal
  expectType<ReactNode>(multi3);

  // ---------------------------------------------------------------------------
  // Overload 3: rx(signals, render) - Using loadable for manual control
  // ---------------------------------------------------------------------------

  // Loadable access for loading states
  expectType<ReactNode>(withLoadable1);

  // Loadable with promise signal
  expectType<ReactNode>(withLoadable2);

  // Using both value and loadable
  expectType<ReactNode>(withBoth);

  // ---------------------------------------------------------------------------
  // Overload 3: rx(signals, render, options) - With watch dependencies
  // ---------------------------------------------------------------------------

  // With watch option
  expectType<ReactNode>(withWatch1);

  // With multiple watch deps
  expectType<ReactNode>(withWatch2);

  // ---------------------------------------------------------------------------
  // Complex scenarios
  // ---------------------------------------------------------------------------

  // Multiple signals of different types
  expectType<ReactNode>(complex1);

  // Nested JSX
  expectType<ReactNode>(complex2);

  // Conditional rendering with value
  expectType<ReactNode>(conditional1);

  // Conditional rendering with loadable
  expectType<ReactNode>(conditional2);

  // Early return patterns
  expectType<ReactNode>(earlyReturn);

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  // Empty signals object
  expectType<ReactNode>(emptySignals);

  // Single signal in signals object
  expectType<ReactNode>(singleInObject);
}

// =============================================================================
// SIGNAL OPERATORS TYPE CHECKS (.pipe() method)
// =============================================================================

// Import operators (commented out to avoid runtime issues)
// import { select, scan, filter } from "./operators";

// For type checking, we'll use inline operator definitions
type SelectOp = <T, U>(
  fn: (value: T) => U
) => (source: Signal<T>) => ComputedSignal<U>;
type ScanOp = <T, U>(
  fn: (acc: U, value: T) => U,
  initial: U
) => (source: Signal<T>) => ComputedSignal<U>;
type FilterOp = <T>(
  fn: (value: T) => boolean
) => (source: Signal<T>) => ComputedSignal<T>;

declare const selectOp: SelectOp;
declare const scanOp: ScanOp;
declare const filterOp: FilterOp;

function pipeOperatorTests() {
  // Single operator
  const countSignal = signal(5);

  // select: number -> string
  const result1 = countSignal.pipe(selectOp((x) => `Count: ${x}`));
  expectType<ComputedSignal<string>>(result1);
  expectType<string>(result1());

  // scan: accumulate numbers
  const result2 = countSignal.pipe(scanOp((sum, x) => sum + x, 0));
  expectType<ComputedSignal<number>>(result2);
  expectType<number>(result2());

  // filter: keep only positive
  const result3 = countSignal.pipe(filterOp((x) => x > 0));
  expectType<ComputedSignal<number>>(result3);
  expectType<number>(result3());

  // Multiple operators - type transformation chain
  // number -> number -> string
  const chain1 = countSignal.pipe(
    selectOp((x) => x * 2), // number -> number
    selectOp((x) => `Result: ${x}`) // number -> string
  );
  expectType<ComputedSignal<string>>(chain1);
  expectType<string>(chain1());

  // number -> number -> number -> string
  const chain2 = countSignal.pipe(
    selectOp((x: number) => x * 2), // number -> number
    selectOp((x: number) => x + 1), // number -> number
    selectOp((x: number) => `Value: ${x}`) // number -> string
  );
  expectType<ComputedSignal<string>>(chain2);
  expectType<string>(chain2());

  // Complex type transformations
  interface Person {
    id: number;
    name: string;
    age: number;
  }

  const personSignal = signal<Person>({ id: 1, name: "Alice", age: 30 });

  // Person -> string
  const personName = personSignal.pipe(selectOp((u) => u.name));
  expectType<ComputedSignal<string>>(personName);
  expectType<string>(personName());

  // Person -> { name: string } -> string
  const personNameChain = personSignal.pipe(
    selectOp((u: Person) => ({ name: u.name })),
    selectOp((obj: { name: string }) => obj.name)
  );
  expectType<ComputedSignal<string>>(personNameChain);
  expectType<string>(personNameChain());

  // Array transformations
  const numbersSignal = signal([1, 2, 3]);

  // Array<number> -> Array<number>
  const doubledArray = numbersSignal.pipe(
    selectOp((arr) => arr.map((x) => x * 2))
  );
  expectType<ComputedSignal<number[]>>(doubledArray);
  expectType<number[]>(doubledArray());

  // Array<number> -> number (sum)
  const sum = numbersSignal.pipe(
    selectOp((arr) => arr.reduce((a, b) => a + b, 0))
  );
  expectType<ComputedSignal<number>>(sum);
  expectType<number>(sum());

  // Mixed operators
  // select -> filter -> scan
  const mixed1 = countSignal.pipe(
    selectOp((x: number) => x * 2), // number -> number
    filterOp((x: number) => x > 5), // number -> number
    scanOp((acc: number, x: number) => acc + x, 0) // number -> number
  );
  expectType<ComputedSignal<number>>(mixed1);
  expectType<number>(mixed1());

  // Operator returning signal (custom operator)
  const customOp = null as unknown as <T extends number>(
    s: Signal<T>
  ) => ComputedSignal<string>;

  const custom1 = countSignal.pipe(customOp);
  expectType<ComputedSignal<string>>(custom1);
  expectType<string>(custom1());

  // Chain with custom operator
  const custom2 = countSignal.pipe(
    selectOp((x: number) => x * 2),
    customOp
  );
  expectType<ComputedSignal<string>>(custom2);
  expectType<string>(custom2());

  // Type inference through chains
  // 3 operators: number -> number -> number -> string
  const chain3Ops = countSignal.pipe(
    selectOp((x: number) => x * 2), // number -> number
    selectOp((x: number) => x + 1), // number -> number
    selectOp((x: number) => `Value: ${x}`) // number -> string
  );
  expectType<ComputedSignal<string>>(chain3Ops);
  expectType<string>(chain3Ops());

  // 4 operators: number -> number -> number -> number -> string
  const chain4Ops = countSignal.pipe(
    selectOp((x: number) => x * 2), // number -> number
    selectOp((x: number) => x + 1), // number -> number
    selectOp((x: number) => x - 1), // number -> number
    selectOp((x: number) => `Result: ${x}`) // number -> string
  );
  expectType<ComputedSignal<string>>(chain4Ops);
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
  expectType<ComputedSignal<string>>(userName);

  // Two selectors
  const upperName = userSig.to(
    (u) => u.name,
    (name) => name.toUpperCase()
  );
  expectType<ComputedSignal<string>>(upperName);

  // Three selectors with type changes
  const greeting = userSig.to(
    (u) => u.name, // string
    (name) => name.toUpperCase(), // string
    (name) => `Hello, ${name}!` // string
  );
  expectType<ComputedSignal<string>>(greeting);

  // Type transformation chain
  const ageString = userSig.to(
    (u) => u.age, // number
    (age) => age.toString(), // string
    (str) => str.length // number
  );
  expectType<ComputedSignal<number>>(ageString);

  // Complex object transformations
  const transformed = userSig.to(
    (u) => ({ fullName: u.name, years: u.age }), // { fullName: string, years: number }
    (obj) => obj.fullName, // string
    (name) => name.split(" "), // string[]
    (parts) => parts[0] // string | undefined
  );
  expectType<ComputedSignal<string | undefined>>(transformed);

  // Array operations
  const arraySig = signal([1, 2, 3, 4, 5]);

  const arrayResult = arraySig.to(
    (arr: number[]) => arr.filter((x: number) => x > 2), // number[]
    (arr: number[]) => arr.map((x: number) => x * 2), // number[]
    (arr: number[]) => arr.reduce((a: number, b: number) => a + b, 0) // number
  );
  expectType<ComputedSignal<number>>(arrayResult);

  // With computed signals
  const computedUser = signal({ userSig }, ({ deps }) => deps.userSig);

  const computedGreeting = computedUser.to(
    (u) => u.name,
    (name) => `Hi, ${name}`
  );
  expectType<ComputedSignal<string>>(computedGreeting);

  // Chaining with numbers
  const numSig = signal(42);

  const numChain = numSig.to(
    (x) => x * 2, // 84
    (x) => x + 10, // 94
    (x) => x / 2, // 47
    (x) => Math.floor(x) // 47
  );
  expectType<ComputedSignal<number>>(numChain);

  // Boolean transformations
  const boolChain = numSig.to(
    (x) => x > 50, // boolean
    (bool) => !bool, // boolean
    (bool) => (bool ? "yes" : "no") // string
  );
  expectType<ComputedSignal<string>>(boolChain);

  // Nullable values
  const nullableSig = signal<string | null>("test");

  const nullableChain = nullableSig.to(
    (str) => str?.toUpperCase(), // string | undefined
    (str) => str ?? "default" // string
  );
  expectType<ComputedSignal<string>>(nullableChain);

  // Union types
  const unionSig = signal<number | string>(42);

  const unionChain = unionSig.to(
    (val) => (typeof val === "number" ? val * 2 : val.length), // number
    (num) => num.toString() // string
  );
  expectType<ComputedSignal<string>>(unionChain);
}

// =============================================================================
// awaited() helper - Promise/non-promise value selector
// =============================================================================

function awaitedTests() {
  // Non-promise values (sync)
  const dataSig = signal(5);
  const doubled = dataSig.to(awaited((x) => x * 2));
  expectType<ComputedSignal<number>>(doubled);
  expectType<number>(doubled());

  // Promise values (async)
  const promiseSig = signal(Promise.resolve(5));
  const promiseDoubled = promiseSig.to(awaited((x) => x * 2));
  expectType<ComputedSignal<Promise<number>>>(promiseDoubled);

  // Mixed promise/non-promise values
  const mixedSig = signal<number | Promise<number>>(5);
  const mixedDoubled = mixedSig.to(awaited((x) => x * 2));
  expectType<ComputedSignal<number | Promise<number>>>(mixedDoubled);

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
  expectType<ComputedSignal<Promise<string[]>>>(titles);

  // Object transformations
  const userPromiseSig = signal(
    Promise.resolve({ id: 1, name: "Alice", age: 30 })
  );

  const userName = userPromiseSig.to(awaited((u) => u.name));
  expectType<ComputedSignal<Promise<string>>>(userName);

  // Chaining multiple awaited selectors
  const chainedResult = promiseSig.to(
    awaited(
      (x) => x * 2,
      (x) => x + 1,
      (x) => `Value: ${x}`
    )
  );
  expectType<ComputedSignal<Promise<string>>>(chainedResult);

  // Type transformation chain with multiple awaited selectors
  const typeChain = promiseSig.to(
    awaited(
      (x) => x * 2, // number -> number
      (x) => x + 1, // number -> number
      (x) => `Value: ${x}` // number -> string
    )
  );
  expectType<ComputedSignal<Promise<string>>>(typeChain);

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
  expectType<ComputedSignal<string>>(topUserSync);

  // Async selector function
  const asyncResult = dataSig.to(
    awaited(async (x) => {
      await Promise.resolve();
      return x * 2;
    })
  );
  expectType<ComputedSignal<Promise<number>>>(asyncResult);

  // With .pipe() and select operator
  const pipeResult = promiseSig.pipe(selectOp(awaited((x) => x * 2)));
  expectType<ComputedSignal<Promise<number>>>(pipeResult);
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
  expectType<ComputedSignal<number>>(computed1);

  // With additional arguments
  const computed2 = signal({ count }, (context) => {
    const multiply = (ctx: typeof context, factor: number) => {
      return ctx.deps.count * factor;
    };
    return context.use(multiply, 5);
  });
  expectType<ComputedSignal<number>>(computed2);

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
  expectType<ComputedSignal<string>>(computed3);

  // Async logic function
  const computed4 = signal({ count }, async (context) => {
    return await context.use(async (ctx) => {
      return ctx.deps.count * 2;
    });
  });
  expectType<ComputedSignal<Promise<number>>>(computed4);

  // Async with arguments
  const computed5 = signal({ count }, async (context) => {
    const multiply = async (ctx: typeof context, factor: number) => {
      return ctx.deps.count * factor;
    };
    return await context.use(multiply, 5);
  });
  expectType<ComputedSignal<Promise<number>>>(computed5);

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
  expectType<ComputedSignal<number>>(computed6);

  // Nested use calls
  const computed7 = signal({ count }, (context) => {
    return context.use((ctx) => {
      const step1 = ctx.use((innerCtx) => innerCtx.deps.count * 2);
      const step2 = ctx.use((_innerCtx) => step1 + 10);
      return step2;
    });
  });
  expectType<ComputedSignal<number>>(computed7);

  // With cleanup
  const computed8 = signal({ count }, (context) => {
    return context.use((ctx) => {
      ctx.onCleanup(() => console.log("cleanup"));
      return ctx.deps.count * 2;
    });
  });
  expectType<ComputedSignal<number>>(computed8);

  // With run inside use
  const computed9 = signal({ count }, (context) => {
    return context.use((ctx) => {
      const step1 = ctx.safe(() => ctx.deps.count * 2);
      return step1;
    });
  });
  expectType<ComputedSignal<number>>(computed9);

  // Multiple dependencies
  const name = signal("Alice");
  const computed10 = signal({ count, name }, (context) => {
    return context.use((ctx) => {
      expectType<number>(ctx.deps.count);
      expectType<string>(ctx.deps.name);
      return `${ctx.deps.name}: ${ctx.deps.count}`;
    });
  });
  expectType<ComputedSignal<string>>(computed10);

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
  expectType<ComputedSignal<Promise<LocalUser>>>(computed11);

  // Array operations
  const items = signal([1, 2, 3]);
  const computed12 = signal({ items }, (context) => {
    return context.use((ctx) => {
      return ctx.deps.items.map((x) => x * 2);
    });
  });
  expectType<ComputedSignal<number[]>>(computed12);

  // Reusable logic function (using any for simplicity in type checks)
  const multiply = (ctx: any, factor: number) => ctx.deps.count * factor;
  const computed13 = signal({ count }, (context) => context.use(multiply, 3));
  const computed14 = signal({ count }, (context) => context.use(multiply, 5));
  expectType<ComputedSignal<number>>(computed13);
  expectType<ComputedSignal<number>>(computed14);
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
// Export test functions to avoid unused warnings
// (These are never actually called - this file is for type checking only)
// =============================================================================

export {
  signalTests,
  loadableTests,
  waitTests,
  integrationTests,
  rxTests,
  pipeOperatorTests,
  signalToTests,
  awaitedTests,
  contextUseTests,
  composeTests,
};
