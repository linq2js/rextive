import { createContext, PropsWithChildren, useContext, useEffect } from "react";
import { ExDisposable, Signal } from "../types";
import { useScope } from "./useScope";
import { is } from "../is";

/**
 * Options for configuring a provider's behavior.
 *
 * @template TContext - The type of the context object returned by create()
 * @template TValue - The type of the value prop passed to the Provider
 */
export type ProviderOptions<TContext, TValue> = {
  /**
   * Name used in error messages when the hook is used outside the provider.
   * Example: "Theme" will show "Theme context not found..."
   */
  name: string;

  /**
   * Factory function that creates the context object.
   * Called once when the Provider component mounts.
   *
   * @param value - The initial value from props.value
   * @returns An object containing your context (signals, methods, etc.)
   *          Must be disposable for proper cleanup
   *
   * @example
   * ```tsx
   * create: (value) => {
   *   const themeSignal = signal(value);
   *   return disposable({ themeSignal });
   * }
   * ```
   */
  create: (value: TValue) => ExDisposable & TContext;

  /**
   * Function called when props.value changes.
   * Use this to update your context object with the new value.
   *
   * @param context - The context object created by create()
   * @param value - The new value from props.value
   *
   * @example
   * ```tsx
   * update: (context, value) => {
   *   context.themeSignal.set(value);
   * }
   * ```
   */
  update?: (context: NoInfer<TContext>, value: NoInfer<TValue>) => void;
};

/**
 * Result tuple returned by the provider() function.
 * - [0]: useContext hook to access the context value
 * - [1]: Provider component to wrap the tree
 */
export type ProviderResult<TContext, TValue> = [
  useContext: () => TContext extends Signal<any>
    ? TContext
    : Omit<TContext, "dispose">,
  Provider: (props: PropsWithChildren<{ value: TValue }>) => JSX.Element
];

/**
 * Creates a type-safe React Context Provider with flexible context management.
 *
 * This utility simplifies creating context providers by:
 * 1. Automatically managing context lifecycle with useScope
 * 2. Providing type-safe hooks with clear error messages
 * 3. Supporting any context shape (signals, methods, multiple signals, etc.)
 * 4. Handling cleanup automatically when the provider unmounts
 *
 * @template TContext - The type of your context object (what useContext returns)
 * @template TValue - The type of the value prop passed to Provider
 *
 * @param options - Configuration object
 * @returns Tuple of [useContext hook, Provider component]
 *
 * @example Simple signal context
 * ```tsx
 * const [useTheme, ThemeProvider] = provider<
 *   { theme: Signal<string> },
 *   string
 * >({
 *   name: "Theme",
 *   create: (value) => {
 *     const theme = signal(value);
 *     return disposable({ theme });
 *   },
 *   update: (context, value) => {
 *     context.theme.set(value);
 *   }
 * });
 *
 * // Usage
 * <ThemeProvider value="dark">
 *   {rx(useTheme().theme)}
 * </ThemeProvider>
 * ```
 *
 * @example Complex context with multiple signals and methods
 * ```tsx
 * interface UserStore {
 *   user: Signal<User | null>;
 *   posts: Signal<Post[]>;
 *   login: (credentials: Credentials) => Promise<void>;
 *   logout: () => void;
 * }
 *
 * const [useUserStore, UserStoreProvider] = provider<UserStore, User | null>({
 *   name: "UserStore",
 *   create: (initialUser) => {
 *     const user = signal(initialUser);
 *     const posts = signal<Post[]>([]);
 *
 *     const login = async (credentials: Credentials) => {
 *       const userData = await api.login(credentials);
 *       user.set(userData);
 *     };
 *
 *     const logout = () => {
 *       user.set(null);
 *       posts.set([]);
 *     };
 *
 *     return disposable({ user, posts, login, logout });
 *   },
 *   update: (context, value) => {
 *     context.user.set(value);
 *   }
 * });
 * ```
 */
export function provider<TContext, TValue>(
  options: ProviderOptions<TContext, TValue>
): ProviderResult<TContext, TValue> {
  // Create the React Context with null as the default value
  // This allows us to detect when the provider is missing
  const context = createContext<TContext | null>(null);

  return [
    // Hook to access the context value
    () => {
      const value = useContext(context);

      // Throw a clear error if used outside the provider
      if (!value) {
        throw new Error(
          `${options.name} context not found. Make sure you're using the component within <${options.name}Provider>.`
        );
      }

      return value as TContext extends Signal<any>
        ? TContext
        : Omit<TContext, "dispose">;
    },

    // Provider component
    (props: PropsWithChildren<{ value: TValue }>) => {
      // Create the context scope using useScope
      // This ensures proper lifecycle management and cleanup
      const scope = useScope(() => {
        // Call the create function with the initial value
        return options.create(props.value);
      }) as TContext;

      // Update the context when props.value changes
      // Using useEffect ensures this happens synchronously before paint
      useEffect(() => {
        if (options.update) {
          options.update(scope, props.value);
        }
        // auto update if the scope is a mutable signal
        else if (is(scope, "mutable")) {
          scope.set(props.value);
        }
      }, [props.value, context]);

      return (
        <context.Provider value={scope as TContext}>
          {props.children}
        </context.Provider>
      );
    },
  ] as const;
}
