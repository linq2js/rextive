import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/utils";
import { ProductsEmpty } from "./ProductsEmpty";

describe("ProductsEmpty", () => {
  it("should display no products message", () => {
    render(<ProductsEmpty />);

    expect(screen.getByText("No products found")).toBeInTheDocument();
    expect(
      screen.getByText("Try adjusting your search or filters")
    ).toBeInTheDocument();
  });
});
