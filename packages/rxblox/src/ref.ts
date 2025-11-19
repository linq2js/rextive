import { getContextType } from "./dispatcher";

/**
 * A reactive ref that can hold any value with a `ready()` helper.
 *
 * @template T - The type of value to store
 */
export interface BloxRef<T> {
  /**
   * The current value, or `null` if not yet set.
   */
  current: T | null;

  /**
   * Executes a callback when the ref is ready (not null or undefined).
   *
   * Provides automatic null/undefined checking and type narrowing.
   * **Must be called inside `blox.onMount()` or `effect()`** where the ref is already set.
   *
   * @param callback - Function to execute when the value is ready.
   *                   Receives the non-nullable value as argument.
   *                   Can return a value that will be returned by `ready()`.
   * @param orElse - Optional fallback function to call when ref is null/undefined.
   *                 If provided, returns its result instead of undefined.
   * @returns The callback's return value if ready, or `orElse()` result (or `undefined` if `orElse` not provided).
   *
   * @example
   * ```tsx
   * const inputRef = ref<HTMLInputElement>();
   *
   * blox.onMount(() => {
   *   inputRef.ready((input) => {
   *     // Type: HTMLInputElement (not null/undefined)
   *     input.focus();
   *   });
   * });
   *
   * return <input ref={inputRef} />;
   * ```
   *
   * @example
   * ```tsx
   * // With return value
   * const divRef = ref<HTMLDivElement>();
   *
   * blox.onMount(() => {
   *   const width = divRef.ready((div) => div.clientWidth);
   *   // Type: number | undefined
   *   console.log(width);
   * });
   * ```
   *
   * @example
   * ```tsx
   * // With orElse fallback
   * const canvasRef = ref<HTMLCanvasElement>();
   *
   * blox.onMount(() => {
   *   const width = canvasRef.ready(
   *     (canvas) => canvas.width,
   *     () => 0  // Fallback value
   *   );
   *   // Type: number (always defined)
   *   console.log("Canvas width:", width);
   * });
   * ```
   */
  ready<R, E = undefined>(
    callback: (value: Exclude<T, null | undefined>) => R,
    orElse?: () => E
  ): R | E;
}

/**
 * Creates a reactive ref that can hold any value.
 *
 * Returns a ref object with a `ready()` method for type-safe value access.
 * Commonly used for DOM elements, but can store any value.
 *
 * **Can be called anywhere** - Inside or outside `blox` components.
 *
 * @template T - The type of value to store
 * @returns A BloxRef object with `.current` and `.ready()` method
 *
 * @example DOM element usage
 * ```tsx
 * import { blox, ref } from "rxblox";
 *
 * const MyComponent = blox(() => {
 *   const inputRef = ref<HTMLInputElement>();
 *
 *   blox.onMount(() => {
 *     inputRef.ready((input) => {
 *       input.focus(); // Type-safe, no null checking needed
 *     });
 *   });
 *
 *   return <input ref={inputRef} />;
 * });
 * ```
 *
 * @example Storing non-DOM values
 * ```tsx
 * import { blox, ref } from "rxblox";
 *
 * interface WebSocketClient {
 *   send: (data: string) => void;
 *   close: () => void;
 * }
 *
 * const ChatComponent = blox(() => {
 *   const wsRef = ref<WebSocketClient>();
 *
 *   blox.onMount(() => {
 *     const ws = new WebSocket('ws://localhost:8080');
 *     wsRef.current = {
 *       send: (data) => ws.send(data),
 *       close: () => ws.close()
 *     };
 *
 *     return () => wsRef.current?.close();
 *   });
 *
 *   const sendMessage = (msg: string) => {
 *     wsRef.ready((ws) => ws.send(msg));
 *   };
 *
 *   return <button onClick={() => sendMessage('Hello')}>Send</button>;
 * });
 * ```
 *
 * @example Multiple refs with ref.ready()
 * ```tsx
 * import { blox, ref } from "rxblox";
 *
 * const MyComponent = blox(() => {
 *   const inputRef = ref<HTMLInputElement>();
 *   const buttonRef = ref<HTMLButtonElement>();
 *
 *   blox.onMount(() => {
 *     ref.ready([inputRef, buttonRef], (input, button) => {
 *       input.focus();
 *       button.disabled = false;
 *     });
 *   });
 *
 *   return (
 *     <>
 *       <input ref={inputRef} />
 *       <button ref={buttonRef}>Click</button>
 *     </>
 *   );
 * });
 * ```
 */
export function ref<T>(): BloxRef<T> {
  // Create a plain ref object (no hooks needed)
  const r: any = {
    current: null as T | null,
    ready<R, E = undefined>(
      callback: (value: Exclude<T, null | undefined>) => R,
      orElse?: () => E
    ): R | E {
      // Simply check if ref is ready and call callback
      // No lifecycle registration - caller should use effect() or blox.onMount()
      if (r.current != null) {
        return callback(r.current as Exclude<T, null | undefined>);
      }

      return orElse?.() as E;
    },
  };

  return r as BloxRef<T>;
}

/**
 * Extract value types from an array of BloxRef objects.
 *
 * @template T - Tuple of BloxRef types
 */
type ExtractRefTypes<T extends readonly BloxRef<any>[]> = {
  [K in keyof T]: T[K] extends BloxRef<infer E>
    ? Exclude<E, null | undefined>
    : never;
};

/**
 * Executes a callback when all refs are ready (not null or undefined).
 *
 * Provides automatic null/undefined checking and type narrowing for multiple refs.
 * Works with any ref type - DOM elements, objects, or any other values.
 * **Must be called inside `blox.onMount()` or `effect()`** where refs are already set.
 *
 * Exported as `ref.ready()`.
 *
 * @template T - Tuple of BloxRef types
 * @template R - Return type of callback
 * @template E - Return type of orElse callback
 * @param refs - Array of BloxRef objects to wait for
 * @param callback - Function to execute when all values are ready.
 *                   Receives all non-nullable values as arguments.
 *                   Can return a value that will be returned by `ready()`.
 * @param orElse - Optional fallback function to call when any ref is null/undefined.
 * @returns The callback's return value, or `orElse()` result (or `undefined` if `orElse` not provided).
 *
 * @example DOM elements
 * ```tsx
 * import { blox, ref } from "rxblox";
 *
 * const MyComponent = blox(() => {
 *   const inputRef = ref<HTMLInputElement>();
 *   const buttonRef = ref<HTMLButtonElement>();
 *   const divRef = ref<HTMLDivElement>();
 *
 *   blox.onMount(() => {
 *     ref.ready([inputRef, buttonRef, divRef], (input, button, div) => {
 *       // All types are non-nullable
 *       input.focus();
 *       button.disabled = false;
 *       div.style.opacity = "1";
 *     });
 *   });
 *
 *   return (
 *     <>
 *       <input ref={inputRef} />
 *       <button ref={buttonRef}>Click</button>
 *       <div ref={divRef}>Content</div>
 *     </>
 *   );
 * });
 * ```
 *
 * @example Non-DOM values
 * ```tsx
 * import { blox, ref } from "rxblox";
 *
 * interface AudioPlayer {
 *   play: () => void;
 *   pause: () => void;
 * }
 *
 * interface VideoPlayer {
 *   play: () => void;
 *   stop: () => void;
 * }
 *
 * const MediaComponent = blox(() => {
 *   const audioRef = ref<AudioPlayer>();
 *   const videoRef = ref<VideoPlayer>();
 *
 *   blox.onMount(() => {
 *     // Initialize refs
 *     audioRef.current = createAudioPlayer();
 *     videoRef.current = createVideoPlayer();
 *
 *     // Use when both are ready
 *     ref.ready([audioRef, videoRef], (audio, video) => {
 *       audio.play();
 *       video.play();
 *     });
 *   });
 *
 *   return <div>Media Content</div>;
 * });
 * ```
 *
 * @example With return value
 * ```tsx
 * import { blox, ref } from "rxblox";
 *
 * const MyComponent = blox(() => {
 *   const canvas = ref<HTMLCanvasElement>();
 *   const container = ref<HTMLDivElement>();
 *
 *   blox.onMount(() => {
 *     const dimensions = ref.ready([canvas, container], (canvas, container) => ({
 *       canvasWidth: canvas.width,
 *       containerWidth: container.clientWidth,
 *     }));
 *     // Type: { canvasWidth: number; containerWidth: number } | undefined
 *     if (dimensions) {
 *       console.log(dimensions);
 *     }
 *   });
 *
 *   return (
 *     <>
 *       <canvas ref={canvas} />
 *       <div ref={container}>Container</div>
 *     </>
 *   );
 * });
 * ```
 */
export function ready<
  const T extends readonly BloxRef<any>[],
  R,
  E = undefined
>(
  refs: T,
  callback: (...values: ExtractRefTypes<T>) => R,
  orElse?: () => E
): R | E {
  // Simply check if all refs are ready and call callback
  // No lifecycle registration - caller should use effect() or blox.onMount()
  const allReady = refs.every((ref) => ref.current != null);
  if (allReady) {
    const values = refs.map((ref) => ref.current) as ExtractRefTypes<T>;
    return callback(...values);
  }
  return orElse?.() as E;
}
