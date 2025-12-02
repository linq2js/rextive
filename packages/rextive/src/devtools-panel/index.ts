/**
 * Rextive DevTools Panel
 *
 * An overlay panel for inspecting signals and tags during development.
 *
 * @example
 * ```tsx
 * import { DevToolsPanel } from 'rextive/devtools-panel';
 * import { enableDevTools } from 'rextive/devtools';
 *
 * // Enable devtools first
 * enableDevTools();
 *
 * function App() {
 *   return (
 *     <>
 *       <YourApp />
 *       {import.meta.env.DEV && <DevToolsPanel />}
 *     </>
 *   );
 * }
 * ```
 *
 * @module devtools-panel
 */

export { DevToolsPanel } from "./DevToolsPanel";
