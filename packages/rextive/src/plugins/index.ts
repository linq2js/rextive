/**
 * Signal plugins for rextive
 *
 * Plugins extend signal behavior with reusable, composable functionality.
 * Use them via the `use` option when creating signals.
 *
 * @example
 * ```ts
 * import { signal } from "rextive";
 * import { persistor } from "rextive/plugins";
 *
 * const count = signal(0, {
 *   use: [
 *     persistor({ load, save })("count"),
 *   ]
 * });
 * ```
 *
 * @module rextive/plugins
 */

export { persistor } from "./persistor";
export type {
  Persistor,
  PersistorOptions,
  PersistedValues,
  SaveArgs,
} from "./persistor";
