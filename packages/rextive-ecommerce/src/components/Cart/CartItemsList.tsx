import { rx } from "rextive/react";
import { cartLogic } from "@/logic/cart";
import { CartItem } from "./CartItem";
import { CartEmpty } from "./CartEmpty";

export function CartItemsList() {
  const { items, closeDrawer } = cartLogic();

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      {rx(() => {
        const cartItems = items();

        if (cartItems.length === 0) {
          return <CartEmpty onClose={closeDrawer} />;
        }

        return (
          <div className="space-y-4">
            {cartItems.map((item) => (
              <CartItem key={item.productId} item={item} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
