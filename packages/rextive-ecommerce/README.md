# Rextive E-commerce Demo

A modern e-commerce application built with **Rextive** signals, showcasing the power of reactive state management with minimal boilerplate and exceptional developer experience.

🌐 **Live Demo**: [rextive-shop.netlify.app](https://rextive-shop.netlify.app)

![Rextive Shop](https://img.shields.io/badge/Built%20with-Rextive-cf7f5b?style=for-the-badge)
![React](https://img.shields.io/badge/React-18.2-61dafb?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178c6?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06b6d4?style=for-the-badge&logo=tailwindcss)

---

## ✨ Why Rextive?

This demo showcases the key benefits of using Rextive for state management:

### 🎯 **Minimal Boilerplate**

Compare the typical Redux/Zustand setup with Rextive:

```tsx
// Traditional approach: actions, reducers, selectors, dispatchers...
// Rextive approach: just signals and logic

export const cartLogic = logic("cartLogic", () => {
  const items = signal<CartItem[]>([], { name: "cart.items" });
  const itemCount = items.to((i) => i.reduce((sum, x) => sum + x.quantity, 0));
  const subtotal = items.to((i) => calculateSubtotal(i));

  const addItem = (product: Product, qty = 1) => {
    items.set((current) => [...current, { product, quantity: qty }]);
  };

  return { items, itemCount, subtotal, addItem };
});
```

### 🪝 **Almost No React Hooks**

Notice how components use **zero** `useState`, `useEffect`, `useReducer`, or custom hooks for state:

```tsx
// UserMenu.tsx - No useState, no useEffect!
export function UserMenu() {
  const { user, isRestoring, logout, openLoginModal } = authLogic();

  return rx(() => {
    if (isRestoring()) return <LoadingSpinner />;
    const currentUser = user();
    if (currentUser)
      return <UserProfile user={currentUser} onLogout={logout} />;
    return <SignInButton onClick={openLoginModal} />;
  });
}
```

### 🧪 **Built-in Testability**

Logic units are easily testable without mocking React internals:

```tsx
// cartLogic.test.ts
describe("cartLogic", () => {
  beforeEach(() => logic.clear());

  it("should add item to cart", () => {
    setupAuthMock(true); // Mock dependencies with logic.provide()
    const cart = cartLogic.create();

    cart.addItem(mockProduct, 2);

    expect(cart.items()).toHaveLength(1);
    expect(cart.itemCount()).toBe(2);
  });
});
```

### ⚡ **Elegant Async Handling**

No more `useEffect` + `useState` + loading flags:

```tsx
// Async signal with automatic request cancellation
const productsAsync = signal(
  { search, category, page },
  async ({ deps, abortSignal }) => {
    return productsApi.search(deps.search, { signal: abortSignal });
  }
);

// Task wrapper for stale-while-revalidate
const productsTask = productsAsync.pipe(task(initialData));

// In component - stale-while-revalidate: show data + loading/error overlay
return rx(() => {
  const { loading, error, value } = productsTask();
  return (
    <div>
      {loading && <LoadingOverlay />}
      {error && <ErrorToast error={error} />}
      <ProductsList products={value.products} />
    </div>
  );
});
```

---

## 📁 Project Structure

```
src/
├── api/
│   ├── client.ts              # API client functions
│   └── types.ts               # TypeScript types
│
├── logic/                     # 🧠 Business logic layer
│   ├── authLogic.ts           # Authentication & user session
│   ├── cartLogic.ts           # Shopping cart management
│   ├── productsLogic.ts       # Products list, search, pagination
│   ├── productDetailsLogic.ts # Single product details
│   ├── alertLogic.ts          # Global alerts/notifications
│   ├── routerLogic.ts         # Simple client-side routing
│   ├── themeLogic.ts          # Dark/light mode
│   ├── persistLogic.ts        # LocalStorage persistence
│   └── checkout/              # Multi-step checkout flow
│       ├── checkoutLogic.ts   # Flow coordinator
│       ├── shippingLogic.ts   # Shipping form state
│       ├── paymentLogic.ts    # Payment selection
│       ├── orderLogic.ts      # Order totals & placement
│       └── types.ts           # Checkout types
│
├── components/                # 🎨 UI components (minimal logic)
│   ├── Layout/                # Header, SearchBar, ThemeToggle, UserMenu
│   ├── Products/              # ProductGrid, ProductCard, ProductDetails
│   ├── Cart/                  # CartDrawer, CartItem, CartSummary
│   ├── Checkout/              # CheckoutModal, ShippingForm, PaymentForm
│   ├── Auth/                  # LoginModal
│   └── Common/                # AlertModal
│
├── test/                      # Test utilities
│   ├── setup.ts               # Vitest setup
│   └── utils.tsx              # Test helpers
│
└── App.tsx                    # Main app with routing
```

---

## 🏗️ Architecture Highlights

### Logic Layer Pattern

All business logic is encapsulated in `logic()` units, separate from UI:

```
┌─────────────────────────────────────────────────────────────┐
│                      React Components                        │
│  (Pure UI - just render signals and call actions)           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Logic Layer                             │
│  authLogic ─── cartLogic ─── productsLogic ─── checkoutLogic│
│      │              │              │                │        │
│      └──────────────┴──────────────┴────────────────┘        │
│                    (Shared singletons)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API / Services                          │
│  (DummyJSON API - products, auth, etc.)                     │
└─────────────────────────────────────────────────────────────┘
```

### Logic Unit Structure

Every logic follows a consistent pattern:

```tsx
export const someLogic = logic("someLogic", () => {
  // 1. DEPENDENCIES - Get other logics at factory level
  const $auth = authLogic();
  const $cart = cartLogic();

  // 2. STATE - Signals for reactive data
  const items = signal([], { name: "some.items" });
  const filter = signal("all", { name: "some.filter" });

  // 3. COMPUTED - Derived values
  const filtered = items.to((list) => list.filter(/* ... */));
  const count = items.to((list) => list.length);

  // 4. SIDE EFFECTS - Reactive effects using computed signals
  signal({ user: $auth.user }, ({ deps }) => {
    if (!deps.user) items.reset();
  });

  // 5. ACTIONS - Methods to mutate state
  const addItem = (item) => items.set((prev) => [...prev, item]);
  const setFilter = (f) => filter.set(f);

  // 6. RETURN - Public API
  return {
    items,
    filter,
    filtered,
    count,
    addItem,
    setFilter,
  };
});
```

### Consumer Convention: `$` Prefix

When consuming logic instances, use `$` prefix to distinguish from local variables:

```tsx
function Component() {
  const $auth = authLogic(); // Logic instance
  const $cart = cartLogic(); // Logic instance

  return rx(() => {
    const user = $auth.user(); // Reading signal value
    const count = $cart.itemCount();
    // ...
  });
}
```

---

## 🔑 Key Features Demonstrated

### 1. **Reactive UI with `rx()`**

The `rx()` function creates reactive boundaries that auto-update when signals change:

```tsx
// CartDrawer.tsx
export function CartDrawer() {
  const { drawerOpen, closeDrawer, itemCount } = cartLogic();

  return rx(() => {
    // reactive
    const open = drawerOpen();
    const count = itemCount();

    return (
      <aside className={open ? "translate-x-0" : "translate-x-full"}>
        {count === 0 ? <CartEmpty /> : <CartItemsList />}
      </aside>
    );
  });
}
```

### 2. **Async Actions with `signal.action()`**

Handle mutations with loading/error states automatically:

```tsx
const loginAction = signal.action(
  async (ctx: ActionContext<Credentials>) => {
    const userData = await authApi.login(ctx.payload);
    signal.batch(() => {
      user.set(userData);
      token.set(userData.accessToken);
    });
    return userData;
  },
  { name: "auth.login" }
);

// In component - access loading/error via task.from()
const state = task.from(loginResult());
if (state.loading) return <Spinner />;
if (state.error) return <ErrorMessage error={state.error} />;
```

### 3. **Automatic Request Cancellation**

When dependencies change, previous requests are automatically cancelled:

```tsx
const productsAsync = signal(
  { search, category, page },
  async ({ deps, abortSignal }) => {
    // abortSignal is automatically triggered when deps change
    return productsApi.search(deps.search, { signal: abortSignal });
  }
);
```

### 4. **Stale-While-Revalidate with `task()` Operator**

Show previous data while loading new data:

```tsx
const productsTask = productsAsync.pipe(
  task({
    products: [],
    total: 0,
  })
);

// In UI - value is ALWAYS defined
const { loading, error, value } = productsTask();
// Show loading indicator but keep displaying previous products
if (loading && value.products.length > 0) {
  return <ProductsList products={value.products} showLoading />;
}
```

### 5. **Computed Values with `.to()`**

Transform signals with zero boilerplate:

```tsx
const itemCount = items.to((i) => i.reduce((sum, x) => sum + x.quantity, 0));
const subtotal = items.to((i) => calculateSubtotal(i));
const totalDiscount = items.to((i) => calculateDiscount(i));
```

### 6. **Multi-Signal Dependencies**

Combine multiple signals for complex computations:

```tsx
const total = signal(
  { subtotal: $cart.subtotal, shippingCost, tax },
  ({ deps }) => deps.subtotal + deps.shippingCost + deps.tax,
  { name: "order.total" }
);
```

### 7. **Batched Updates**

Group multiple updates into a single notification:

```tsx
const setCategory = (value: string | null) => {
  signal.batch(() => {
    category.set(value);
    search.set(""); // Clear search when selecting category
    page.set(1);
  });
};
```

### 8. **Persistence with Plugins**

Auto-persist state to localStorage:

```tsx
const persist = persistor<{ items: CartItem[] }>({
  load: () => JSON.parse(localStorage.getItem("cart") || "{}"),
  save: ({ values }) => localStorage.setItem("cart", JSON.stringify(values)),
});

const items = signal<CartItem[]>([], {
  use: [persist("items")], // Auto-loads and auto-saves
});
```

### 9. **Cross-Logic Communication**

Logics can depend on and react to each other:

```tsx
export const cartLogic = logic("cartLogic", () => {
  const $auth = authLogic(); // Get auth logic instance

  const requireAuth = (): boolean => {
    if ($auth.isAuthenticated()) return true;
    $auth.openLoginModal(); // Trigger login modal from cart
    return false;
  };

  const addItem = (product: Product) => {
    if (!requireAuth()) return false;
    // ... add item logic
  };
});
```

### 10. **Scoped Component State with `useScope()`**

Create component-scoped signals that auto-dispose on unmount:

```tsx
export function LoginModal() {
  // Signals are auto-disposed when LoginModal unmounts
  const scope = useScope(() =>
    disposable({
      username: signal("", { name: "loginModal.username" }),
      password: signal("", { name: "loginModal.password" }),
    })
  );

  return rx(() => (
    <input
      value={scope.username()}
      onChange={(e) => scope.username.set(e.target.value)}
    />
  ));
}
```

---

## 📊 Comparison with Traditional Approaches

### Lines of Code Comparison

| Feature         | Redux + RTK Query | Zustand | Rextive |
| --------------- | ----------------- | ------- | ------- |
| Auth Logic      | ~150 lines        | ~80     | ~60     |
| Cart Logic      | ~200 lines        | ~100    | ~80     |
| Products Logic  | ~180 lines        | ~90     | ~70     |
| Component Hooks | Many              | Few     | None\*  |

\*Rextive uses `rx()` for reactivity, not hooks.

### Key Differences

| Aspect               | Traditional                    | Rextive           |
| -------------------- | ------------------------------ | ----------------- |
| State definition     | Actions + Reducers + Selectors | Just `signal()`   |
| Derived state        | `useMemo` / selectors          | `.to()` transform |
| Async handling       | RTK Query / useEffect          | Async signals     |
| Request cancellation | Manual AbortController         | Automatic         |
| Loading states       | Multiple flags                 | `task.from()`     |
| Testing              | Mock React hooks               | `logic.create()`  |

---

## 🧪 Testing Strategy

### Unit Testing Logic

```tsx
describe("authLogic", () => {
  beforeEach(() => logic.clear());

  it("should login successfully", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => mockUser });

    const auth = authLogic.create(); // Create isolated instance
    await auth.login({ username: "test", password: "pass" });

    expect(auth.user()).toEqual(mockUser);
    expect(auth.isAuthenticated()).toBe(true);
  });
});
```

### Mocking Dependencies

```tsx
// Mock authLogic for cartLogic tests
const setupAuthMock = (isAuthenticated = true) => {
  logic.provide(authLogic, () => ({
    user: signal(isAuthenticated ? mockUser : null),
    isAuthenticated: signal(isAuthenticated).to((v) => v),
    openLoginModal: vi.fn(),
  }));
};
```

### Component Testing

```tsx
import { mockLogic } from "rextive/test";

describe("CartDrawer", () => {
  const $cart = mockLogic(cartLogic);

  beforeEach(() => {
    $cart.default({
      items: signal([]),
      itemCount: signal(0).to((v) => v),
      drawerOpen: signal(false),
      closeDrawer: vi.fn(),
    });
  });

  afterEach(() => $cart.clear());

  it("should show empty state", () => {
    $cart.provide({ drawerOpen: signal(true) });
    render(<CartDrawer />);
    expect(screen.getByText(/cart is empty/i)).toBeInTheDocument();
  });
});
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/linq2js/rextive.git
cd rextive/packages/rextive-ecommerce

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Available Scripts

```bash
pnpm dev        # Start dev server
pnpm build      # Build for production
pnpm preview    # Preview production build
pnpm test       # Run tests
pnpm test:watch # Run tests in watch mode
```

### Demo Credentials

The app uses [DummyJSON](https://dummyjson.com) for the backend. Use these credentials to log in:

- **Username**: `emilys`
- **Password**: `emilyspass`

---

## 📚 Learn More

- [Rextive Documentation](https://github.com/linq2js/rextive)
- [Core Concepts](../../docs/CORE_CONCEPTS.md)
- [Logic Pattern](../../docs/LOGIC.md)
- [React Integration](../../docs/REACT.md)
- [Async Handling](../../docs/TASK_USAGE.md)

---

## 🤝 Contributing

Contributions are welcome! This demo serves as a reference implementation for Rextive best practices.

---

## 📄 License

MIT © [linq2js](https://github.com/linq2js)
