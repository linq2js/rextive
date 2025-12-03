/**
 * Task Usage Examples - Comparing Different Approaches
 *
 * This example demonstrates two approaches for handling async task status:
 * 1. `task.from(signal)` - Value may be undefined during loading/error
 * 2. `signal.pipe(task(defaultValue))` - Value is never undefined
 */

import { signal, rx, task } from "rextive/react";

// =============================================================================
// Example Data Types
// =============================================================================

interface User {
  id: number;
  username: string;
  email: string;
  avatar?: string;
}

interface Post {
  id: number;
  title: string;
  content: string;
}

// =============================================================================
// Approach 1: task.from() - Value may be undefined
// =============================================================================

/**
 * Using task.from() - The value is UNDEFINED when:
 * - Task is loading (initial fetch)
 * - Task has an error
 *
 * Use this when:
 * - You need explicit handling of loading/error states
 * - Showing skeleton/placeholder during loading is acceptable
 * - You don't have a meaningful default value
 */

const userProfileAsync = signal(async () => {
  const response = await fetch("/api/user/profile");
  if (!response.ok) throw new Error("Failed to fetch profile");
  return response.json() as Promise<User>;
});

function UserProfileWithTaskFrom() {
  return rx(() => {
    const { loading, error, value, status } = task.from(userProfileAsync);

    // ⚠️ value is User | undefined
    console.log("Status:", status); // "loading" | "success" | "error"
    console.log("Value:", value); // undefined during loading/error

    if (loading) {
      return <div className="skeleton">Loading user profile...</div>;
    }

    if (error) {
      return <div className="error">Error: {String(error)}</div>;
    }

    // ✅ After this point, value is guaranteed to be User
    return (
      <div className="profile">
        <img src={value.avatar} alt={value.username} />
        <h2>{value.username}</h2>
        <p>{value.email}</p>
      </div>
    );
  });
}

// =============================================================================
// Approach 2: signal.pipe(task()) - Value is never undefined
// =============================================================================

/**
 * Using signal.pipe(task(defaultValue)) - The value is ALWAYS defined:
 * - Initially: uses the default value
 * - During loading: keeps the previous successful value (or default)
 * - On error: keeps the previous successful value (or default)
 * - On success: uses the new value
 *
 * Use this when:
 * - You want to show stale data while refreshing
 * - You have a meaningful default value
 * - You want optimistic UI updates
 * - You're building "keep previous on refresh" patterns
 */

const DEFAULT_USER: User = {
  id: 0,
  username: "anonymous",
  email: "guest@example.com",
  avatar: "/default-avatar.png",
};

// Create a task signal with a default value
const userProfileTask = userProfileAsync.pipe(task(DEFAULT_USER));

function UserProfileWithTaskOperator() {
  return rx(() => {
    const { loading, error, value, status } = userProfileTask();

    // ✅ value is ALWAYS User (never undefined!)
    console.log("Status:", status); // "loading" | "success" | "error"
    console.log("Value:", value); // Always defined - default, previous, or current

    return (
      <div className="profile">
        {/* Always render the profile - show loading indicator as overlay */}
        {loading && <div className="loading-overlay">Refreshing...</div>}

        <img src={value.avatar} alt={value.username} />
        <h2>{value.username}</h2>
        <p>{value.email}</p>

        {/* Show error as a toast/banner, not replacing content */}
        {error && (
          <div className="error-toast">
            Failed to refresh: {String(error)}
            <button onClick={() => userProfileAsync.refresh()}>Retry</button>
          </div>
        )}
      </div>
    );
  });
}

// =============================================================================
// Practical Comparison: Search Results
// =============================================================================

const searchQuery = signal("");

// Async search that depends on query
const searchResults = signal({ searchQuery }, async ({ deps, abortSignal }) => {
  const query = deps.searchQuery.trim();
  if (!query) return [];

  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
    signal: abortSignal,
  });
  return response.json() as Promise<Post[]>;
});

// Approach 1: task.from() - Results disappear during search
function SearchWithTaskFrom() {
  return (
    <div>
      <input
        placeholder="Search..."
        onChange={(e) => searchQuery.set(e.target.value)}
      />
      {rx(() => {
        const { loading, error, value } = task.from(searchResults);

        // ⚠️ value is Post[] | undefined
        if (loading) return <div>Searching...</div>;
        if (error) return <div>Search failed</div>;
        if (!value || value.length === 0) return <div>No results</div>;

        return (
          <ul>
            {value.map((post) => (
              <li key={post.id}>{post.title}</li>
            ))}
          </ul>
        );
      })}
    </div>
  );
}

// Approach 2: task() operator - Keep showing previous results while searching
const searchResultsTask = searchResults.pipe(task<Post[]>([]));

function SearchWithTaskOperator() {
  return (
    <div>
      <input
        placeholder="Search..."
        onChange={(e) => searchQuery.set(e.target.value)}
      />
      {rx(() => {
        const { loading, error, value } = searchResultsTask();

        // ✅ value is ALWAYS Post[] (never undefined!)
        return (
          <div>
            {/* Show loading indicator without hiding results */}
            {loading && <div className="search-spinner">Searching...</div>}

            {error && <div className="search-error">Search failed</div>}

            {value.length === 0 ? (
              <div>No results</div>
            ) : (
              <ul className={loading ? "dimmed" : ""}>
                {value.map((post) => (
                  <li key={post.id}>{post.title}</li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Summary Table
// =============================================================================

/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                  task.from(signal) vs signal.pipe(task())                   │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ Feature              │ task.from()         │ signal.pipe(task())            │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ Value type           │ T | undefined       │ T (always defined)             │
 * │ Initial state        │ undefined           │ default value                  │
 * │ During loading       │ undefined           │ previous value (or default)    │
 * │ On error             │ undefined           │ previous value (or default)    │
 * │ On success           │ new value           │ new value                      │
 * │ Use case             │ Explicit handling   │ Optimistic UI / stale-while-   │
 * │                      │ of all states       │ revalidate patterns            │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ Best for:                                                                   │
 * │ • task.from():         First-time data loading, authentication checks      │
 * │ • signal.pipe(task()): Data refreshing, search, infinite scroll, dashboards│
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

// =============================================================================
// Advanced: Combining Both Approaches
// =============================================================================

/**
 * Sometimes you want different behavior for initial load vs refresh.
 * You can combine approaches using the status field.
 */

function AdvancedUserProfile() {
  return rx(() => {
    const { loading, error, value, status } = userProfileTask();

    // Check if this is the first load (value is still the default)
    const isInitialLoad = loading && value.id === DEFAULT_USER.id;

    if (isInitialLoad) {
      // Show full skeleton for initial load
      return <ProfileSkeleton />;
    }

    // For refreshes, show data with loading indicator
    return (
      <div className="profile">
        {loading && <RefreshIndicator />}
        <img src={value.avatar} alt={value.username} />
        <h2>{value.username}</h2>
        <p>{value.email}</p>
        {error && <ErrorBanner error={error} />}
      </div>
    );
  });
}

// Placeholder components for the example
function ProfileSkeleton() {
  return <div className="skeleton">Loading...</div>;
}
function RefreshIndicator() {
  return <div className="refresh">↻</div>;
}
function ErrorBanner({ error }: { error: unknown }) {
  return <div className="error">{String(error)}</div>;
}

export {
  UserProfileWithTaskFrom,
  UserProfileWithTaskOperator,
  SearchWithTaskFrom,
  SearchWithTaskOperator,
  AdvancedUserProfile,
};

