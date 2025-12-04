import { render, RenderOptions } from "@testing-library/react";
import { ReactElement, ReactNode } from "react";

// Custom render with providers if needed
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  const Wrapper = ({ children }: { children: ReactNode }) => {
    return <>{children}</>;
  };

  return render(ui, { wrapper: Wrapper, ...options });
}

export * from "@testing-library/react";
export { customRender as render };

