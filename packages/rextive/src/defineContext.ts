import { WithUse } from "./types";

export type InferContext<T> = T extends { create(...args: any[]): infer C }
  ? C
  : never;

export function defineContext<TProps extends object, TArgs extends any[]>(
  create: (...args: TArgs) => TProps
) {
  type Context = TProps & {
    use<TArgs extends any[], TReturn>(
      logic: (context: Context, ...args: TArgs) => TReturn,
      ...args: TArgs
    ): TReturn;
  };

  return {
    create(...args: TArgs): Context {
      const context: Context = create(...args) as Context;

      Object.assign(context, {
        use<TArgs extends any[], TReturn>(
          fn: (context: Context, ...args: TArgs) => TReturn,
          ...args: TArgs
        ) {
          return fn(context, ...args);
        },
      });

      return context;
    },
  };
}

export function addUseMethod<T extends object>(obj: T): WithUse<T> {
  const enhanced = obj as WithUse<T>;
  Object.assign(enhanced, {
    use<TArgs extends any[], TReturn>(
      fn: (context: WithUse<T>, ...args: TArgs) => TReturn,
      ...args: TArgs
    ) {
      return fn(enhanced, ...args);
    },
  });
  return enhanced;
}
