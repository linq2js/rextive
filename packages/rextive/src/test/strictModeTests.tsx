import React from "react";
import { PropsWithChildren, StrictMode } from "react";
import { render } from "@testing-library/react";

const DefaultWrapper = ({
  children,
}: PropsWithChildren<{ children: React.ReactNode }>) => <>{children}</>;

export const wrappers: {
  mode: "normal" | "strict";
  Wrapper: React.FC<{ children: React.ReactNode }>;
  renderWithWrapper: (ui: React.ReactElement) => ReturnType<typeof render>;
}[] = [
  {
    mode: "normal" as const,
    Wrapper: DefaultWrapper,
    renderWithWrapper: (ui: React.ReactElement) => {
      return render(ui, { wrapper: DefaultWrapper });
    },
  },
  {
    mode: "strict" as const,
    Wrapper: ({
      children,
    }: PropsWithChildren<{ children: React.ReactNode }>) => (
      <StrictMode>{children}</StrictMode>
    ),
    renderWithWrapper: (ui: React.ReactElement) => {
      return render(ui, { wrapper: StrictMode });
    },
  },
] as const;
