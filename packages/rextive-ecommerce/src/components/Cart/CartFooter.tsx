import { memo } from "react";
import { rx } from "rextive/react";
import { cartLogic } from "@/logic/cartLogic";
import { CartSummary } from "./CartSummary";

export const CartFooter = memo(function CartFooter() {
  const { items, subtotal, totalDiscount, clearCart } = cartLogic();

  return rx(() => {
    const cartItems = items();
    if (cartItems.length === 0) return null;

    return (
      <CartSummary
        subtotal={subtotal()}
        discount={totalDiscount()}
        onClear={clearCart}
      />
    );
  });
});
