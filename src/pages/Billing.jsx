import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { HiOutlineShoppingCart, HiMicrophone } from 'react-icons/hi2';
import ProductGrid from '../components/billing/ProductGrid';
import Cart from '../components/billing/Cart';
import PaymentModal from '../components/billing/PaymentModal';
import VoiceBillingModal from '../components/billing/VoiceBillingModal';
import HeldBillsStrip from '../components/billing/HeldBillsStrip';
import { useActiveProducts, useCategories } from '../hooks/useProducts';
import { useCartStore } from '../store/cartStore';
import { formatCurrency, calculateBillTotals } from '../utils/billing';

export default function Billing() {
  const { t } = useTranslation();
  const { products, isLoading } = useActiveProducts();
  const categories = useCategories();
  const addItem = useCartStore((s) => s.addItem);
  const addItemWithQty = useCartStore((s) => s.addItemWithQty);
  const items = useCartStore((s) => s.items);
  const discount = useCartStore((s) => s.discount);
  const heldBills = useCartStore((s) => s.heldBills);

  const [checkoutTotals, setCheckoutTotals] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  const cartTotal = calculateBillTotals(items, discount).grandTotal;
  const itemCount = items.reduce((sum, i) => sum + i.qty, 0);

  const handleAddToCart = (product) => {
    addItem(product);
    toast.success(t('billing.itemAddedToast', { name: product.name }), { duration: 700 });
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
        {/* No header here on purpose — every pixel of vertical space on this
            screen goes to products and, when in use, the held-bills strip,
            since this is the screen a cashier looks at all day. */}
        {heldBills.length > 0 && (
          <div className="pt-2">
            <HeldBillsStrip />
          </div>
        )}

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
          aria-label={t('voice.title')}
          className={`absolute right-3 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-white shadow-card transition active:scale-95 ${
            items.length > 0 ? 'bottom-20 md:bottom-3' : 'bottom-3'
          }`}
        >
          <HiMicrophone className="h-6 w-6" />
        </button>
      </div>

      {/* Desktop / tablet: cart stays visible as a side panel */}
      <div className="hidden border-l border-brand-100 md:block md:w-[360px]">
        <Cart onCheckout={handleCheckout} />
      </div>

      {/* Mobile: floating summary bar opens the cart as a full-screen drawer */}
      {items.length > 0 && !isCartOpen && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="animate-slide-up fixed inset-x-3 z-30 flex items-center justify-between rounded-card bg-brand-500 px-4 py-3 text-white shadow-card md:hidden"
          style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom) + 0.6rem)' }}
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <HiOutlineShoppingCart className="h-5 w-5" />
            {t('billing.itemCount', { count: itemCount })}
          </span>
          <span className="font-display text-base font-bold">
            {t('billing.viewCart')} · {formatCurrency(cartTotal)}
          </span>
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
