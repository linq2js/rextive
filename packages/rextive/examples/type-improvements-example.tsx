/**
 * Type Improvements Example
 * 
 * This example demonstrates the type improvements in Rextive:
 * 1. AnySignal<T> - Generic functions that work with all signal types
 * 2. Improved when() typing - Type-safe callbacks with exact signal types
 * 3. Tag kinds - Type-safe signal grouping
 * 
 * @module examples/type-improvements-example
 */

import { signal, tag } from "../src";
import type { AnySignal, MutableSignal, ComputedSignal, Tag } from "../src";

// =============================================================================
// Example 1: AnySignal - Generic Functions for All Signal Types
// =============================================================================

/**
 * Logger utility that works with any signal type
 */
function createSignalLogger<T>(label: string) {
  return {
    /**
     * Attach logger to a signal - works with both mutable and computed
     */
    attach(s: AnySignal<T>) {
      // Common methods available on both types
      s.on((value) => {
        console.log(`[${label}] Value changed:`, value);
      });

      return () => {
        console.log(`[${label}] Detaching logger`);
      };
    },

    /**
     * Log signal changes when triggered by another signal
     */
    attachWithTrigger(s: AnySignal<T>, trigger: AnySignal<any>) {
      s.when(trigger, (current) => {
        console.log(`[${label}] Triggered by dependency:`, current());
        // ✅ refresh() available on both MutableSignal and ComputedSignal
        current.refresh();
      });
    },
  };
}

// Usage with mutable signal
const count = signal(0);
const countLogger = createSignalLogger<number>("Counter");
countLogger.attach(count); // ✅ Works

// Usage with computed signal
const doubled = signal({ count }, ({ deps }) => deps.count * 2);
const doubledLogger = createSignalLogger<number>("Doubled");
doubledLogger.attach(doubled); // ✅ Works

// =============================================================================
// Example 2: Type Narrowing with AnySignal
// =============================================================================

/**
 * Sync utility that only syncs if target is mutable
 */
function syncSignals<T>(source: AnySignal<T>, target: AnySignal<T>) {
  source.on((value) => {
    // Type narrow to check if target can be updated
    if ("set" in target) {
      // TypeScript knows target is MutableSignal here
      target.set(value); // ✅ .set() available
      console.log("Target synced:", value);
    } else {
      console.log("Target is computed (read-only), skipping sync");
    }
  });
}

// Usage
const source = signal(10);
const mutableTarget = signal(0);
const computedTarget = signal({ source }, ({ deps }) => deps.source * 2);

syncSignals(source, mutableTarget); // Syncs values
syncSignals(source, computedTarget); // Logs "read-only" message

// =============================================================================
// Example 3: Signal Registry with AnySignal
// =============================================================================

/**
 * Registry that manages lifecycle of mixed signal types
 */
class SignalRegistry {
  private signals = new Map<string, AnySignal<any>>();
  private unsubscribers = new Map<string, VoidFunction>();

  /**
   * Register any signal type
   */
  register<T>(name: string, signal: AnySignal<T>) {
    // Store the signal
    this.signals.set(name, signal);

    // Subscribe to changes
    const unsub = signal.on((value) => {
      console.log(`Registry: "${name}" changed to`, value);
    });
    this.unsubscribers.set(name, unsub);

    console.log(`Registered signal: ${name}`);
  }

  /**
   * Refresh a signal by name
   */
  refresh(name: string) {
    const signal = this.signals.get(name);
    if (signal) {
      signal.refresh(); // ✅ Works for all signal types
      console.log(`Refreshed signal: ${name}`);
    }
  }

  /**
   * Unregister and dispose a signal
   */
  unregister(name: string) {
    const unsub = this.unsubscribers.get(name);
    if (unsub) {
      unsub();
      this.unsubscribers.delete(name);
    }

    const signal = this.signals.get(name);
    if (signal) {
      signal.dispose(); // ✅ Works for all signal types
      this.signals.delete(name);
      console.log(`Unregistered signal: ${name}`);
    }
  }

  /**
   * Get all registered signal names
   */
  list(): string[] {
    return Array.from(this.signals.keys());
  }
}

// Usage
const registry = new SignalRegistry();

const userCount = signal(0);
const userName = signal("Alice");
const userDisplay = signal(
  { userCount, userName },
  ({ deps }) => `${deps.userName} (${deps.userCount})`
);

registry.register("userCount", userCount); // ✅ Mutable signal
registry.register("userName", userName); // ✅ Mutable signal
registry.register("userDisplay", userDisplay); // ✅ Computed signal

console.log("Registered signals:", registry.list());

// =============================================================================
// Example 4: Improved when() Typing - Type-Safe Callbacks
// =============================================================================

/**
 * Demonstrates type-safe when() callbacks
 */

// For MutableSignal: callback receives MutableSignal
const counter = signal(0);
const trigger1 = signal(0);

counter.when(trigger1, (current) => {
  // ✅ current is MutableSignal<number>
  current.set((x) => x + 1); // .set() available
  console.log("Counter incremented:", current());
});

// For ComputedSignal: callback receives ComputedSignal
const userData = signal(async () => ({ name: "Alice", age: 30 }));
const userId = signal(1);

userData.when(userId, (current) => {
  // ✅ current is ComputedSignal<Promise<User>>
  current.refresh(); // .refresh() available
  current.stale(); // .stale() available
  // current.set() // ❌ Not available - ComputedSignal is read-only
  console.log("User data refreshed for user:", userId());
});

// Chaining multiple when() calls
const searchResults = signal(async () => ({ results: [] }));
const searchTerm = signal("");
const sortBy = signal("name");

searchResults
  .when(searchTerm, (current) => {
    // ✅ current is ComputedSignal
    current.refresh(); // Immediate refresh on search
    console.log("Search results refreshed");
  })
  .when(sortBy, (current) => {
    // ✅ current is ComputedSignal
    current.stale(); // Lazy invalidation on sort
    console.log("Search results marked stale");
  });

// =============================================================================
// Example 5: Tag Kinds - Type-Safe Signal Grouping
// =============================================================================

/**
 * Demonstrates type-safe tags with signal kinds
 */

// Default: General tag - accepts both mutable and computed
const mixedTag = tag<number>();

// Mutable-only tag - semantic constraint for writable state
const stateTag: Tag<number, "mutable"> = tag<number, "mutable">();

// Computed-only tag - semantic constraint for derived values
const viewTag: Tag<number, "computed"> = tag<number, "computed">();

// Usage with mutable signals
const count1 = signal(0, { tags: [stateTag] }); // ✅ Mutable with mutable tag
const count2 = signal(5, { tags: [stateTag] }); // ✅ Mutable with mutable tag

// All signals in stateTag are guaranteed to be mutable
stateTag.forEach((s) => {
  s.set((x) => x + 1); // ✅ Safe - all are MutableSignal
  console.log("Incremented state:", s());
});

// Usage with computed signals
const doubled1 = signal({ count1 }, ({ deps }) => deps.count1 * 2, {
  tags: [viewTag],
}); // ✅ Computed with computed tag
const doubled2 = signal({ count2 }, ({ deps }) => deps.count2 * 2, {
  tags: [viewTag],
}); // ✅ Computed with computed tag

// All signals in viewTag are guaranteed to be computed
viewTag.forEach((s) => {
  s.refresh(); // ✅ Safe - all are ComputedSignal
  console.log("Refreshed view:", s());
});

// Mixed tag accepts both
const all1 = signal(0, { tags: [mixedTag] }); // ✅ Mutable
const all2 = signal({ count }, ({ deps }) => deps.count, {
  tags: [mixedTag],
}); // ✅ Computed

console.log(`Mixed tag has ${mixedTag.size} signals`);

// =============================================================================
// Example 6: Real-World Use Case - App State Manager
// =============================================================================

/**
 * Application state manager using type improvements
 */
class AppStateManager {
  // Tags for different signal types
  private stateTag = tag<any, "mutable">(); // Writable state
  private viewTag = tag<any, "computed">(); // Computed views
  private registry = new Map<string, AnySignal<any>>();

  /**
   * Register mutable state
   */
  registerState<T>(name: string, signal: MutableSignal<T>) {
    // Add to state tag
    signal.tags.add(this.stateTag);
    this.registry.set(name, signal);
    console.log(`Registered state: ${name}`);
  }

  /**
   * Register computed view
   */
  registerView<T>(name: string, signal: ComputedSignal<T>) {
    // Add to view tag
    signal.tags.add(this.viewTag);
    this.registry.set(name, signal);
    console.log(`Registered view: ${name}`);
  }

  /**
   * Reset all state (only affects mutable signals)
   */
  resetState() {
    this.stateTag.forEach((s) => {
      s.reset(); // ✅ Safe - all are MutableSignal
      console.log("Reset state:", s());
    });
  }

  /**
   * Refresh all views (only affects computed signals)
   */
  refreshViews() {
    this.viewTag.forEach((s) => {
      s.refresh(); // ✅ Safe - all are ComputedSignal
      console.log("Refreshed view:", s());
    });
  }

  /**
   * Get signal by name (generic)
   */
  get<T>(name: string): AnySignal<T> | undefined {
    return this.registry.get(name);
  }

  /**
   * Dispose all signals
   */
  dispose() {
    this.registry.forEach((signal) => {
      signal.dispose(); // ✅ Works for all types
    });
    this.registry.clear();
  }
}

// Usage
const appManager = new AppStateManager();

const appCount = signal(0);
const appName = signal("My App");
const appTitle = signal(
  { appName, appCount },
  ({ deps }) => `${deps.appName} - Count: ${deps.appCount}`
);

appManager.registerState("count", appCount);
appManager.registerState("name", appName);
appManager.registerView("title", appTitle);

// Reset all state
appManager.resetState();

// Refresh all views
appManager.refreshViews();

// =============================================================================
// Example 7: Conditional Signal Operations
// =============================================================================

/**
 * Utility that refreshes signals conditionally based on their type
 */
function conditionalRefresh<T>(s: AnySignal<T>, force: boolean) {
  if (force) {
    // Immediate refresh for all types
    s.refresh();
    console.log("Force refreshed:", s());
  } else {
    // Different behavior based on signal type
    if ("set" in s) {
      // Mutable signal - no need to refresh
      console.log("Mutable signal, no refresh needed:", s());
    } else {
      // Computed signal - mark as stale (lazy)
      s.stale();
      console.log("Computed signal marked stale");
    }
  }
}

// Usage
const mutableValue = signal(100);
const computedValue = signal({ mutableValue }, ({ deps }) => deps.mutableValue * 2);

conditionalRefresh(mutableValue, false); // Skips refresh
conditionalRefresh(computedValue, false); // Marks stale
conditionalRefresh(computedValue, true); // Force refresh

// =============================================================================
// Example 8: Array of Mixed Signals
// =============================================================================

/**
 * Demonstrates working with arrays of mixed signal types
 */

// Array of different signal types
const mixedSignals: AnySignal<number>[] = [
  signal(1),
  signal(2),
  signal({ count }, ({ deps }) => deps.count + 10),
  signal(3),
];

// Subscribe to all signals
mixedSignals.forEach((s, i) => {
  s.on((value) => {
    console.log(`Signal ${i} changed to:`, value);
  });
});

// Refresh all signals
mixedSignals.forEach((s) => {
  s.refresh(); // ✅ Works for all types
});

// Filter and update only mutable signals
mixedSignals.forEach((s) => {
  if ("set" in s) {
    s.set((x) => x + 1); // Only mutable signals
    console.log("Updated mutable signal:", s());
  }
});

// =============================================================================
// Summary
// =============================================================================

console.log("\n=== Type Improvements Summary ===");
console.log("✅ AnySignal<T> - Generic functions for all signal types");
console.log("✅ Improved when() - Type-safe callbacks with exact signal types");
console.log("✅ Tag kinds - Type-safe signal grouping");
console.log("✅ Type narrowing - Check for mutable-specific operations");
console.log("✅ Better developer experience - Full TypeScript inference");

export {
  createSignalLogger,
  syncSignals,
  SignalRegistry,
  AppStateManager,
  conditionalRefresh,
};

