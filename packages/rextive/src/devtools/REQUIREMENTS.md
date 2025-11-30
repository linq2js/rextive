# Rextive DevTools - Requirements Document

This document captures all requirements for the DevTools panel. **All new features must be added here before implementation.**

---

## 📋 Table of Contents

- [Core Requirements](#core-requirements)
- [Panel Layout](#panel-layout)
- [Signals Tab](#signals-tab)
- [Tags Tab](#tags-tab)
- [Events Tab](#events-tab)
- [Search & Filtering](#search--filtering)
- [Visual Feedback](#visual-feedback)
- [Persistence](#persistence)
- [Performance](#performance)
- [Change Log](#change-log)

---

## Core Requirements

### REQ-001: DevTools Enablement

- [ ] DevTools must be explicitly enabled via `enableDevTools()` before any signals are created
- [ ] DevTools should have zero runtime overhead when disabled
- [ ] Should support configuration options: `name`, `logToConsole`, `maxHistory`

### REQ-002: Panel Container

- [x] Panel must be a fixed-position drawer attached to the viewport
- [x] Panel must support two positions: `bottom` and `left`
- [x] Panel must be collapsible/expandable via header click or toggle button
- [x] Panel must be resizable via drag handle when expanded
- [x] Panel must adjust body padding to prevent content overlap

### REQ-002a: Mobile Mode Layout ✨ NEW

- [x] In mobile mode (screen width ≤ 768px), drawer must be at bottom position only
- [x] Position toggle button should be hidden in mobile mode
- [x] Position should automatically switch to bottom when entering mobile mode

### REQ-003: Data Tracking

- [x] Track all signals created in the app (mutable and computed)
- [x] Track all tags created in the app
- [x] Track signal creation, changes, errors, and disposal events
- [x] Store value history for each signal (configurable max entries)
- [x] Capture source location where signals are declared

---

## Panel Layout

### REQ-010: Header

- [x] Display app icon and title "⚡ Rextive"
- [x] Show position toggle button (◀/▼)
- [x] Show expand/collapse toggle button
- [x] Show reset config button (↺)
- [x] Header should be clickable to toggle expand/collapse

### REQ-011: Tabs

- [x] Three main tabs: Signals, Tags, Events
- [ ] Fourth tab: "Chains" for chain reaction tracking ✨ PLANNED
- [x] Tab labels should show counts (e.g., "Signals (12)")
- [x] Events tab should show error count in red if errors exist
- [x] Active tab should be visually highlighted

### REQ-012: Search Box

- [x] Search input field with placeholder text
- [x] Clear button (✕) when search has text
- [x] Search should filter items in real-time
- [x] Search should be tab-specific

---

## Signals Tab

### REQ-020: Signal List

- [x] Display signals in a scrollable grid layout
- [x] Each signal shows: badge, name, change count, current value
- [x] Badge indicates type: M (mutable), C (computed), ✕ (disposed)
- [x] Color-coded badges: green (mutable), blue (computed), gray (disposed)
- [x] Disposed signals shown with reduced opacity and strikethrough
- [x] Active signals sorted before disposed signals

### REQ-020a: Signal List - Bottom Position Layout ✨ NEW

- [x] When drawer is at bottom position, signal items have min-width of 320px
- [x] This ensures items are readable in horizontal scroll layout
- [x] When drawer is at bottom position, list items have min-width of 320px ✨ NEW

### REQ-021: Signal Details (Expanded)

- [x] Click on signal to expand/collapse details
- [x] Show source location (file:line) if available
- [x] Show value history (most recent 5 entries with timestamps)

### REQ-021a: Signal Details - Full Display ✨ NEW

- [x] Show full signal name (not truncated, word-break: break-all)
- [x] Show full stringified signal value in scrollable pre-formatted block
- [x] Value block is scrollable with max-height 150px
- [x] Error values shown in red color

### REQ-022: Signal Actions

- [x] Copy button (📋) - copy JSON value to clipboard
- [x] Edit button (✏️) - edit mutable signal value (JSON input)
- [x] Events button (📜) - navigate to Events tab filtered by this signal
- [x] Reset button (↺) - reset mutable signal to initial value
- [x] Refresh button (⟳) - refresh/resume computed signal
- [x] Delete button (🗑) - remove disposed signal from devtools

### REQ-023: Signal Kind Filter

- [x] Filter buttons: All (A), Mutable (M), Computed (C), Error (E), Disposed (D)
- [x] Each button shows count of matching signals
- [x] Error filter should pulse/animate when there are errors

### REQ-024: Auto-Generated Filter

- [x] Toggle button: "user" / "#auto"
- [x] When "user" active, hide signals with auto-generated names (starting with #)
- [x] When "#auto" active, show all signals including auto-generated

### REQ-024a: Recent Activity Sort ✨ NEW

- [x] Toggle button with clock emoji (🕐) on left of auto-generated filter
- [x] When active, sort signal items by last activity time (updatedAt), latest first
- [x] When inactive, use default sort (active signals first, then disposed)
- [x] Visual indication when sort is active
- [x] Toggle is ON by default

### REQ-025: Disposed Signal Time Display ✨ NEW

- [x] For disposed signals, display the time when disposal occurred
- [x] Format as relative time or timestamp in the value column

---

## Chain Reactions Tab

### REQ-060: Chain Reaction Detection ✨ IMPLEMENTED

- [x] Only track chains with 2+ signals (N >= 2)
- [x] Use setTimeout(0) to detect end of synchronous chain
- [x] Track async signals (computed) with `[async]` badge
- [x] Only monitor when Chains tab is active (performance)

### REQ-061: Chain Reaction UI ✨ IMPLEMENTED

- [x] New "Chains" tab in DevTools panel
- [x] Display chain as: `trigger → effect1 → effect2 → ...`
- [x] Collapsible chain entries
- [x] Collapsed: show chain path + occurrence count (×N)
- [x] Expanded: show history of occurrences with timestamps
- [x] Show duration for each occurrence (start to end)
- [x] Mark status with icons: ✓ complete, ✕ interrupted, ⏳ pending
- [x] Clear button to reset chain history
- [x] Delete individual chains
- [x] Group identical chain paths together
- [x] Click signal in chain path to navigate to Signals tab

### REQ-062: Chain Reaction Data Model ✨ IMPLEMENTED

```typescript
interface ChainReaction {
  id: string; // unique chain path hash
  path: string[]; // ["count", "doubled", "tripled"]
  asyncSignals: Set<string>; // signals that were async
  occurrences: Array<{
    startTime: number;
    endTime?: number;
    duration?: number;
    status: "complete" | "interrupted" | "pending";
  }>;
}
```

### REQ-025: Clear Disposed Button

- [x] Show "🗑 N" button when there are disposed signals
- [x] Click clears all disposed signals from registry

---

## Tags Tab

### REQ-030: Tag List

- [x] Display tags in a scrollable grid layout
- [x] Each tag shows: badge (T), name, signal count
- [x] Badge color: purple for tags

### REQ-030a: Tag List - Bottom Position Layout ✨ NEW

- [x] When drawer is at bottom position, tag items have min-width of 320px
- [x] This ensures items are readable in horizontal scroll layout

### REQ-031: Tag Details (Expanded) ✨ NEW

- [x] Click on tag to expand/collapse details box
- [x] Show rotating arrow indicator (▶) that animates when expanded
- [x] When collapsed: show preview of first 3 signal names with "+N more"
- [x] When expanded: show "Signals (count)" header
- [x] When expanded: show scrollable list of all signals in the tag (max-height 200px)
- [x] Each signal entry shows:
  - Badge (M/C/✕) with appropriate colors
  - Signal name (clickable)
  - Current value preview (for non-disposed signals)
- [x] Disposed signals shown with reduced opacity and strikethrough
- [x] Click on signal navigates to Signals tab filtered by that signal

---

## Events Tab

### REQ-040: Event List

- [x] Display events in reverse chronological order (newest first)
- [x] Show timestamp, event type, signal/tag ID, value (if applicable)
- [x] Event types: create, change, dispose, error
- [x] Error events highlighted with red background and border

### REQ-041: Event Details

- [x] Click to expand events with long values
- [x] Show full JSON value in expandable pre-formatted block
- [x] Copy button for event values

### REQ-042: Event Kind Filter

- [x] Filter buttons: All (A), Error (E), Change (C), Create (+), Dispose (D)
- [x] Each button shows count of matching events
- [x] Error filter should pulse/animate when there are errors

### REQ-043: Clear Events

- [x] Clear button to remove all events from log
- [x] Button disabled when no events

### REQ-044: Event Navigation

- [x] Signal IDs are clickable links
- [x] Click navigates to Signals tab and filters by that signal
- [x] Tag IDs are clickable links
- [x] Click navigates to Tags tab and filters by that tag

---

## Search & Filtering

### REQ-050: Search Behavior

- [x] Search filters items by name (case-insensitive)
- [x] Search applies to current tab only
- [x] Empty state message when no matches found

### REQ-051: Auto-Generated Search Override ✨ NEW

- [x] When search query starts with `#`, automatically include auto-generated names
- [x] This overrides the "user" filter setting
- [x] Applies to both Signals and Tags tabs
- [x] Allows finding specific auto-generated signals without toggling the filter

### REQ-052: Advanced Search Syntax ✨ NEW

- [x] Support field-specific search with `field:value` syntax:
  - `name:user` - Search by signal/tag name
  - `value:42` - Search by signal value (stringified)
  - `file:App.tsx` - Search by source file path
  - `tag:form` - Search signals by tag membership
  - `kind:mutable` - Filter by signal kind (mutable/computed)
  - `error:true` - Show only signals with errors
  - `disposed:true` - Show only disposed signals
- [x] Support regex patterns when query is wrapped in `/` (e.g., `/user.*count/`)
- [x] Support multiple field filters (e.g., `name:user kind:computed`)
- [x] Default behavior: if no field prefix, search across name, value, and file path
- [x] Show search syntax hint in placeholder or tooltip
- [x] Help button (?) next to search box opens comprehensive search guide modal

### REQ-053: Value Search Enhancement ✨ NEW

- [x] Search signal values by:
  - String representation (JSON.stringify for objects)
  - Primitive value matching (numbers, strings, booleans)
  - Object property names and values
  - Array element matching
- [ ] Highlight matching parts in value display (future enhancement)
- [ ] Support deep object property search (e.g., `value:user.name`) (future enhancement)

### REQ-054: Search History & Suggestions ✨ NEW

- [ ] Store recent search queries in localStorage (last 10)
- [ ] Show search suggestions dropdown when typing
- [ ] Keyboard navigation (arrow keys, Enter to select)
- [ ] Clear search history option

---

## Visual Feedback

### REQ-060: Flash Animations

- [x] Signals flash yellow briefly when their value changes
- [x] Signals flash green briefly when created
- [x] Flash duration: 600ms

### REQ-061: Error Styling

- [x] Signals with errors show error icon and red styling
- [x] Error value displayed with warning icon (⚠)
- [x] Error count badge on affected signals

### REQ-062: Hover Effects

- [x] Items highlight on hover
- [x] Cursor changes to pointer for interactive elements

---

## Persistence

### REQ-070: LocalStorage Config

- [x] Persist panel position (bottom/left)
- [x] Persist expanded state
- [x] Persist active tab
- [x] Persist showAutoGenerated setting
- [x] Persist panel sizes (bottom height, left width)
- [x] Storage key: `rextive-devtools-config`

### REQ-071: Reset Config

- [x] Reset button (↺) in header clears all persisted settings
- [x] Resets to default values immediately

---

## Performance

### REQ-080: Efficient Updates

- [x] Data refresh interval: 500ms
- [x] Batch signal state updates
- [x] Clean up flash timeouts on unmount

### REQ-081: Event Log Limits

- [x] Maximum 100 events in memory
- [x] Oldest events automatically dropped

### REQ-082: Conditional Rendering

- [x] Only render content when panel is expanded
- [x] Only subscribe to events when DevTools is enabled

---

## Change Log

### 2024-XX-XX - Enhanced Search Functionality ✨ NEW

- Added: REQ-052, REQ-053, REQ-054 - Advanced search with field-specific syntax
- Support for `field:value` syntax (name, value, file, tag, kind, error, disposed)
- Regex pattern support with `/pattern/` syntax
- Multi-field filtering support
- Value search across stringified content
- Help button (?) next to search box with comprehensive search guide modal
- Search history and suggestions (planned)

### 2024-XX-XX - Signal Details Full Display

- Added: REQ-021a - Show full signal name and full value in scrollable details

### 2024-XX-XX - Chain Reactions Tab ✅ IMPLEMENTED

- Implemented: REQ-060, REQ-061, REQ-062 - Chain reaction detection and UI
- Detection via setTimeout(0) for sync chains
- Minimum 2 signals per chain (N >= 2)
- Only monitor when Chains tab is active (performance)
- Collapsible entries with occurrence history
- Clear, delete individual chains

### 2024-XX-XX - Disposed Signal Time Display

- Added: REQ-025 - Show disposal time in disposed signals value

### 2024-XX-XX - Recent Activity Sort

- Added: REQ-024a - Sort signals by last activity time with clock emoji toggler

### 2024-XX-XX - Mobile Mode Layout

- Added: REQ-002a - Drawer forced to bottom in mobile mode (≤768px)
- Position toggle hidden in mobile mode

### 2024-XX-XX - Bottom Position Min-Width

- Added: REQ-020a - Signal items have min-width 320px when drawer is at bottom
- Added: REQ-030a - Tag items have min-width 320px when drawer is at bottom
- Note: Event entries are excluded from min-width requirement

### 2024-XX-XX - Tag Details Feature

- Added: REQ-031 - Click on tag to show details box with signal list
- Added: REQ-051 - Search starting with `#` includes auto-generated names

### Initial Release

- Implemented all core requirements (REQ-001 through REQ-082)

---

## Future Enhancements (Backlog)

These are potential future features to consider:

- [ ] Signal dependency graph visualization
- [ ] Export/import signal snapshot
- [ ] Time-travel debugging (restore historical values)
- [ ] Signal grouping/folders
- [ ] Keyboard shortcuts
- [ ] Dark/light theme toggle
- [ ] Mobile-responsive design improvements
- [ ] Integration with browser DevTools extension
- [ ] Signal performance metrics (computation time)
- [ ] Diff view for object value changes
