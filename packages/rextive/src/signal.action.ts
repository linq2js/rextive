import { signal } from "./signal";
import {
  Computed,
  EqualsFn,
  Mutable,
  Signal,
  SignalContext,
  SignalMap,
  UseList,
} from "./types";
import { isPromiseLike } from "./utils/isPromiseLike";
import { operatorId } from "./utils/nameGenerator";
import { resolveEquals } from "./utils/resolveEquals";
import { EqualsStrategy } from "./types";

// ============================================================================
// Types
// ============================================================================

export type ActionEqualsOption<T> = EqualsStrategy | EqualsFn<T>;

export type ActionEquals<TPayload, TResult> =
  | EqualsStrategy // applies to result only (payload uses notifier behavior)
  | {
      payload?: ActionEqualsOption<TPayload>;
      result?: ActionEqualsOption<TResult>;
    };

export type WithInitialPayload<TPayload> = {
  /**
   * Initial payload value. If provided, the action handler runs immediately
   * with this payload (instead of waiting for first dispatch).
   */
  initialPayload: TPayload;
};

export type ActionOptions<
  TPayload,
  TResult,
  TMode extends "lazy" | "eager" = "lazy"
> = {
  /**
   * Debug name for the action signals.
   * Creates `${name}.payload` and `${name}.result` signals.
   */
  name?: string;

  /**
   * Custom equality for payload and/or result signals.
   * String shortcut applies to result only (payload uses notifier behavior).
   */
  equals?: TMode extends "lazy"
    ? ActionEquals<TPayload | undefined, TResult | undefined>
    : ActionEquals<TPayload, TResult>;

  /**
   * Plugins to extend the result signal's behavior.
   */
  use?: TMode extends "lazy"
    ? UseList<TResult | undefined, "computed">
    : UseList<TResult, "computed">;

  /**
   * Called when the action handler throws (sync) or rejects (async).
   * For async handlers, called when the promise rejects.
   *
   * @param error - The error thrown or rejection reason
   */
  onError?: (error: unknown) => void;

  /**
   * Called when the action handler completes successfully.
   * For async handlers, called when the promise resolves.
   *
   * @param result - The resolved result value (awaited for async)
   */
  onSuccess?: (result: Awaited<TResult>) => void;

  /**
   * Called immediately when dispatch() is called, before handler runs.
   * Useful for tracking, analytics, or logging.
   *
   * @param payload - The dispatched payload
   */
  onDispatch?: (payload: TPayload) => void;
};

/**
 * Context available in action handler
 */
export interface ActionContext<TPayload = void> extends SignalContext {
  /**
   * The payload passed to dispatch().
   *
   * Always defined when handler runs via `dispatch()` - the context is created
   * with the dispatched payload already set.
   *
   * @example
   * ```ts
   * const fetchUser = signal.action<string, User>(async (ctx) => {
   *   // ctx.payload is always the dispatched value (string)
   *   return fetch(`/users/${ctx.payload}`).then(r => r.json());
   * });
   *
   * fetchUser.dispatch('user-123'); // ctx.payload = 'user-123'
   * ```
   */
  payload: TPayload;
}

/**
 * Shorthand alias for ActionContext
 * @example
 * ```ts
 * const action = signal.action({ userId }, (ctx: AC<string>, deps) => {
 *   return fetch(`/users/${deps.userId}`);
 * });
 * ```
 */
export type AC<TPayload = void> = ActionContext<TPayload>;

/**
 * Resolved dependency values (read-only snapshot at dispatch time)
 */
export type ActionDeps<TDependencies extends SignalMap> = {
  [K in keyof TDependencies]: TDependencies[K] extends { (): infer V }
    ? V
    : never;
};

/**
 * Action instance returned by signal.action()
 */
export type Action<
  TPayload,
  TResult,
  TMode extends "lazy" | "eager" = "lazy"
> = {
  readonly mode: TMode;
  /**
   * Dispatch the action with a payload.
   * Triggers recomputation of `result` and updates `payload` signal.
   *
   * @param payload - The payload to dispatch
   * @returns The result of the action handler
   */
  dispatch: (payload: TPayload) => TResult;

  /**
   * Signal containing the last dispatched payload.
   * Acts as a notifier - triggers on every dispatch even with same value.
   *
   * **Note:** Value is `undefined` before first `dispatch()` call.
   */
  payload: TMode extends "lazy"
    ? Signal<TPayload, undefined>
    : Signal<TPayload>;

  /**
   * Computed signal containing the result of the last action execution.
   *
   * **Note:** If accessed before first `dispatch()`, the handler runs with
   * `ctx.payload === undefined`. Handle this case in your handler.
   */
  result: Computed<TMode extends "lazy" ? TResult | undefined : TResult>;
};

// ============================================================================
// Helpers
// ============================================================================

const NOT_EQUALS = () => false;

function resolveActionEquals<TPayload, TResult>(
  equals: ActionEquals<TPayload, TResult> | undefined
): {
  payloadEquals: EqualsFn<TPayload> | undefined;
  resultEquals: EqualsFn<TResult> | undefined;
} {
  if (!equals) {
    return {
      payloadEquals: NOT_EQUALS, // notifier behavior by default
      resultEquals: undefined, // Object.is by default
    };
  }

  // String shortcut applies to result only
  if (typeof equals === "string") {
    return {
      payloadEquals: NOT_EQUALS,
      resultEquals: resolveEquals(equals),
    };
  }

  // Object with separate options
  return {
    payloadEquals: equals.payload ? resolveEquals(equals.payload) : NOT_EQUALS,
    resultEquals: equals.result ? resolveEquals(equals.result) : undefined,
  };
}

// ============================================================================
// Overloads
// ============================================================================

/**
 * Create an action with dependencies
 *
 * @param dependencies - Map of signals the action depends on
 * @param handler - Action handler that receives context and deps
 * @param options - Action options
 * @returns Action instance with dispatch, payload, and result
 *
 * @example
 * ```ts
 * const fetchUserPosts = signal.action(
 *   { userId, authToken },
 *   async (ctx, deps) => {
 *     return fetch(`/users/${deps.userId}/posts`, {
 *       headers: { Authorization: deps.authToken },
 *       signal: ctx.abortSignal
 *     }).then(r => r.json());
 *   }
 * );
 *
 * // Dispatch
 * fetchUserPosts.dispatch({ status: 'published' });
 *
 * // React to result
 * rx(() => {
 *   const state = task.from(fetchUserPosts.result());
 *   if (state.loading) return <Spinner />;
 *   return <PostList posts={state.value} />;
 * });
 * ```
 */
export function signalAction<
  TPayload,
  TResult,
  TDependencies extends SignalMap
>(
  dependencies: TDependencies,
  handler: (
    context: ActionContext<TPayload>,
    deps: ActionDeps<TDependencies>
  ) => TResult,
  options?: ActionOptions<TPayload, TResult>
): Action<TPayload, TResult, "lazy">;

export function signalAction<
  TPayload,
  TResult,
  TDependencies extends SignalMap
>(
  dependencies: TDependencies,
  handler: (
    context: ActionContext<TPayload>,
    deps: ActionDeps<TDependencies>
  ) => TResult,
  options: ActionOptions<TPayload, TResult, "eager"> &
    NoInfer<WithInitialPayload<TPayload>>
): Action<TPayload, TResult, "eager">;

/**
 * Create an action without dependencies
 *
 * @param handler - Action handler that receives context
 * @param options - Action options
 * @returns Action instance with dispatch, payload, and result
 *
 * @example
 * ```ts
 * const login = signal.action<Credentials, User>(
 *   async (ctx) => {
 *     return fetch('/login', {
 *       method: 'POST',
 *       body: JSON.stringify(ctx.payload),
 *       signal: ctx.abortSignal
 *     }).then(r => r.json());
 *   }
 * );
 *
 * // Dispatch
 * login.dispatch({ username: 'admin', password: 'secret' });
 *
 * // React to result
 * rx(() => {
 *   const state = task.from(login.result());
 *   if (state.loading) return <Spinner />;
 *   if (state.error) return <Error error={state.error} />;
 *   return <Dashboard user={state.value} />;
 * });
 * ```
 *
 * @example Trigger-only action (no payload needed)
 * ```ts
 * const refresh = signal.action<void, Data[]>(async (ctx) => {
 *   // ctx.payload not used - just a trigger
 *   return fetch('/api/data').then(r => r.json());
 * });
 *
 * refresh.dispatch(); // Trigger refresh
 * ```
 */
export function signalAction<TPayload, TResult>(
  handler: (context: ActionContext<TPayload>) => TResult,
  options?: ActionOptions<TPayload, TResult>
): Action<TPayload, TResult, "lazy">;

export function signalAction<TPayload, TResult>(
  handler: (context: ActionContext<TPayload>) => TResult,
  options: ActionOptions<TPayload, TResult, "eager"> &
    NoInfer<WithInitialPayload<TPayload>>
): Action<TPayload, TResult, "eager">;

// ============================================================================
// Implementation
// ============================================================================

export function signalAction<
  TPayload,
  TResult,
  TDependencies extends SignalMap
>(...args: any[]): Action<TPayload, TResult, "lazy" | "eager"> {
  // Parse arguments based on overload
  let dependencies: TDependencies | undefined;
  let handler: (
    context: ActionContext<TPayload>,
    deps?: ActionDeps<TDependencies>
  ) => TResult;
  let options: ActionOptions<TPayload, TResult> | undefined;

  if (typeof args[0] === "function") {
    // Overload 2: signalAction(handler, options?)
    handler = args[0];
    options = args[1];
  } else {
    // Overload 1: signalAction(dependencies, handler, options?)
    dependencies = args[0];
    handler = args[1];
    options = args[2];
  }

  const { name, equals, use } = options ?? {};
  const { payloadEquals, resultEquals } = resolveActionEquals(equals);
  const actionId = operatorId("action");
  // Create payload signal (empty/notifier style)
  const payloadSignal = signal<TPayload>(undefined as any, {
    equals: payloadEquals ?? NOT_EQUALS,
    name: name ? `${name}.payload` : actionId + ".payload",
    onChange: options?.onDispatch,
  }) as unknown as Mutable<TPayload, undefined>;
  let dispatched = false;

  // Build dependencies for the result computed signal
  // ONLY include __payload - user deps are read at dispatch time, not reactive
  const resultDeps: SignalMap = {
    ...dependencies,
    __payload: payloadSignal,
  };

  // effect ot update result signal when payload changes
  const resultSignal = signal(
    resultDeps,
    (context) => {
      // always depends on payload signal
      const payload = context.deps.__payload;

      if (!dispatched) {
        return undefined;
      }
      // Build action context with payload
      // Note: We use 'as unknown as' for 'use' because ActionContext extends SignalContext
      // but has additional payload property that doesn't affect the 'use' function semantics
      const actionContext: ActionContext<TPayload> = Object.assign(
        { payload },
        context
      );

      try {
        // Execute handler with action context and deps
        const result = handler(
          actionContext,
          context.deps as ActionDeps<TDependencies>
        );

        if (options?.onSuccess || options?.onError) {
          // Handle async results - track success/error when promise settles
          if (isPromiseLike(result)) {
            // Use safe() to handle abort - returns never-resolving promise if aborted
            // In that case, onSuccess/onError won't be called (correct behavior)
            context.safe(result).then(
              (resolvedResult) => {
                options?.onSuccess?.(resolvedResult as Awaited<TResult>);
              },
              (error) => {
                options?.onError?.(error);
                // Note: Don't re-throw here - error is already tracked in the promise
                // and will be accessible via task.from(result). Re-throwing would
                // cause an unhandled promise rejection.
              }
            );
          } else {
            // Sync result - call onSuccess immediately
            options?.onSuccess?.(result as Awaited<TResult>);
          }
        }

        return result;
      } catch (error) {
        // Sync error - call onError and re-throw for result signal error state
        options?.onError?.(error);
        throw error;
      }
    },
    {
      name: name ? `${name}.result` : actionId + ".result",
      equals: resultEquals as any,
      use: use as any[],
    }
  );

  // Create dispatch function
  const dispatch = (payload: TPayload): TResult => {
    dispatched = true;
    // Set payload (triggers result recomputation)
    payloadSignal.set(payload);

    // Return current result value
    return resultSignal() as TResult;
  };

  let mode = "lazy";

  if (options && "initialPayload" in options) {
    mode = "eager";
    dispatched = true;
    payloadSignal.set(options.initialPayload as TPayload);
  }

  return {
    mode,
    dispatch,
    payload: payloadSignal,
    result: resultSignal,
  } as unknown as Action<TPayload, TResult, "lazy" | "eager">;
}
