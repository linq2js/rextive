import { signal, logic } from "rextive";

export type Route =
  | { page: "home" }
  | { page: "product"; id: number };

/**
 * Simple hash-based router using signals.
 * Routes:
 * - #/ or empty -> home
 * - #/product/123 -> product details
 */
export const routerLogic = logic("routerLogic", () => {
  // Parse current hash into route
  const parseHash = (hash: string): Route => {
    const path = hash.replace(/^#\/?/, "");
    
    // Product detail: /product/123
    const productMatch = path.match(/^product\/(\d+)$/);
    if (productMatch) {
      return { page: "product", id: parseInt(productMatch[1], 10) };
    }
    
    // Default: home
    return { page: "home" };
  };

  // Current route signal
  const route = signal<Route>(parseHash(window.location.hash), {
    name: "router.route",
  });

  // Listen to hash changes
  const handleHashChange = () => {
    route.set(parseHash(window.location.hash));
  };
  window.addEventListener("hashchange", handleHashChange);

  // Navigation helpers
  const navigate = (newRoute: Route) => {
    let hash = "#/";
    if (newRoute.page === "product") {
      hash = `#/product/${newRoute.id}`;
    }
    window.location.hash = hash;
  };

  const goHome = () => navigate({ page: "home" });
  
  const goToProduct = (id: number) => navigate({ page: "product", id });

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      goHome();
    }
  };

  return {
    /** Current route */
    route,
    /** Navigate to a route */
    navigate,
    /** Go to home page */
    goHome,
    /** Go to product details page */
    goToProduct,
    /** Go back in history */
    goBack,
  };
});

