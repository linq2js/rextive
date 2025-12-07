import { Logo } from "./Logo";
import { SearchBar } from "./SearchBar";
import { UserMenu } from "./UserMenu";
import { CartButton } from "./CartButton";
import { ThemeToggle } from "./ThemeToggle";
import { EqualsFn, EqualsStrategy } from "rextive";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Logo />

          {/* Desktop Search */}
          <div className="flex-1 max-w-lg mx-8 hidden md:block">
            <SearchBar />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <UserMenu />
            <CartButton />
          </div>
        </div>

        {/* Mobile Search */}
        <div className="pb-4 md:hidden">
          <SearchBar />
        </div>
      </div>
    </header>
  );
}

export type UseScopeOptions = {
  equals?: EqualsStrategy | EqualsFn<any>;
};

declare function useScope<TArgs extends any[], TScope>(
  key: string,
  factory: (...args: TArgs) => TScope,
  ...extra: TArgs extends []
    ? []
    : [args: TArgs, options?: UseScopeOptions | EqualsStrategy | EqualsFn<any>]
): TScope;
