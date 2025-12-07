import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useId,
  useRef,
} from "react";
import { EqualsFn, Mutable, Signal } from "../types";
import { useScope } from "./useScope";
import { is } from "../is";
import { signal } from "../signal";
import { EqualsStrategy, resolveEquals } from "../utils/resolveEquals";

// ============================================================================
// Types
// ============================================================================

/**
 * Options for simple provider (no factory).
 *
 * - **Signal mode** (default): Wraps value in a mutable signal
 * - **Raw mode** (`raw: true`): Passes value directly
 */
export type ProviderOptions = {
  /** Name for error messages (e.g., "Theme" → "Theme context not found...") */
  name: string;

  /**
   * Pass value directly without wrapping in a signal.
   * Use for logic instances or objects that are already reactive.
   * @default false
   */
  raw?: boolean;
};

/**
 * Options for factory provider.
 * Creates a custom context object using a factory function.
 */
export type ProviderOptionsWithFactory<TContext, TValue> = {
  /** Name for error messages */
  name: string;

  /** Factory to create context object. Called once on mount. */
  create: (value: TValue) => TContext;

  /** Called when props.value changes. Auto-updates if scope is mutable signal. */
  update?: (context: NoInfer<TContext>, value: NoInfer<TValue>) => void;
};

/** Result: [useContext hook, Provider component] */
export type ProviderResult<TContext, TValue> = [
  useContext: () => TContext extends Signal<any>
    ? TContext
    : Omit<TContext, "dispose">,
  Provider: (props: PropsWithChildren<{ value: TValue }>) => JSX.Element
];

// ============================================================================
// provider() function
// ============================================================================

/**
 * Creates a type-safe React Context Provider.
 *
 * **Three Modes:**
 * - **Signal** (default): `{ name }` → value wrapped in mutable signal
 * - **Raw**: `{ name, raw: true }` → value passed directly (for logic instances)
 * - **Factory**: `{ name, create }` → custom context via factory function
 *
 * @example Signal mode
 * ```tsx
 * const [useTheme, ThemeProvider] = provider<"dark" | "light">({ name: "Theme" });
 * <ThemeProvider value="dark"><App /></ThemeProvider>
 * const theme = useTheme();  // Mutable<"dark" | "light">
 * ```
 *
 * @example Raw mode
 * ```tsx
 * const [useStore, StoreProvider] = provider<StoreType>({ name: "Store", raw: true });
 * <StoreProvider value={useScope("store", storeLogic)}><App /></StoreProvider>
 * const $store = useStore();  // StoreType directly
 * ```
 *
 * @example Factory mode
 * ```tsx
 * const [useAuth, AuthProvider] = provider<AuthContext, User>({
 *   name: "Auth",
 *   create: (user) => ({ user: signal(user), logout: () => {} }),
 * });
 * ```
 *
 * @returns `[useContext, Provider]` tuple
 */
// Overload 1: Factory mode (with create function)
export function provider<TContext, TValue = TContext>(
  options: ProviderOptionsWithFactory<TContext, TValue>
): ProviderResult<TContext, TValue>;

// Overload 2: Signal mode (default) - wraps value in a mutable signal
export function provider<TContext>(
  options: ProviderOptions & {
    raw?: false;
    equals?: EqualsStrategy | EqualsFn<any>;
  }
): ProviderResult<Mutable<TContext>, TContext>;

// Overload 3: Raw mode - passes value directly without wrapping
export function provider<TContext>(
  options: ProviderOptions & {
    raw: true;
    equals?: EqualsStrategy | EqualsFn<any>;
  }
): ProviderResult<TContext, TContext>;

// Implementation
export function provider<TContext, TValue = TContext>(
  options:
    | ProviderOptionsWithFactory<TContext, TValue>
    | (ProviderOptions & {
        raw?: boolean;
        equals?: EqualsStrategy | EqualsFn<any>;
      })
): ProviderResult<TContext, TValue> {
  const context = createContext<TContext | null>(null);
  const raw = "raw" in options ? options.raw : false;
  const equals =
    ("equals" in options ? resolveEquals(options.equals) : undefined) ??
    Object.is;

  return [
    // useContext hook
    () => {
      const value = useContext(context);
      if (!value) {
        throw new Error(
          `${options.name} context not found. Make sure you're using the component within <${options.name}Provider>.`
        );
      }
      return value as any;
    },

    // Provider component
    (props: PropsWithChildren<{ value: TValue }>) => {
      const id = useId();
      const hasCreate = "create" in options;

      // Create scope for factory/signal modes (raw mode skips this)
      const scope = useScope(`${options.name}:${id}`, (): any => {
        if (raw) return undefined;
        if (hasCreate) return options.create(props.value);
        return signal(props.value);
      }) as TContext;

      // Stable reference to prevent unnecessary re-renders
      const providerRef = useRef<{ value: any }>();

      if (raw) {
        // Raw: update ref only when value actually changes (per equals)
        if (
          !providerRef.current ||
          !equals(providerRef.current.value, props.value)
        ) {
          providerRef.current = { value: props.value };
        }
      } else {
        // Signal/Factory: always use scope (it's stable)
        providerRef.current = { value: scope };
      }

      // Sync value prop changes to signal (signal/factory modes only)
      const depValue = raw ? false : props.value;
      useEffect(() => {
        if (raw) return;
        if (hasCreate && options.update) {
          options.update(scope, props.value);
        } else if (is(scope, "mutable")) {
          scope.set(props.value);
        }
      }, [depValue]);

      return (
        <context.Provider value={providerRef.current.value as any}>
          {props.children}
        </context.Provider>
      );
    },
  ] as const;
}
