import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineShoppingCart, HiMicrophone } from 'react-icons/hi2';
import ProductGrid from '../components/billing/ProductGrid';
import Cart from '../components/billing/Cart';
import PaymentModal from '../components/billing/PaymentModal';
import VoiceBillingModal from '../components/billing/VoiceBillingModal';
import { useActiveProducts, useCategories } from '../hooks/useProducts';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useShopSettings } from '../hooks/useShopSettings';
import { formatCurrency, calculateBillTotals } from '../utils/billing';

export default function Billing() {
  const { products, isLoading } = useActiveProducts();
  const categories = useCategories();
  const addItem = useCartStore((s) => s.addItem);
  const addItemWithQty = useCartStore((s) => s.addItemWithQty);
  const items = useCartStore((s) => s.items);
  const discount = useCartStore((s) => s.discount);
  const user = useAuthStore((s) => s.user);
  const { settings } = useShopSettings();

  const [checkoutTotals, setCheckoutTotals] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [todaysSales] = useState(0); // wired up fully once Reports' daily-sales query lands

  const cartTotal = calculateBillTotals(items, discount).grandTotal;
  const itemCount = items.reduce((sum, i) => sum + i.qty, 0);

  const handleAddToCart = (product) => {
    addItem(product);
    toast.success(`${product.name} added`, { duration: 700 });
  };

  const handleAddVoiceItems = (voiceResults) => {
    voiceResults.forEach(({ product, qty }) => addItemWithQty(product, qty));
  };

  const handleCheckout = (totals) => {
    setIsCartOpen(false);
    setCheckoutTotals(totals);
  };

  useEffect(() => {
    document.body.style.overflow = isCartOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isCartOpen]);

  return (
    // 100dvh (not vh) so the layout doesn't jump when a mobile browser's
    // address bar shows/hides mid-scroll. 5rem = bottom nav height.
    <div className="flex h-[calc(100dvh-5rem)] flex-col md:flex-row">
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-2 border-b border-brand-100 bg-white px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-2">
            {settings.logoUrl && (
              <img src={settings.logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
            )}
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold text-brand-700 sm:text-base">
                {settings.shopName}
              </p>
              <p className="truncate text-[11px] text-gray-400 sm:text-xs">
                {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} ·{' '}
                {user?.name || user?.email}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] text-gray-400 sm:text-xs">Today's Sales</p>
            <p className="font-display text-sm font-semibold text-brand-600 sm:text-base">
              {formatCurrency(todaysSales)}
            </p>
          </div>
        </header>

        <ProductGrid
          products={products}
          categories={categories}
          isLoading={isLoading}
          onAddToCart={handleAddToCart}
        />

        {/* Voice billing mic — footer of the home/Billing screen. Nudged up on
            mobile when the floating cart summary bar is showing so they don't overlap. */}
        <button
          onClick={() => setIsVoiceOpen(true)}
          aria-label="Voice billing"
          className={`absolute right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-card transition active:scale-95 ${
            items.length > 0 ? 'bottom-24 md:bottom-4' : 'bottom-4'
          }`}
        >
          <HiMicrophone className="h-7 w-7" />
        </button>
      </div>

      {/* Desktop / tablet: cart stays visible as a side panel */}
      <div className="hidden border-l border-brand-100 md:block md:w-[380px]">
        <Cart onCheckout={handleCheckout} />
      </div>

      {/* Mobile: floating summary bar opens the cart as a full-screen drawer */}
      {items.length > 0 && !isCartOpen && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="animate-slide-up fixed inset-x-3 z-30 flex items-center justify-between rounded-card bg-brand-500 px-4 py-3.5 text-white shadow-card md:hidden"
          style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom) + 0.75rem)' }}
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <HiOutlineShoppingCart className="h-5 w-5" />
            {itemCount} item{itemCount > 1 ? 's' : ''}
          </span>
          <span className="font-display text-base font-bold">View Cart · {formatCurrency(cartTotal)}</span>
        </button>
      )}

      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white md:hidden">
          <Cart onCheckout={handleCheckout} onClose={() => setIsCartOpen(false)} />
        </div>
      )}

      <PaymentModal
        isOpen={!!checkoutTotals}
        onClose={() => setCheckoutTotals(null)}
        totals={checkoutTotals || {}}
      />

      <VoiceBillingModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        products={products}
        onAddItems={handleAddVoiceItems}
      />
    </div>
  );
}
