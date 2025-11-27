/**
 * Signal plugins for rextive
 *
 * Plugins extend signal behavior with reusable, composable functionality.
 * Use them via the `use` option when creating signals.
 *
 * @example
 * ```ts
 * import { signal } from "rextive";
 * import { when, persistor } from "rextive/plugins";
 *
 * const trigger = signal(0);
 * const count = signal(0, {
 *   use: [
 *     when(trigger, (sig) => sig.refresh()),
 *     persistor({ load, save })("count"),
 *   ]
 * });
 * ```
 *
 * @module rextive/plugins
 */

export { when } from "./when";
export type { WhenCallback } from "./when";

export { persistor } from "./persistor";
export type {
  Persistor,
  PersistorOptions,
  PersistedValues,
  SaveArgs,
} from "./persistor";
