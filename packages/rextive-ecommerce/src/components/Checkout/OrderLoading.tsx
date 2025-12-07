import { memo } from "react";

export const OrderLoading = memo(function OrderLoading() {
  return (
    <div className="text-center py-12">
      {/* Animated Spinner */}
      <div className="w-16 h-16 mx-auto mb-6 relative">
        <div className="absolute inset-0 border-4 border-stone-200 dark:border-slate-700 rounded-full" />
        <div className="absolute inset-0 border-4 border-brand-600 rounded-full border-t-transparent animate-spin" />
      </div>

      <h3 className="text-xl font-semibold text-stone-900 dark:text-white mb-2">
        Processing Your Order
      </h3>
      <p className="text-stone-600 dark:text-slate-400">
        Please wait while we confirm your payment...
      </p>

      {/* Animated dots */}
      <div className="flex justify-center gap-1 mt-4">
        <span className="w-2 h-2 bg-brand-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-2 h-2 bg-brand-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-2 h-2 bg-brand-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
});
