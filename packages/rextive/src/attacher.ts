import { is } from "./is";
import { Emitter } from "./react";
import { SignalKind, Plugin, Tag, SignalOf } from "./types";

/**
 * Creates an attacher for applying plugins and tags to a signal.
 *
 * Responsibilities:
 * - Apply plugins to signal (run once, collect cleanup)
 * - Register signal with tags
 * - Apply tag plugins recursively
 * - Auto-cleanup: remove signal from tags on disposal
 *
 * @param signal - The signal instance to extend
 * @param onDispose - Emitter to register cleanup functions
 * @returns Object with attach() method
 */
export function attacher<TValue, TKind extends SignalKind>(
  signal: SignalOf<TValue, TKind>,
  onDispose: Emitter<void>
) {
  // Track all tags this signal is added to (for cleanup on disposal)
  const tags = new Set<Tag<TValue, SignalKind>>();

  /**
   * Attach plugins and/or tags to the signal.
   * Tags are registered and their plugins are recursively applied.
   *
   * @param pluginsAndTags - Array of plugins or tags to attach
   */
  const attach = (
    pluginsAndTags: ReadonlyArray<
      Plugin<TValue, SignalKind> | Tag<TValue, SignalKind>
    >
  ) => {
    for (const item of pluginsAndTags) {
      if (is<TValue, TKind>(item, "tag")) {
        // Handle tag
        tags.add(item);
        item._add(signal);

        // Recursively apply tag's plugins
        if (item.use && item.use.length > 0) {
          attach(item.use);
        }
      } else if (typeof item === "function") {
        // Handle plugin (guaranteed to be Plugin if not Tag)
        const cleanup = item(signal);

        if (cleanup) {
          onDispose.on(cleanup);
        }
      }
    }
  };

  // Auto-cleanup: remove signal from all tags when disposed
  onDispose.on(() => {
    for (const tag of tags) {
      tag._delete(signal);
    }
  });

  return {
    attach,
  };
}
