import { Header } from './components/Layout/Header'
import { ProductGrid } from './components/Products/ProductGrid'
import { CartDrawer } from './components/Cart/CartDrawer'
import { LoginModal } from './components/Auth/LoginModal'
import { CheckoutModal } from './components/Checkout/CheckoutModal'

export function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      {/* Main content with top padding for fixed header */}
      <main className="flex-1 pt-28 md:pt-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-sage-50 py-16 sm:py-24">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNjZjdmNWIiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
                <span className="block text-warm-900">Discover</span>
                <span className="block text-gradient mt-1">Curated Excellence</span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-warm-600 max-w-2xl mx-auto">
                Explore our handpicked collection of premium products. 
                Quality meets style in every item.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                <a href="#products" className="btn-primary text-lg px-8 py-3">
                  Shop Now
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
                <a href="#products" className="btn-secondary text-lg px-8 py-3">
                  View Categories
                </a>
              </div>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute top-10 left-10 w-72 h-72 bg-brand-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse-soft" />
          <div className="absolute bottom-10 right-10 w-72 h-72 bg-sage-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse-soft" style={{ animationDelay: '1s' }} />
        </section>

        {/* Products Section */}
        <section id="products" className="py-16 sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-warm-900">
                Featured Products
              </h2>
              <p className="mt-4 text-warm-600 max-w-xl mx-auto">
                Discover our latest arrivals and bestsellers
              </p>
            </div>
            
            <ProductGrid />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-warm-900 text-warm-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-sage-500 rounded-lg" />
                <span className="font-bold text-white text-xl">Rextive Shop</span>
              </div>
              <p className="text-warm-400 max-w-md">
                A showcase ecommerce application built with Rextive's reactive state management. 
                Demonstrating signals, async patterns, and modern React patterns.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Quick Links</h4>
              <ul className="space-y-2 text-warm-400">
                <li><a href="#" className="hover:text-white transition-colors">Products</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Categories</a></li>
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Powered By</h4>
              <ul className="space-y-2 text-warm-400">
                <li><a href="https://dummyjson.com" target="_blank" rel="noopener" className="hover:text-white transition-colors">DummyJSON API</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Rextive</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Tailwind CSS</a></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-warm-800 text-center text-warm-500 text-sm">
            <p>Built with ❤️ using Rextive signals</p>
          </div>
        </div>
      </footer>

      {/* Cart Drawer */}
      <CartDrawer />

      {/* Login Modal */}
      <LoginModal />

      {/* Checkout Modal */}
      <CheckoutModal />
    </div>
  )
}
