import { rx } from "rextive/react";
import { checkoutLogic } from "@/logic/checkout";

export function ShippingForm() {
  const { shippingInfo, updateShippingInfo, nextStep, isShippingValid } =
    checkoutLogic();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isShippingValid()) {
      nextStep();
    }
  };

  return rx(() => {
    const info = shippingInfo();
    const isValid = isShippingValid();

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-lg font-semibold text-warm-900 mb-4">
          Shipping Information
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-warm-700 mb-1">
              First Name
            </label>
            <input
              type="text"
              value={info.firstName}
              onChange={(e) => updateShippingInfo({ firstName: e.target.value })}
              className="input w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-warm-700 mb-1">
              Last Name
            </label>
            <input
              type="text"
              value={info.lastName}
              onChange={(e) => updateShippingInfo({ lastName: e.target.value })}
              className="input w-full"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-warm-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={info.email}
            onChange={(e) => updateShippingInfo({ email: e.target.value })}
            className="input w-full"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-warm-700 mb-1">
            Address
          </label>
          <input
            type="text"
            value={info.address}
            onChange={(e) => updateShippingInfo({ address: e.target.value })}
            className="input w-full"
            placeholder="Street address"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-warm-700 mb-1">
              City
            </label>
            <input
              type="text"
              value={info.city}
              onChange={(e) => updateShippingInfo({ city: e.target.value })}
              className="input w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-warm-700 mb-1">
              Postal Code
            </label>
            <input
              type="text"
              value={info.postalCode}
              onChange={(e) => updateShippingInfo({ postalCode: e.target.value })}
              className="input w-full"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-warm-700 mb-1">
            Country
          </label>
          <select
            value={info.country}
            onChange={(e) => updateShippingInfo({ country: e.target.value })}
            className="input w-full"
          >
            <option>United States</option>
            <option>Canada</option>
            <option>United Kingdom</option>
            <option>Australia</option>
            <option>Germany</option>
            <option>France</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={!isValid}
          className="btn-primary w-full py-3 mt-6 disabled:opacity-50"
        >
          Continue to Payment
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
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </form>
    );
  });
}

