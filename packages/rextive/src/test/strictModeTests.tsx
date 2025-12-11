import React from "react";
import { PropsWithChildren, StrictMode } from "react";
import { render, renderHook } from "@testing-library/react";

const DefaultWrapper = ({
  children,
}: PropsWithChildren<{ children: React.ReactNode }>) => <>{children}</>;

export const wrappers: {
  mode: "normal" | "strict";
  Wrapper: React.FC<{ children: React.ReactNode }>;
  render: (ui: React.ReactElement) => ReturnType<typeof render>;
  renderHook: typeof renderHook;
}[] = [
  {
    mode: "normal" as const,
    Wrapper: DefaultWrapper,
    render: (ui: React.ReactElement) => {
      return render(ui, { wrapper: DefaultWrapper });
    },
    renderHook,
  },
  {
    mode: "strict" as const,
    Wrapper: ({
      children,
    }: PropsWithChildren<{ children: React.ReactNode }>) => (
      <StrictMode>{children}</StrictMode>
    ),
    render: (ui: React.ReactElement) => {
      return render(ui, { wrapper: StrictMode });
    },
    renderHook(...args: any[]): any {
      return renderHook(args[0], { ...args[1], wrapper: StrictMode });
    },
  },
] as const;
