/**
 * $ Syntax Examples
 *
 * Demonstrates using $ as shorthand for signal.
 * Both are identical - use whichever you prefer!
 */

// ============================================================================
// Basic Usage
// ============================================================================

import { $ } from "../src/index";
import { rx } from "../src/react";

// Mutable signals
const count = $(0);
const name = $("Alice");

// Computed signal
const doubled = $({ count }, ({ deps }) => deps.count * 2);

// Async signal
const user = $(async () => {
  const res = await fetch("/api/user");
  return res.json();
});

// Signal with dependencies
const greeting = $({ name }, ({ deps }) => `Hello, ${deps.name}!`);

// ============================================================================
// All methods work the same
// ============================================================================

count.set(5);
count.set((x) => x + 1);
count.reset();

const unsubscribe = count.on((value) => console.log(value));

count.dispose();

// ============================================================================
// Batching
// ============================================================================

$.batch(() => {
  count.set(10);
  name.set("Bob");
});

// ============================================================================
// Tagging
// ============================================================================

const appTag = $.tag();

const user2 = $({ id: 1 }, { tags: [appTag] });
const posts = $([], { tags: [appTag] });

// Reset all tagged signals
appTag.forEach((sig) => sig.reset());

// ============================================================================
// Persistence
// ============================================================================

const { signals, pause, resume } = $.persist(
  { count: $(0), name: $("") },
  {
    load: () => JSON.parse(localStorage.getItem("state") || "{}"),
    save: (values) => localStorage.setItem("state", JSON.stringify(values)),
  }
);

// ============================================================================
// React Integration
// ============================================================================

function Counter() {
  const count = $(0);

  return (
    <div>
      <h1>{count()}</h1>
      <button onClick={() => count.set((x) => x + 1)}>+1</button>
    </div>
  );
}

function UserProfile() {
  const user = $(async () => fetch("/api/user").then((r) => r.json()));
  const posts = $(async () => fetch("/api/posts").then((r) => r.json()));

  return rx({ user, posts }, (value) => (
    <div>
      <h1>{value.user.name}</h1>
      <p>{value.posts.length} posts</p>
    </div>
  ));
}

// ============================================================================
// Advanced: Computed chains
// ============================================================================

const searchTerm = $("react");
const minLength = $(3);

const isValid = $({ searchTerm, minLength }, ({ deps }) => 
  deps.searchTerm.length >= deps.minLength
);

const results = $(
  { searchTerm, isValid },
  async ({ deps, abortSignal }) => {
    if (!deps.isValid) return [];

    const res = await fetch(`/search?q=${deps.searchTerm}`, {
      signal: abortSignal,
    });
    return res.json();
  }
);

// ============================================================================
// Side-by-side Comparison
// ============================================================================

// Using signal - explicit
import { signal } from "../src/index";

const explicitCount = signal(0);
const explicitDoubled = signal(
  { count: explicitCount },
  ({ deps }) => deps.count * 2
);

// Using $ - concise
const conciseCount = $(0);
const conciseDoubled = $({ count: conciseCount }, ({ deps }) => deps.count * 2);

// Both work identically!
explicitCount.set(5); // ✅
conciseCount.set(5);  // ✅

signal.batch(() => {
  explicitCount.set(10);
}); // ✅

$.batch(() => {
  conciseCount.set(10);
}); // ✅

// ============================================================================
// Choosing Your Style
// ============================================================================

/*
Use `signal` when:
- You're learning Rextive
- Working in a team with varied experience levels
- Writing tutorials or documentation
- You prefer explicit, self-documenting code

Use `$` when:
- You're experienced with reactive programming
- You prefer concise code
- Working on personal projects or with experienced teams
- Familiar with $ conventions from Vue/Solid/RxJS

Both are identical in functionality - it's purely a style preference!
*/

export {
  count,
  name,
  doubled,
  user,
  greeting,
  Counter,
  UserProfile,
  searchTerm,
  results,
};

