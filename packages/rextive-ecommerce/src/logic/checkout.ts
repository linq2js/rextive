import { signal, logic } from "rextive";
import { cartLogic } from "./cart";
import { authLogic } from "./auth";

export type ShippingInfo = {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
};

export type PaymentMethod = "card" | "paypal" | "cod";

export type CheckoutStep = "shipping" | "payment" | "review" | "complete";

export type OrderSummary = {
  orderId: string;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shippingInfo: ShippingInfo;
  paymentMethod: PaymentMethod;
};

const SHIPPING_COST = 9.99;
const TAX_RATE = 0.08;

/**
 * Checkout logic - manages checkout flow state.
 */
export const checkoutLogic = logic("checkout", () => {
  // Page state
  const isOpen = signal(false, { name: "checkout.isOpen" });
  const currentStep = signal<CheckoutStep>("shipping", {
    name: "checkout.currentStep",
  });
  const isProcessing = signal(false, { name: "checkout.isProcessing" });

  // Form data
  const shippingInfo = signal<ShippingInfo>(
    {
      firstName: "",
      lastName: "",
      email: "",
      address: "",
      city: "",
      postalCode: "",
      country: "United States",
    },
    { name: "checkout.shippingInfo", equals: "shallow" }
  );

  const paymentMethod = signal<PaymentMethod>("card", {
    name: "checkout.paymentMethod",
  });

  // Order result
  const orderSummary = signal<OrderSummary | null>(null, {
    name: "checkout.orderSummary",
  });

  // Computed values
  const cart = cartLogic();

  const shipping = signal(SHIPPING_COST, { name: "checkout.shipping" });

  const tax = cart.subtotal.to((subtotal) => subtotal * TAX_RATE, {
    name: "checkout.tax",
  });

  const total = signal(
    { subtotal: cart.subtotal, shipping, tax },
    ({ deps }) => deps.subtotal + deps.shipping + deps.tax,
    { name: "checkout.total" }
  );

  // Validation
  const isShippingValid = shippingInfo.to(
    (info) =>
      info.firstName.trim() !== "" &&
      info.lastName.trim() !== "" &&
      info.email.trim() !== "" &&
      info.email.includes("@") &&
      info.address.trim() !== "" &&
      info.city.trim() !== "" &&
      info.postalCode.trim() !== "",
    { name: "checkout.isShippingValid" }
  );

  // Actions
  const open = () => {
    // Pre-fill email if user is logged in
    const auth = authLogic();
    const user = auth.user();
    if (user) {
      shippingInfo.set((prev) => ({
        ...prev,
        firstName: user.firstName || prev.firstName,
        lastName: user.lastName || prev.lastName,
        email: user.email || prev.email,
      }));
    }

    isOpen.set(true);
    currentStep.set("shipping");
    orderSummary.set(null);
  };

  const close = () => {
    isOpen.set(false);
  };

  const updateShippingInfo = (updates: Partial<ShippingInfo>) => {
    shippingInfo.set((prev) => ({ ...prev, ...updates }));
  };

  const setPaymentMethod = (method: PaymentMethod) => {
    paymentMethod.set(method);
  };

  const goToStep = (step: CheckoutStep) => {
    currentStep.set(step);
  };

  const nextStep = () => {
    const step = currentStep();
    if (step === "shipping" && isShippingValid()) {
      currentStep.set("payment");
    } else if (step === "payment") {
      currentStep.set("review");
    }
  };

  const prevStep = () => {
    const step = currentStep();
    if (step === "payment") {
      currentStep.set("shipping");
    } else if (step === "review") {
      currentStep.set("payment");
    }
  };

  const placeOrder = async () => {
    isProcessing.set(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const cartItems = cart.items();
    const summary: OrderSummary = {
      orderId: `ORD-${Date.now().toString(36).toUpperCase()}`,
      items: cartItems.map((item) => ({
        name: item.product.title,
        quantity: item.quantity,
        price:
          item.product.price * (1 - item.product.discountPercentage / 100),
      })),
      subtotal: cart.subtotal(),
      shipping: shipping(),
      tax: tax(),
      total: total(),
      shippingInfo: shippingInfo(),
      paymentMethod: paymentMethod(),
    };

    orderSummary.set(summary);
    cart.clearCart();
    currentStep.set("complete");
    isProcessing.set(false);
  };

  const reset = () => {
    currentStep.set("shipping");
    shippingInfo.set({
      firstName: "",
      lastName: "",
      email: "",
      address: "",
      city: "",
      postalCode: "",
      country: "United States",
    });
    paymentMethod.set("card");
    orderSummary.set(null);
    isProcessing.set(false);
  };

  return {
    // State
    isOpen,
    currentStep,
    isProcessing,
    shippingInfo,
    paymentMethod,
    orderSummary,

    // Computed
    shipping,
    tax,
    total,
    isShippingValid,

    // Actions
    open,
    close,
    updateShippingInfo,
    setPaymentMethod,
    goToStep,
    nextStep,
    prevStep,
    placeOrder,
    reset,
  };
});

