# Time Travel Revert - Error-Prone Scenarios

This document outlines the potential issues when reverting signals to a specific point in the timeline, especially with many mutable signals and auto-generated signals from `pipe()` operators.

## 🚨 Critical Issues

### 1. **Focus Signal Path Mismatch**

**Problem:**
When you revert a parent signal, focus signals (created via `.pipe(focus("path"))`) may break if the reverted value doesn't have the expected path structure.

**Example:**
```ts
const form = signal({ user: { name: "Alice" } });
const userName = form.pipe(focus("user.name")); // Creates focus signal

// Later, form changes to { user: { name: "Bob", email: "bob@example.com" } }
// Then you revert form to { contacts: [...] } // Different structure!

// userName focus signal will:
// - Try to read form().user.name
// - Get undefined (path doesn't exist)
// - May throw error or return undefined
// - But the focus signal still exists and is subscribed!
```

**Why it's dangerous:**
- Focus signals subscribe to parent changes (line 305 in focus.ts)
- When parent is reverted to incompatible structure, focus signal reads invalid path
- Focus signal may throw or return unexpected values
- No automatic cleanup - focus signal stays alive but broken

**Current behavior:**
- Focus signal will read `undefined` if path doesn't exist
- If fallback provided, uses fallback
- Otherwise, may throw error on read

---

### 2. **Dependency Order Issues**

**Problem:**
Reverting signals in the wrong order can cause computed signals to see inconsistent intermediate states.

**Example:**
```ts
const a = signal(1);
const b = signal(2);
const sum = signal({ a, b }, ({ deps }) => deps.a + deps.b); // = 3

// Later: a = 10, b = 20, sum = 30
// History: a had [1, 5, 10], b had [2, 15, 20]

// If you revert a to 5 FIRST:
// - sum immediately recalculates: 5 + 20 = 25
// - Then you revert b to 15
// - sum recalculates again: 5 + 15 = 20
// - But the "correct" state at that time was 5 + 15 = 20 ✓

// If you revert b to 15 FIRST:
// - sum recalculates: 10 + 15 = 25
// - Then you revert a to 5
// - sum recalculates: 5 + 15 = 20
// - Same result, but intermediate state was wrong
```

**Why it's dangerous:**
- Computed signals recalculate immediately when dependencies change
- Intermediate states may trigger side effects (onChange callbacks)
- UI may flash with incorrect values
- Async computed signals may start/abort requests based on wrong intermediate state

**Current behavior:**
- Each revert triggers immediate recomputation
- No batching or ordering guarantees
- Side effects fire for each intermediate state

---

### 3. **Auto-Generated Signal Lifecycle**

**Problem:**
Signals created by `pipe()` operators (focus, to, etc.) are created on-demand. Reverting to a point where they didn't exist doesn't remove them, but they may be in an invalid state.

**Example:**
```ts
const form = signal({ title: "Hello" });
// No focus signals yet

// User creates contact, which creates:
const contacts = form.pipe(focus("contacts")); // Auto-created signal
const email = contacts.pipe(focus("0.email")); // Nested auto-created

// History shows form had { title: "Hello" } before contacts existed
// If you revert form to { title: "Hello" }:
// - contacts focus signal still exists
// - It tries to read form().contacts → undefined
// - email focus signal tries to read undefined[0].email → ERROR
```

**Why it's dangerous:**
- Auto-generated signals persist even after revert
- They're subscribed to parent signals that may no longer have the expected structure
- No automatic disposal when structure becomes invalid
- Can cause cascading errors in nested focus signals

**Current behavior:**
- Focus signals only dispose when source disposes (line 309-313 in focus.ts)
- Reverting doesn't dispose them
- They continue to exist in broken state

---

### 4. **Circular Update Prevention Bypass**

**Problem:**
Focus signals have circular update prevention (`isUpdating` flag), but reverting can bypass this.

**Example:**
```ts
const form = signal({ user: { name: "Alice" } });
const userName = form.pipe(focus("user.name"));

// Focus signal's set() writes to form, which triggers form.on() callback
// which updates focus signal - but isUpdating prevents infinite loop

// If you revert form directly:
form.set({ user: { name: "Bob" } }); // Bypasses focus signal
// - form.on() callback fires (line 305)
// - Updates focus signal via originalSet() (line 320)
// - But if you revert form to a value that focus signal also had...
// - Could cause double updates or inconsistent state
```

**Why it's dangerous:**
- Direct revert bypasses focus signal's set() method
- Focus signal still gets notified via subscription
- May cause double updates or race conditions
- `isUpdating` flag doesn't help with external reverts

**Current behavior:**
- Revert calls `signal.set()` directly
- Focus signal receives update via subscription
- No special handling for reverts

---

### 5. **Partial State Inconsistency**

**Problem:**
Reverting only some signals leaves the application in an inconsistent state.

**Example:**
```ts
const user = signal({ name: "Alice", age: 30 });
const profile = signal({ user: user(), bio: "..." }); // Snapshot at creation

// Later: user = { name: "Bob", age: 35 }, profile still has old snapshot
// If you revert user to { name: "Alice", age: 30 }:
// - profile still has old user data in snapshot
// - Application state is inconsistent
// - profile doesn't know user was reverted
```

**Why it's dangerous:**
- Related signals become out of sync
- No way to revert "related group" of signals atomically
- Can cause data corruption or logical errors
- Hard to detect without manual inspection

**Current behavior:**
- Each signal reverted independently
- No grouping or atomic revert
- No validation of state consistency

---

### 6. **Computed Signal Staleness**

**Problem:**
Computed signals recalculate immediately, but if you revert multiple dependencies, they may recalculate multiple times with wrong intermediate values.

**Example:**
```ts
const a = signal(1);
const b = signal(2);
const product = signal({ a, b }, ({ deps }) => deps.a * deps.b);

// History: a=[1,10], b=[2,20], product=[2,200]
// Current: a=10, b=20, product=200

// Revert a to 1, then b to 2:
// Step 1: a.set(1) → product recalculates: 1 * 20 = 20
// Step 2: b.set(2) → product recalculates: 1 * 2 = 2 ✓
// But product's history shows: [2, 20, 200]
// The intermediate 20 is now in history but wasn't the "real" state
```

**Why it's dangerous:**
- Intermediate recalculations pollute history
- Side effects (onChange) fire for wrong intermediate states
- Async computations may start/abort based on wrong values
- History becomes inaccurate

**Current behavior:**
- Each revert creates new history entry
- Computed signals recalculate immediately
- No way to batch reverts

---

### 7. **Signal Disposal State**

**Problem:**
Reverting to a value from before a signal was disposed doesn't "undispose" it, but the signal may still be tracked.

**Example:**
```ts
const data = signal([1, 2, 3]);
// ... use it ...
data.dispose(); // Signal is disposed

// History shows data had [1, 2, 3] before disposal
// If you try to revert:
// - Signal is still disposed
// - set() may not work or may throw
// - Focus signals depending on it are also disposed
```

**Why it's dangerous:**
- Disposed signals can't be updated
- Revert will fail silently or throw
- Dependent signals are also disposed
- No way to "revive" disposed signals

**Current behavior:**
- Disposed signals marked but not deleted
- History preserved
- But can't actually revert disposed signals

---

## 🛡️ Potential Solutions

### Solution 1: **Batch Revert with Dependency Ordering**
```ts
// Revert multiple signals atomically
revertToTimestamp(timestamp: number, signalIds?: string[]) {
  // 1. Collect all signals to revert
  // 2. Build dependency graph
  // 3. Revert in topological order (dependencies first)
  // 4. Batch all updates
  // 5. Single notification cycle
}
```

### Solution 2: **Focus Signal Validation**
```ts
// Before reverting, validate all focus signals
function validateFocusSignals(parentSignal: Signal) {
  // Check if all focus signals have valid paths
  // Dispose invalid ones
  // Warn about broken signals
}
```

### Solution 3: **Snapshot System**
```ts
// Capture full application state at timestamp
interface AppSnapshot {
  timestamp: number;
  signals: Map<string, { value: unknown; disposed: boolean }>;
}

// Revert entire app to snapshot
function revertToSnapshot(snapshot: AppSnapshot) {
  // 1. Dispose all current signals
  // 2. Recreate signals from snapshot
  // 3. Restore values
  // 4. Recreate focus signals if paths exist
}
```

### Solution 4: **Read-Only History Mode**
```ts
// View history without actually reverting
function viewHistoryAt(timestamp: number) {
  // Show what values were at that time
  // Don't actually change signals
  // Allow "preview" before commit
}
```

### Solution 5: **Revert Validation**
```ts
// Validate before allowing revert
function canRevert(signalId: string, targetValue: unknown): ValidationResult {
  // Check if focus signals will break
  // Check if computed signals will be inconsistent
  // Warn about potential issues
  // Return validation result
}
```

---

## 📊 Risk Assessment

| Issue | Severity | Frequency | Current Mitigation |
|-------|----------|-----------|-------------------|
| Focus path mismatch | 🔴 High | Common | None |
| Dependency order | 🟡 Medium | Common | None |
| Auto-generated lifecycle | 🔴 High | Common | None |
| Circular updates | 🟡 Medium | Rare | `isUpdating` flag (partial) |
| Partial state | 🟡 Medium | Common | None |
| Computed staleness | 🟡 Medium | Common | None |
| Disposed signals | 🟢 Low | Rare | History preserved but can't revert |

---

## 💡 Recommendations

1. **Add revert validation** - Check focus signal paths before allowing revert
2. **Batch reverts** - Support reverting multiple signals atomically
3. **Dependency ordering** - Automatically determine correct revert order
4. **Focus signal cleanup** - Dispose invalid focus signals after revert
5. **Read-only preview** - Allow viewing history without actually reverting
6. **Warning system** - Warn users about potential issues before revert

---

## 🔍 Current Implementation Gaps

1. **No validation** - Revert happens immediately without checks
2. **No batching** - Each revert is independent
3. **No ordering** - Reverts happen in user-click order
4. **No cleanup** - Broken focus signals persist
5. **No preview** - Can't see what will happen before reverting
6. **No warnings** - Users aren't informed of risks

