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

export const SHIPPING_COST = 9.99;
export const TAX_RATE = 0.08;

export const DEFAULT_SHIPPING_INFO: ShippingInfo = {
  firstName: "",
  lastName: "",
  email: "",
  address: "",
  city: "",
  postalCode: "",
  country: "United States",
};

