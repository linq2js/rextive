# Rextive DevTools 🔧

<div align="center">

### **Debug, inspect, and understand your reactive state**

A powerful developer tool for debugging Rextive signals in real-time.

</div>

---

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [UI Overview](#-ui-overview)
- [API Reference](#-api-reference)
- [Configuration](#-configuration)
- [Best Practices](#-best-practices)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Features

### 🔍 Signal Registry & Discovery

- **Automatic tracking** of all signals created in your app
- **Real-time updates** as signals are created, changed, or disposed
- **Filter by type** - mutable, computed, or both
- **Show/hide auto-generated** signals with the "User/All" toggle

### 📊 Real-Time Value Inspector

- **Live values** - see current signal values update in real-time
- **Value history** - track how values change over time
- **Change counter** - see how many times each signal has changed
- **Expandable details** - click any signal to see more info

### 📜 Change Timeline / Events Log

- **Chronological event log** - see all signal events as they happen
- **Event types** - create, change, dispose, error
- **Timestamps** - know exactly when each event occurred
- **Clear events** - reset the log when needed

### 🎨 Visual Feedback

- **Flash animations** - signals flash when their values change
- **Color-coded badges** - mutable (green), computed (blue), tags (purple)
- **Disposed signals** - grayed out with strikethrough styling
- **Error indicators** - signals with errors are highlighted

### ⚡ Performance

- **Zero overhead when disabled** - no impact on production builds
- **Conditional subscriptions** - only subscribes to events when devtools is active
- **Efficient updates** - batched UI refreshes every 500ms

### 🎯 Additional Features

- **Tag tracking** - see all tags and their associated signals
- **Error tracking** - view signals that have thrown errors
- **Statistics** - quick overview of signal counts
- **Resizable panel** - drag to resize the devtools drawer
- **Position toggle** - switch between left and bottom positions
- **Persisted config** - your preferences are saved in localStorage

---

## 🚀 Quick Start

### 1. Enable DevTools (Development Only)

```tsx
// main.tsx or index.tsx
import { enableDevTools } from "rextive/devtools";

// Enable BEFORE any signals are created!
if (import.meta.env.DEV) {
  enableDevTools({ name: "my-app" });
}

// Then import your app
import { App } from "./App";
```

### 2. Add the DevTools Panel

```tsx
// App.tsx
import { DevToolsPanel } from "rextive/devtools/panel";

export function App() {
  return (
    <div>
      {/* Your app content */}
      <MainContent />

      {/* DevTools panel - only in development */}
      {import.meta.env.DEV && <DevToolsPanel />}
    </div>
  );
}
```

### 3. That's It! 🎉

The DevTools panel will appear on the left side of your screen. Click to expand and start debugging!

---

## 📦 Installation

DevTools is included in the `rextive` package. No additional installation needed.

```tsx
// Core devtools functions
import { enableDevTools, disableDevTools } from "rextive/devtools";

// React UI panel
import { DevToolsPanel } from "rextive/devtools/panel";
```

---

## 🖥️ UI Overview

### Panel Layout

```
┌─────────────────────────────────────────────┐
│ ⚡ Rextive    M 12  C 8  [User] [▼] [◀] [🗑] │  ← Header with stats
├─────────────────────────────────────────────┤
│ Signals(20) │ Tags(3) │ Errors(0) │ Events  │  ← Tab navigation
├─────────────────────────────────────────────┤
│                                             │
│  M  counter           ×5                    │  ← Signal list
│      42                                     │
│                                             │
│  C  doubled           ×5                    │
│      84                                     │
│                                             │
│  ✕  oldSignal (disposed)     disposed       │  ← Disposed signal
│      "[disposed]"                           │
│                                             │
└─────────────────────────────────────────────┘
```

### Header Controls

| Control        | Description                                |
| -------------- | ------------------------------------------ |
| `M 12`         | Mutable signal count                       |
| `C 8`          | Computed signal count                      |
| `User` / `All` | Toggle to show/hide auto-generated signals |
| `▼` / `◀`      | Toggle panel position (bottom/left)        |
| `🗑 N`          | Clear N disposed signals                   |
| `↺`            | Reset DevTools config                      |

### Signal Item

```
┌──────────────────────────────────────┐
│  M   signalName              ×5      │
│       "current value"                │
└──────────────────────────────────────┘
 │     │                       │
 │     │                       └── Change count
 │     └── Signal name
 └── Badge: M=mutable, C=computed, ✕=disposed
```

### Tabs

| Tab         | Description                        |
| ----------- | ---------------------------------- |
| **Signals** | List of all tracked signals        |
| **Tags**    | List of all tags and their signals |
| **Errors**  | Signals that have thrown errors    |
| **Events**  | Chronological event log            |
| **Stats**   | Overview statistics                |

---

## 📚 API Reference

### `enableDevTools(options?)`

Enable DevTools tracking. **Must be called before any signals are created.**

```tsx
import { enableDevTools } from "rextive/devtools";

enableDevTools({
  name: "my-app", // App name (shown in console logs)
  logToConsole: false, // Log events to browser console
  maxHistory: 50, // Max history entries per signal
});
```

| Option         | Type      | Default     | Description            |
| -------------- | --------- | ----------- | ---------------------- |
| `name`         | `string`  | `"rextive"` | App name for logs      |
| `logToConsole` | `boolean` | `false`     | Log events to console  |
| `maxHistory`   | `number`  | `50`        | Max history per signal |

### `disableDevTools()`

Disable DevTools and stop tracking.

```tsx
import { disableDevTools } from "rextive/devtools";

disableDevTools();
```

### `isDevToolsEnabled()`

Check if DevTools is currently enabled.

```tsx
import { isDevToolsEnabled } from "rextive/devtools";

if (isDevToolsEnabled()) {
  console.log("DevTools is active");
}
```

### `getSignals()`

Get a Map of all tracked signals.

```tsx
import { getSignals } from "rextive/devtools";

const signals = getSignals();
signals.forEach((info, id) => {
  console.log(id, info.kind, info.changeCount);
});
```

### `getSignal(id)`

Get info for a specific signal by ID (displayName).

```tsx
import { getSignal } from "rextive/devtools";

const info = getSignal("counter");
if (info) {
  console.log(info.kind, info.history);
}
```

### `getTags()`

Get a Map of all tracked tags.

```tsx
import { getTags } from "rextive/devtools";

const tags = getTags();
tags.forEach((info, id) => {
  console.log(id, info.signals.size);
});
```

### `getStats()`

Get overall statistics.

```tsx
import { getStats } from "rextive/devtools";

const stats = getStats();
console.log(`
  Signals: ${stats.signalCount}
  Mutable: ${stats.mutableCount}
  Computed: ${stats.computedCount}
  Tags: ${stats.tagCount}
  Disposed: ${stats.disposedCount}
  Errors: ${stats.totalErrors}
`);
```

### `getSnapshot()`

Get current values of all signals.

```tsx
import { getSnapshot } from "rextive/devtools";

const snapshot = getSnapshot();
console.log(snapshot);
// { counter: 42, doubled: 84, ... }
```

### `clearHistory()`

Clear history for all signals.

```tsx
import { clearHistory } from "rextive/devtools";

clearHistory();
```

### `clearDisposed()`

Remove disposed signals from the registry.

```tsx
import { clearDisposed } from "rextive/devtools";

clearDisposed();
```

### `reset()`

Reset DevTools state (clear all tracked data).

```tsx
import { reset } from "rextive/devtools";

reset();
```

### `onDevToolsEvent(callback)`

Subscribe to DevTools events.

```tsx
import { onDevToolsEvent } from "rextive/devtools";

const unsubscribe = onDevToolsEvent((event) => {
  switch (event.type) {
    case "signal:create":
      console.log("Signal created:", event.signal.id);
      break;
    case "signal:change":
      console.log("Signal changed:", event.signalId, event.value);
      break;
    case "signal:dispose":
      console.log("Signal disposed:", event.signalId);
      break;
    case "signal:error":
      console.log("Signal error:", event.signalId, event.error);
      break;
  }
});

// Later: stop listening
unsubscribe();
```

---

## ⚙️ Configuration

### Persisted Settings

The DevTools panel persists these settings in `localStorage`:

| Setting    | Key                       | Description                  |
| ---------- | ------------------------- | ---------------------------- |
| Position   | `rextive-devtools-config` | Panel position (left/bottom) |
| Expanded   | `rextive-devtools-config` | Whether panel is expanded    |
| Active Tab | `rextive-devtools-config` | Currently selected tab       |
| Show Auto  | `rextive-devtools-config` | Show auto-generated signals  |
| Panel Size | `rextive-devtools-config` | Custom panel size            |

### Reset Configuration

Click the `↺` button in the panel header to reset all persisted settings.

Or programmatically:

```tsx
localStorage.removeItem("rextive-devtools-config");
```

---

## 💡 Best Practices

### 1. Name Your Signals

Always provide meaningful names for important signals:

```tsx
// ✅ Good - easy to find in DevTools
const userCount = signal(0, { name: "userCount" });
const isLoading = signal(false, { name: "isLoading" });

// ❌ Bad - shows as #mutable-1, #mutable-2
const count = signal(0);
const loading = signal(false);
```

### 2. Enable Before Imports

Enable DevTools before importing modules that create signals:

```tsx
// ✅ Correct order
import { enableDevTools } from "rextive/devtools";
enableDevTools();

// Dynamic import ensures signals are tracked
const { App } = await import("./App");
```

```tsx
// ❌ Wrong order - signals may not be tracked
import { App } from "./App"; // Creates signals before enableDevTools!
import { enableDevTools } from "rextive/devtools";
enableDevTools();
```

### 3. Production Safety

Only enable DevTools in development:

```tsx
if (import.meta.env.DEV) {
  enableDevTools();
}

// Or with environment variable
if (process.env.NODE_ENV === "development") {
  enableDevTools();
}
```

### 4. Use Console Logging for Debugging

Enable console logging when debugging specific issues:

```tsx
enableDevTools({
  name: "my-app",
  logToConsole: true, // See all events in console
});
```

---

## 🔧 Troubleshooting

### Signals Not Appearing

**Problem:** Signals don't show up in DevTools.

**Solutions:**

1. Ensure `enableDevTools()` is called **before** any signals are created
2. Use dynamic imports to delay signal creation:
   ```tsx
   enableDevTools();
   const { App } = await import("./App");
   ```
3. Check if DevTools is enabled: `isDevToolsEnabled()`

### Auto-Generated Names

**Problem:** Signals show as `#mutable-1`, `#computed-2` instead of meaningful names.

**Solution:** Add `name` option when creating signals:

```tsx
const count = signal(0, { name: "count" });
```

### Performance Issues

**Problem:** App feels slow with DevTools enabled.

**Solutions:**

1. DevTools only subscribes to events when enabled - disable for production
2. Use "User" filter to hide auto-generated signals
3. Clear disposed signals with 🗑 button
4. Clear event history periodically

### Panel Not Visible

**Problem:** DevTools panel doesn't appear.

**Solutions:**

1. Ensure `<DevToolsPanel />` is rendered in your app
2. Check browser console for errors
3. Try clicking the collapsed panel on the left edge
4. Reset config: `localStorage.removeItem("rextive-devtools-config")`

### Disposed Signals Not Showing

**Problem:** Removed signals don't appear as disposed.

**Solution:** Ensure signals are properly disposed:

```tsx
const { signal } = useScope(() => ({
  signal: signal(0, { name: "mySignal" }),
  dispose: [signal], // Required!
}));
```

---

## 🔗 Related

- [Rextive Documentation](../README.md)
- [Signal API Reference](../README.md#-complete-api-reference)
- [useScope Hook](../README.md#usescope)

---

## 📄 License

MIT © Rextive Contributors
