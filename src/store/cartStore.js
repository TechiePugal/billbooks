import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const emptyCustomer = { name: '', phone: '' };

/**
 * Persisted to localStorage so a dropped connection, a refresh, or an
 * accidental tab-close never loses an in-progress bill — critical for a
 * device sitting on a counter being used all day by a cashier.
 */
export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [], // { productId, name, price, qty, gstRate }
      discount: { type: 'flat', value: 0 }, // type: 'flat' | 'percent'
      customer: emptyCustomer,
      heldBills: [], // [{ id, items, discount, customer, heldAt }]

      addItem: (product) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === product.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === product.id ? { ...i, qty: i.qty + 1 } : i
              )
            };
          }
          return {
            items: [
              ...state.items,
              {
                productId: product.id,
                name: product.name,
                price: product.sellingPrice,
                // Cost price at the moment of sale — captured here (not looked
                // up later from the live catalog) so a profit report stays
                // accurate even after the product's cost price changes.
                purchasePrice: product.purchasePrice ?? 0,
                gstRate: product.gstRate ?? 0,
                qty: 1
              }
            ]
          };
        }),

      // Used by voice billing: adds a spoken quantity in one shot ("idli 2" → qty 2)
      // instead of calling addItem() in a loop, which would fire a re-render per unit.
      addItemWithQty: (product, qty) =>
        set((state) => {
          const safeQty = Math.max(1, Math.round(qty) || 1);
          const existing = state.items.find((i) => i.productId === product.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === product.id ? { ...i, qty: i.qty + safeQty } : i
              )
            };
          }
          return {
            items: [
              ...state.items,
              {
                productId: product.id,
                name: product.name,
                price: product.sellingPrice,
                purchasePrice: product.purchasePrice ?? 0,
                gstRate: product.gstRate ?? 0,
                qty: safeQty
              }
            ]
          };
        }),

      increaseQty: (productId) =>
        set((state) => ({
          items: state.items.map((i) => (i.productId === productId ? { ...i, qty: i.qty + 1 } : i))
        })),

      decreaseQty: (productId) =>
        set((state) => ({
          items: state.items
            .map((i) => (i.productId === productId ? { ...i, qty: i.qty - 1 } : i))
            .filter((i) => i.qty > 0)
        })),

      setQty: (productId, qty) =>
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) => (i.productId === productId ? { ...i, qty } : i))
        })),

      removeItem: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),

      setDiscount: (discount) => set({ discount }),

      setCustomer: (customer) => set({ customer }),

      clearCart: () => set({ items: [], discount: { type: 'flat', value: 0 }, customer: emptyCustomer }),

      holdCurrentBill: (label) =>
        set((state) => ({
          heldBills: [
            ...state.heldBills,
            {
              id: `hold_${Date.now()}`,
              label: label?.trim() || '',
              items: state.items,
              discount: state.discount,
              customer: state.customer,
              heldAt: new Date().toISOString()
            }
          ],
          items: [],
          discount: { type: 'flat', value: 0 },
          customer: emptyCustomer
        })),

      recallBill: (holdId) =>
        set((state) => {
          const bill = state.heldBills.find((b) => b.id === holdId);
          if (!bill) return {};
          return {
            items: bill.items,
            discount: bill.discount,
            customer: bill.customer,
            heldBills: state.heldBills.filter((b) => b.id !== holdId)
          };
        }),

      discardHeldBill: (holdId) =>
        set((state) => ({ heldBills: state.heldBills.filter((b) => b.id !== holdId) }))
    }),
    { name: 'foodbill-cart' }
  )
);
