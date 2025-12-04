import { rx } from "rextive/react";
import { cartLogic } from "@/logic/cart";
import { CartHeader } from "./CartHeader";
import { CartItemsList } from "./CartItemsList";
import { CartFooter } from "./CartFooter";

export function CartDrawer() {
  const { drawerOpen, closeDrawer } = cartLogic();

  return rx(() => {
    const isOpen = drawerOpen();

    return (
      <>
        {/* Backdrop */}
        <div
          className={`fixed inset-0 bg-warm-900/50 backdrop-blur-sm z-50 transition-opacity duration-300 ${
            isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          onClick={() => closeDrawer()}
          aria-hidden="true"
        />

        {/* Drawer */}
        <aside
          className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
          aria-label="Shopping cart"
        >
          <div className="flex flex-col h-full">
            <CartHeader />
            <CartItemsList />
            <CartFooter />
          </div>
        </aside>
      </>
    );
  });
}
