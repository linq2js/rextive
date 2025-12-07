import { logic, signal } from "rextive";
import { productsLogic } from "./productsLogic";
import { routerLogic } from "./routerLogic";

export const searchBarLogic = logic("searchBarLogic", () => {
  const input = signal("", { name: "searchBar.input" });
  const $products = productsLogic();
  const $router = routerLogic();

  const scrollToProducts = () => {
    // Small delay to allow navigation to complete if needed
    requestAnimationFrame(() => {
      const productsSection = document.getElementById("products");
      if (productsSection) {
        productsSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  return {
    input,
    clear() {
      input.set("");
      $products.setSearch("");
    },
    search(value: string) {
      const wasEmpty = input() === "";
      input.set(value);
      $products.setSearch(value);

      // When user starts typing (from empty), navigate to home and scroll to products
      if (wasEmpty && value.length > 0) {
        const currentRoute = $router.route();
        if (currentRoute.page !== "home") {
          // Navigate to home page first, then scroll
          $router.goHome();
          // Wait for navigation to complete before scrolling
          setTimeout(scrollToProducts, 100);
        } else {
          // Already on home page, just scroll
          scrollToProducts();
        }
      }
    },
  };
});

