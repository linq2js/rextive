import { memo } from "react";
import { routerLogic } from "@/logic/routerLogic";

export const Logo = memo(function Logo() {
  const router = routerLogic();

  return (
    <button
      onClick={() => router.goHome()}
      className="flex items-center gap-3 group"
    >
      <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-200" />
      <span className="font-bold text-lg text-stone-900 dark:text-white tracking-tight hidden sm:block">
        Rextive
        <span className="text-brand-600 dark:text-brand-400">Shop</span>
      </span>
    </button>
  );
});
