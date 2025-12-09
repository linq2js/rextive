import { signal, logic } from "rextive";
import { patch } from "rextive/helpers";
import { authLogic } from "../authLogic";
import { DEFAULT_SHIPPING_INFO, type ShippingInfo } from "./types";

/**
 * Shipping step logic - manages shipping address form.
 */
export const shippingLogic = logic("checkout.shippingLogic", () => {
  // Get dependencies at factory level (not inside actions!)
  const $auth = authLogic();

  // Form data
  /** Shipping address form data (firstName, lastName, email, address, etc.) */
  const info = signal<ShippingInfo>(DEFAULT_SHIPPING_INFO, {
    name: "shipping.info",
    equals: "shallow",
  });

  // Validation
  /** Whether all required shipping fields are filled and valid */
  const isValid = info.to(
    (info) =>
      info.firstName.trim() !== "" &&
      info.lastName.trim() !== "" &&
      info.email.trim() !== "" &&
      info.email.includes("@") &&
      info.address.trim() !== "" &&
      info.city.trim() !== "" &&
      info.postalCode.trim() !== "",
    { name: "shipping.isValid" }
  );

  // Actions
  /** Update shipping info with partial data */
  const update = (updates: Partial<ShippingInfo>) => {
    info.set(patch<ShippingInfo>(updates));
  };

  /** Pre-fill shipping form from logged-in user profile */
  const prefillFromUser = () => {
    const user = $auth.user();
    if (user) {
      info.set(
        patch<ShippingInfo>({
          firstName: user.firstName || info().firstName,
          lastName: user.lastName || info().lastName,
          email: user.email || info().email,
        })
      );
    }
  };

  /** Reset shipping form to defaults */
  const reset = () => {
    info.set(DEFAULT_SHIPPING_INFO);
  };

  return {
    // ═══════════════════════════════════════════════════════════════════════════
    // SIGNALS (for UI reactivity and computed signals)
    // ═══════════════════════════════════════════════════════════════════════════

    /** Shipping address form data (firstName, lastName, email, address, etc.) */
    info,
    /** Whether all required shipping fields are filled and valid */
    isValid,

    // ═══════════════════════════════════════════════════════════════════════════
    // ACTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /** Update shipping info with partial data */
    update,
    /** Pre-fill shipping form from logged-in user profile */
    prefillFromUser,
    /** Reset shipping form to defaults */
    reset,
  };
});
