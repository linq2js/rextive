export function Logo() {
  return (
    <a href="/" className="flex items-center gap-2 group">
      <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-sage-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:shadow-brand-500/40 transition-shadow">
        <svg
          className="w-5 h-5 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      </div>
      <span className="font-bold text-xl text-warm-900 dark:text-warm-100 hidden sm:block">
        <span className="dark:text-warm-100">Shop</span>
      </span>
    </a>
  );
}

