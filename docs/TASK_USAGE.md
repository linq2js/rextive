# Task Usage Guide

This guide demonstrates two approaches for handling async task status in Rextive:

1. **`task.from(signal)`** - Value may be undefined during loading/error
2. **`signal.to(task(defaultValue))`** - Value is never undefined

## Quick Comparison

| Feature | `task.from()` | `signal.to(task())` |
|---------|---------------|---------------------|
| Value type | `T \| undefined` | `T` (always defined) |
| Initial state | `undefined` | default value |
| During loading | `undefined` | previous value (or default) |
| On error | `undefined` | previous value (or default) |
| On success | new value | new value |
| UX pattern | Replace content with skeleton | Overlay loading indicator |

---

## Approach 1: `task.from()` - Explicit State Handling

Use `task.from()` when you need explicit handling of loading/error states and showing skeleton/placeholder during loading is acceptable.

```tsx
import { signal, rx } from "rextive/react";
import { task } from "rextive/op";

interface User {
  id: number;
  username: string;
  email: string;
}

const userProfile = signal(async () => {
  const response = await fetch("/api/user/profile");
  return response.json() as Promise<User>;
});

function UserProfile() {
  return rx(() => {
    const { loading, error, value, status } = task.from(userProfile);

    // ⚠️ value is User | undefined
    console.log("Status:", status); // "loading" | "success" | "error"
    console.log("Value:", value);   // undefined during loading/error

    if (loading) {
      return <div className="skeleton">Loading user profile...</div>;
    }

    if (error) {
      return <div className="error">Error: {String(error)}</div>;
    }

    // ✅ After this point, value is guaranteed to be User
    return (
      <div className="profile">
        <h2>{value.username}</h2>
        <p>{value.email}</p>
      </div>
    );
  });
}
```

### When to Use `task.from()`

- First-time data loading
- Authentication checks
- Cases where you don't have a meaningful default value
- When showing a skeleton/placeholder during loading is acceptable

---

## Approach 2: `signal.to(task())` - Stale-While-Revalidate

Use `signal.to(task(defaultValue))` when you want to show stale data while refreshing, similar to the "stale-while-revalidate" caching strategy.

```tsx
import { signal, rx } from "rextive/react";
import { task } from "rextive/op";

interface User {
  id: number;
  username: string;
  email: string;
}

const DEFAULT_USER: User = {
  id: 0,
  username: "anonymous",
  email: "guest@example.com",
};

const userProfileAsync = signal(async () => {
  const response = await fetch("/api/user/profile");
  return response.json() as Promise<User>;
});

// Convert to task signal with default value
const userProfileTask = userProfileAsync.to(task(DEFAULT_USER));

function UserProfile() {
  return rx(() => {
    const { loading, error, value, status } = userProfileTask();

    // ✅ value is ALWAYS User (never undefined!)
    console.log("Status:", status); // "loading" | "success" | "error"
    console.log("Value:", value);   // Always defined - default, previous, or current

    return (
      <div className="profile">
        {/* Always render the profile - show loading indicator as overlay */}
        {loading && <div className="loading-overlay">Refreshing...</div>}

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
```

### When to Use `signal.to(task())`

- Data refreshing / polling
- Search results (keep showing previous results while searching)
- Infinite scroll
- Dashboards with auto-refresh
- Any "stale-while-revalidate" pattern

---

## Practical Example: Search Results

### With `task.from()` - Results disappear during search

```tsx
const searchQuery = signal("");

const searchResults = signal({ searchQuery }, async ({ deps, abortSignal }) => {
  const query = deps.searchQuery.trim();
  if (!query) return [];

  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
    signal: abortSignal,
  });
  return response.json() as Promise<Post[]>;
});

function Search() {
  return (
    <div>
      <input onChange={(e) => searchQuery.set(e.target.value)} />
      {rx(() => {
        const { loading, error, value } = task.from(searchResults);

        // ⚠️ value is Post[] | undefined - results disappear during search
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
```

### With `signal.to(task())` - Keep showing previous results

```tsx
const searchQuery = signal("");

const searchResults = signal({ searchQuery }, async ({ deps, abortSignal }) => {
  const query = deps.searchQuery.trim();
  if (!query) return [];

  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
    signal: abortSignal,
  });
  return response.json() as Promise<Post[]>;
});

// Convert to task signal - keeps previous results while searching
const searchResultsTask = searchResults.to(task<Post[]>([]));

function Search() {
  return (
    <div>
      <input onChange={(e) => searchQuery.set(e.target.value)} />
      {rx(() => {
        const { loading, error, value } = searchResultsTask();

        // ✅ value is ALWAYS Post[] - previous results stay visible
        return (
          <div>
            {loading && <div className="spinner">Searching...</div>}
            {error && <div className="error">Search failed</div>}

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
```

---

## Advanced: Combining Both Approaches

Sometimes you want different behavior for initial load vs refresh:

```tsx
const DEFAULT_USER: User = { id: 0, username: "anonymous", email: "" };

const userProfileTask = userProfileAsync.to(task(DEFAULT_USER));

function UserProfile() {
  return rx(() => {
    const { loading, error, value } = userProfileTask();

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
        <h2>{value.username}</h2>
        <p>{value.email}</p>
        {error && <ErrorBanner error={error} />}
      </div>
    );
  });
}
```

---

## Summary

Choose your approach based on the UX you want:

- **`task.from()`**: Content is replaced during loading/error → Use for initial loads, auth checks
- **`signal.to(task())`**: Content persists during loading/error → Use for refreshes, search, dashboards

Both approaches provide the same `{ loading, error, value, status }` interface, making it easy to switch between them as your requirements evolve.

