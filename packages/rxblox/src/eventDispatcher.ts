import { dispatcherToken, getDispatcher } from "./dispatcher";
import { Emitter } from "./emitter";

/**
 * Event dispatcher that manages lifecycle event emitters for blox components.
 *
 * Provides emitters for:
 * - `unmount`: Called when component unmounts
 * - `mount`: Called when component mounts
 * - `render`: Called on each render
 */
export type EventDispatcher = Record<"unmount" | "mount" | "render", Emitter>;

/**
 * Dispatcher token for event management.
 *
 * Use this to:
 * - Create entries: `eventToken(dispatcher)`
 * - Retrieve dispatcher: `getDispatcher(eventToken)`
 */
export const eventToken = dispatcherToken<EventDispatcher>("eventDispatcher");

/**
 * Internal helper to register callbacks for a specific event type.
 *
 * @param type - The event type (unmount, mount, or render)
 * @param callbacks - Callbacks to register for this event
 * @throws {Error} If called outside a blox component context
 */
function onEvent(type: keyof EventDispatcher, callbacks: VoidFunction[]) {
  const dispatcher = getDispatcher(eventToken);

  if (!dispatcher) {
    throw new Error(
      "Event dispatcher not found. Did you call `onEvent` outside of a `blox` component?"
    );
  }

  callbacks.forEach((callback) => dispatcher[type].add(callback));
}

/**
 * Registers callbacks to run when the component unmounts.
 *
 * Must be called inside a `blox` component.
 *
 * @param callbacks - Functions to call on component unmount
 * @throws {Error} If called outside a blox component context
 *
 * @example
 * ```tsx
 * const MyComponent = blox(() => {
 *   onUnmount(() => console.log("Unmounting"));
 *   return <div>Content</div>;
 * });
 * ```
 */
export function onUnmount(...callbacks: VoidFunction[]) {
  onEvent("unmount", callbacks);
}

/**
 * Registers callbacks to run when the component mounts.
 *
 * Must be called inside a `blox` component.
 *
 * @param callbacks - Functions to call on component mount
 * @throws {Error} If called outside a blox component context
 */
export function onMount(...callbacks: VoidFunction[]) {
  onEvent("mount", callbacks);
}

/**
 * Registers callbacks to run on each render.
 *
 * Must be called inside a `blox` component.
 *
 * @param callbacks - Functions to call on each render
 * @throws {Error} If called outside a blox component context
 */
export function onRender(...callbacks: VoidFunction[]) {
  onEvent("render", callbacks);
}
