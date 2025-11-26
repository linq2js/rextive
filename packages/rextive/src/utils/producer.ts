import { tryDispose } from "../disposable";
import { Producer } from "../types";

/**
 * Creates a lazy factory that produces and manages a single instance at a time.
 *
 * The producer pattern is useful when you need:
 * - Lazy initialization of resources
 * - Automatic cleanup when cycling through instances
 * - Control over instance lifecycle (create/dispose)
 *
 * If the produced value has a `dispose()` method (or `dispose` array),
 * it will be called automatically when `next()` or `dispose()` is invoked.
 *
 * @param factory - Function that creates new instances
 * @returns A Producer with current(), next(), dispose(), has(), and peek() methods
 *
 * @example Basic usage with AbortController
 * ```ts
 * const abortProducer = producer(() => new AbortController());
 *
 * // Get or create current controller
 * const controller = abortProducer.current();
 * fetch('/api', { signal: controller.signal });
 *
 * // Create new controller (previous one is NOT aborted - call .abort() manually if needed)
 * const newController = abortProducer.next();
 *
 * // Cleanup when done
 * abortProducer.dispose();
 * ```
 *
 * @example With disposable resources (auto-cleanup)
 * ```ts
 * class Connection implements Disposable {
 *   constructor(public url: string) { console.log('Connected to', url); }
 *   dispose() { console.log('Disconnected'); }
 * }
 *
 * const connProducer = producer(() => new Connection('ws://localhost'));
 *
 * connProducer.current(); // "Connected to ws://localhost"
 * connProducer.next();    // "Disconnected", then "Connected to ws://localhost"
 * connProducer.dispose(); // "Disconnected"
 * ```
 *
 * @example Check without creating
 * ```ts
 * const p = producer(() => expensiveResource());
 *
 * if (p.has()) {
 *   // Use existing resource
 *   const resource = p.peek()!;
 * }
 *
 * // Safely get or create
 * const resource = p.current();
 * ```
 */
export function producer<T>(factory: () => T): Producer<T> {
  let value: T | undefined;
  let hasValue = false;

  const disposeCurrent = () => {
    if (hasValue && value !== undefined) {
      tryDispose(value);
    }
    value = undefined;
    hasValue = false;
  };

  const create = (): T => {
    value = factory();
    hasValue = true;
    return value;
  };

  return {
    current(): T {
      if (hasValue) {
        return value as T;
      }
      return create();
    },

    next(): T {
      disposeCurrent();
      return create();
    },

    dispose(): void {
      disposeCurrent();
    },

    has(): boolean {
      return hasValue;
    },

    peek(): T | undefined {
      return hasValue ? value : undefined;
    },
  };
}
