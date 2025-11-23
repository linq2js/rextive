/**
 * wait.settled() Examples
 *
 * Demonstrates the wait.settled API which handles multiple awaitables
 * and returns PromiseSettledResult shapes (never throws/rejects).
 */

import { signal, wait } from "../src/index";
import { loadable } from "../src/utils/loadable";

// ============================================================================
// Example 1: Synchronous Mode (Suspense-style)
// ============================================================================

// wait.settled() sync mode:
// ✅ DOES throw promises while any awaitable is loading (Suspense-compatible)
// ❌ NEVER throws errors - failed awaitables become { status: "rejected", reason }

function SyncExample() {
  const user = signal(loadable("success", { name: "Alice", id: 1 }));
  const posts = signal(loadable("error", new Error("Failed to load")));
  const comments = signal(loadable("success", ["Great!", "Nice"]));

  // If any were "loading", this would throw a promise
  // Since all are complete (success or error), returns settled shapes immediately
  // Even though posts errored, we still get results for all (no error thrown)
  const results = wait.settled([user, posts, comments]);

  // results is:
  // [
  //   { status: "fulfilled", value: { name: "Alice", id: 1 } },
  //   { status: "rejected", reason: Error("Failed to load") },
  //   { status: "fulfilled", value: ["Great!", "Nice"] }
  // ]

  return (
    <div>
      {results.map((result, index) => (
        <div key={index}>
          {result.status === "fulfilled" ? (
            <div>Success: {JSON.stringify(result.value)}</div>
          ) : (
            <div>Error: {result.reason.message}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Example 2: Async Mode with Callback (Promise-based)
// ============================================================================

async function AsyncExample() {
  const userPromise = fetch("/api/user").then((r) => r.json());
  const postsPromise = fetch("/api/posts").then((r) => r.json());
  const commentsPromise = Promise.reject(new Error("API down"));

  // Async mode with onSettled callback
  // The promise NEVER rejects - it always resolves with the callback result
  const successfulResults = await wait.settled(
    [userPromise, postsPromise, commentsPromise],
    (settled) => {
      // Filter only successful results
      return settled
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value);
    }
  );

  console.log("Successful results:", successfulResults);
  // Only user and posts (comments failed)
}

// ============================================================================
// Example 3: Record of Awaitables
// ============================================================================

async function RecordExample() {
  const apis = {
    user: fetch("/api/user").then((r) => r.json()),
    posts: fetch("/api/posts").then((r) => r.json()),
    settings: Promise.reject(new Error("Settings unavailable")),
  };

  // Returns record with same keys, but PromiseSettledResult values
  const results = await wait.settled(apis, (settled) => {
    // Extract successful values into partial object
    const partial: Partial<{
      user: any;
      posts: any;
      settings: any;
    }> = {};

    for (const [key, result] of Object.entries(settled)) {
      if (result.status === "fulfilled") {
        partial[key as keyof typeof partial] = result.value;
      }
    }

    return partial;
  });

  // results = { user: {...}, posts: [...] }
  // settings is omitted because it failed
}

// ============================================================================
// Example 4: Counting Successes and Failures
// ============================================================================

async function CountExample() {
  const operations = [
    Promise.resolve("op1"),
    Promise.reject("op2 failed"),
    Promise.resolve("op3"),
    Promise.reject("op4 failed"),
    Promise.resolve("op5"),
  ];

  const stats = await wait.settled(operations, (results) => {
    const fulfilled = results.filter((r) => r.status === "fulfilled").length;
    const rejected = results.filter((r) => r.status === "rejected").length;

    return {
      total: results.length,
      fulfilled,
      rejected,
      successRate: (fulfilled / results.length) * 100,
    };
  });

  console.log(stats);
  // { total: 5, fulfilled: 3, rejected: 2, successRate: 60 }
}

// ============================================================================
// Example 5: Fallback Values for Failures
// ============================================================================

async function FallbackExample() {
  const requests = {
    primary: fetch("/api/primary").then((r) => r.json()),
    backup: fetch("/api/backup").then((r) => r.json()),
    cache: Promise.resolve({ cached: true }),
  };

  const data = await wait.settled(requests, (settled) => {
    // Try primary, then backup, then cache
    if (settled.primary.status === "fulfilled") {
      return settled.primary.value;
    }
    if (settled.backup.status === "fulfilled") {
      return settled.backup.value;
    }
    if (settled.cache.status === "fulfilled") {
      return settled.cache.value;
    }
    // All failed
    return { error: "All sources failed" };
  });

  return data;
}

// ============================================================================
// Example 6: Validation - Require All Success or Report Errors
// ============================================================================

async function ValidationExample() {
  const validations = {
    email: validateEmail("user@example.com"),
    password: validatePassword("secret123"),
    age: validateAge(25),
  };

  const result = await wait.settled(validations, (settled) => {
    const errors: Record<string, string> = {};

    for (const [key, result] of Object.entries(settled)) {
      if (result.status === "rejected") {
        errors[key] = result.reason.message;
      }
    }

    if (Object.keys(errors).length > 0) {
      return { valid: false, errors };
    }

    // All succeeded
    const values: Record<string, any> = {};
    for (const [key, result] of Object.entries(settled)) {
      if (result.status === "fulfilled") {
        values[key] = result.value;
      }
    }

    return { valid: true, values };
  });

  if (!result.valid) {
    console.error("Validation errors:", result.errors);
  } else {
    console.log("All valid:", result.values);
  }
}

// Helper validation functions
function validateEmail(email: string) {
  return Promise.resolve(email.includes("@"));
}
function validatePassword(password: string) {
  return password.length >= 8
    ? Promise.resolve(true)
    : Promise.reject(new Error("Password too short"));
}
function validateAge(age: number) {
  return age >= 18
    ? Promise.resolve(true)
    : Promise.reject(new Error("Must be 18+"));
}

// ============================================================================
// Key Differences from wait(), wait.any(), wait.race()
// ============================================================================

/*
                    Throws Promise (loading)?  Throws Error (failed)?
wait()              ✅ Yes                     ✅ Yes - if ANY fails
wait.any()          ✅ Yes                     ✅ Yes - if ALL fail  
wait.race()         ✅ Yes                     ✅ Yes - if first is error
wait.settled()      ✅ Yes                     ❌ NO - captures as "rejected"

Use wait.settled() when:
- You want to handle partial failures gracefully
- You need to know which operations succeeded/failed
- You want to provide fallbacks for failures
- You're validating multiple independent operations
- You need a "best effort" approach

Note: wait.settled() still throws promises while loading (Suspense-compatible),
but captures errors as { status: "rejected", reason } instead of throwing them.
*/

export {
  SyncExample,
  AsyncExample,
  RecordExample,
  CountExample,
  FallbackExample,
  ValidationExample,
};

