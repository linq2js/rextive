import { memo } from "react";
import { rx } from "rextive/react";
import { cartLogic } from "@/logic/cartLogic";
import { CartHeader } from "./CartHeader";
import { CartItemsList } from "./CartItemsList";
import { CartFooter } from "./CartFooter";
import { CartEmpty } from "./CartEmpty";

export const CartDrawer = memo(function CartDrawer() {
  const { drawerOpen, closeDrawer, itemCount } = cartLogic();

  return rx(() => {
    const open = drawerOpen();
    const count = itemCount();

    return (
      <>
        {/* Backdrop */}
        {open && (
          <div
            className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 animate-fade-in"
            onClick={() => closeDrawer()}
          />
        )}

        {/* Drawer */}
        <aside
          className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-out border-l border-stone-200 dark:border-slate-800 ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <CartHeader />

          {count === 0 ? (
            <CartEmpty onClose={() => closeDrawer()} />
          ) : (
            <>
              <CartItemsList />
              <CartFooter />
            </>
          )}
        </aside>
      </>
    );
  });
});
