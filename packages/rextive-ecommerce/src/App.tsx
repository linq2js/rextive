import { rx } from "rextive/react";
import { Header } from "./components/Layout/Header";
import { ProductGrid } from "./components/Products/ProductGrid";
import { ProductDetails } from "./components/Products/ProductDetails";
import { CartDrawer } from "./components/Cart/CartDrawer";
import { LoginModal } from "./components/Auth/LoginModal";
import { CheckoutModal } from "./components/Checkout/CheckoutModal";
import { AlertModal } from "./components/Common/AlertModal";
import { routerLogic } from "./logic/routerLogic";

function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        {/* Light mode gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-sage-50 dark:opacity-0 transition-opacity duration-300" />

        {/* Dark mode gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 opacity-0 dark:opacity-100 transition-opacity duration-300" />

        {/* Pattern overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNjZjdmNWIiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40 dark:opacity-20" />

        {/* Decorative blobs */}
        <div className="absolute top-20 left-10 w-80 h-80 bg-brand-300 dark:bg-brand-600 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-pulse-soft" />
        <div
          className="absolute bottom-20 right-10 w-80 h-80 bg-sage-300 dark:bg-sage-600 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-pulse-soft"
          style={{ animationDelay: "1.5s" }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              <span className="block text-stone-900 dark:text-white">
                Discover
              </span>
              <span className="block text-gradient dark:text-gradient-gold mt-2">
                Curated Excellence
              </span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-stone-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Explore our handpicked collection of premium products. Quality
              meets style in every item.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#products" className="btn-primary text-lg px-8 py-3.5">
                Shop Now
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </a>
              <a href="#products" className="btn-secondary text-lg px-8 py-3.5">
                View Categories
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section
        id="products"
        className="py-16 sm:py-24 bg-stone-50 dark:bg-slate-950"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 dark:text-white">
              Featured Products
            </h2>
            <p className="mt-4 text-stone-600 dark:text-slate-400 max-w-xl mx-auto">
              Discover our latest arrivals and bestsellers
            </p>
          </div>

          <ProductGrid />
        </div>
      </section>
    </>
  );
}

function Router() {
  const $router = routerLogic();

  return rx(() => {
    const route = $router.route();

    switch (route.page) {
      case "product":
        return <ProductDetails />;
      case "home":
      default:
        return <HomePage />;
    }
  });
}

export function App() {
  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-slate-950">
      <Header />

      {/* Main content with top padding for fixed header */}
      <main className="flex-1 pt-28 md:pt-16">
        <Router />
      </main>

      {/* Footer */}
      <footer className="bg-stone-900 dark:bg-slate-900 border-t border-stone-800 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-sage-500 rounded-xl shadow-lg" />
                <span className="font-bold text-white text-xl tracking-tight">
                  Rextive Shop
                </span>
              </div>
              <p className="text-stone-400 max-w-md leading-relaxed">
                A showcase ecommerce application built with Rextive's reactive
                state management. Demonstrating signals, async patterns, and
                modern React patterns.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4 tracking-wide">
                Quick Links
              </h4>
              <ul className="space-y-3 text-stone-400">
                <li>
                  <a
                    href="#"
                    className="hover:text-brand-400 transition-colors"
                  >
                    Products
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-brand-400 transition-colors"
                  >
                    Categories
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-brand-400 transition-colors"
                  >
                    About
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4 tracking-wide">
                Powered By
              </h4>
              <ul className="space-y-3 text-stone-400">
                <li>
                  <a
                    href="https://dummyjson.com"
                    target="_blank"
                    rel="noopener"
                    className="hover:text-brand-400 transition-colors"
                  >
                    DummyJSON API
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-brand-400 transition-colors"
                  >
                    Rextive
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-brand-400 transition-colors"
                  >
                    Tailwind CSS
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-stone-800 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-stone-500 text-sm">
              Built with ❤️ using Rextive signals
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/linq2js/rextive/tree/main/packages/rextive-ecommerce"
                target="_blank"
                className="text-stone-500 hover:text-brand-400 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Cart Drawer */}
      <CartDrawer />

      {/* Login Modal */}
      <LoginModal />

      {/* Checkout Modal */}
      <CheckoutModal />

      {/* Alert Modal */}
      <AlertModal />
    </div>
  );
}
