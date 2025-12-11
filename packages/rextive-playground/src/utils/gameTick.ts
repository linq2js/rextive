/**
 * Game Tick Logic Factory
 * 
 * Creates an effect-like signal that handles game timer logic:
 * - Automatically starts interval when gameState === "playing"
 * - Auto-cleanup when gameState changes or logic disposes
 * - No manual subscription/cleanup needed in components
 * 
 * Usage in game logic:
 * ```ts
 * function myGameLogic() {
 *   const gameState = signal<GameState>("menu");
 *   const timeLeft = signal(60);
 *   
 *   // Create tick effect - auto-disposed with the logic scope
 *   gameTickLogic(gameState, () => {
 *     timeLeft.set(t => {
 *       if (t <= 1) { finishGame(); return 0; }
 *       return t - 1;
 *     });
 *   });
 *   
 *   return { gameState, timeLeft };
 * }
 * ```
 */
import { signal, type AnySignal } from "rextive";

/**
 * Creates an effect-like signal that runs a tick function every second
 * when the game state is "playing".
 * 
 * This is a logic factory - call it inside your game logic to create
 * an auto-managed timer that cleans up when the logic scope disposes.
 * 
 * @param gameState - Signal containing the current game state (must have "playing" value)
 * @param tick - Function to call every second while playing
 * @param options - Optional configuration
 */
export function gameTickLogic(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gameState: AnySignal<any>,
  tick: () => void,
  options: {
    /** Interval in milliseconds (default: 1000) */
    interval?: number;
    /** Name for debugging */
    name?: string;
  } = {}
) {
  const { interval = 1000, name = "gameTick" } = options;
  
  // Effect-like signal pattern:
  // - Watches gameState for changes
  // - Starts/stops timer based on state
  // - Auto-cleanup via onCleanup
  // - lazy: false to run immediately
  signal(
    { gameState },
    ({ deps, onCleanup, safe }) => {
      // Only run timer when playing
      if (deps.gameState !== "playing") return;
      
      // Start the tick interval
      const timerId = setInterval(() => {
        // safe() ensures tick doesn't run if effect is disposed
        safe(() => tick());
      }, interval);
      
      // Cleanup when gameState changes or signal disposes
      onCleanup(() => clearInterval(timerId));
    },
    { lazy: false, name: `${name}.effect` }
  );
}

