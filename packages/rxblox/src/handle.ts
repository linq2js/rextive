import { onRender } from "./eventDispatcher";

/**
 * A handle to capture and access values from React hooks or render-phase logic.
 *
 * @template T - The type of value captured by the handle
 */
export type Handle<T> = {
  /**
   * The current captured value, or `undefined` if not yet captured.
   * Updated on every render when the callback executes.
   */
  readonly current: T | undefined;
};

/**
 * Creates a handle to capture values from React hooks during the render phase.
 *
 * This is useful in `blox` components where you need to use React hooks but the component
 * body only runs once. The callback runs on every render via `blox.onRender()`, and the returned
 * value is accessible via `.current`.
 *
 * **Must be called inside a `blox` component.** Exported as `blox.handle()`.
 *
 * @example
 * ```tsx
 * const MyComponent = blox(() => {
 *   const count = signal(0);
 *
 *   // Capture React hooks
 *   const router = blox.handle(() => {
 *     const history = useHistory();
 *     const location = useLocation();
 *     return { history, location };
 *   });
 *
 *   const handleNavigate = () => {
 *     router.current?.history.push("/home");
 *   };
 *
 *   return (
 *     <div>
 *       {rx(() => <div>{count()}</div>)}
 *       <button onClick={handleNavigate}>Navigate</button>
 *     </div>
 *   );
 * });
 * ```
 *
 * @template T - The type of value returned by the callback
 * @param callback - Function that runs on every render and returns a value to capture
 * @returns A handle with a `.current` property containing the captured value
 */
export function handle<T>(callback: () => T): Handle<T> {
  let current: T | undefined;

  onRender(() => {
    current = callback();
  });

  return {
    get current() {
      return current;
    },
  };
}

