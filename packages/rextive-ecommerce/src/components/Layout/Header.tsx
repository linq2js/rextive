import { Logo } from "./Logo";
import { SearchBar } from "./SearchBar";
import { UserMenu } from "./UserMenu";
import { CartButton } from "./CartButton";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 glass border-b border-warm-200/50 dark:bg-warm-900/90 dark:border-warm-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Logo />

          {/* Desktop Search */}
          <div className="flex-1 max-w-lg mx-8 hidden md:block">
            <SearchBar />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
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
