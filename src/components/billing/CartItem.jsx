import { HiMinus, HiPlus, HiOutlineTrash } from 'react-icons/hi2';
import { formatCurrency } from '../../utils/billing';
import { useCartStore } from '../../store/cartStore';

export default function CartItem({ item }) {
  const increaseQty = useCartStore((s) => s.increaseQty);
  const decreaseQty = useCartStore((s) => s.decreaseQty);
  const setQty = useCartStore((s) => s.setQty);
  const removeItem = useCartStore((s) => s.removeItem);

  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{item.name}</p>
        <p className="text-xs text-gray-400">{formatCurrency(item.price)} each</p>
      </div>

      <div className="flex items-center gap-0.5 rounded-full bg-brand-50 p-0.5">
        <button
          onClick={() => decreaseQty(item.productId)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-brand-600 active:bg-brand-100"
          aria-label="Decrease quantity"
        >
          <HiMinus className="h-4 w-4" />
        </button>
        <input
          type="number"
          value={item.qty}
          onChange={(e) => setQty(item.productId, Math.max(0, Number(e.target.value)))}
          className="w-8 bg-transparent text-center text-sm font-semibold focus:outline-none"
        />
        <button
          onClick={() => increaseQty(item.productId)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-brand-600 active:bg-brand-100"
          aria-label="Increase quantity"
        >
          <HiPlus className="h-4 w-4" />
        </button>
      </div>

      <p className="w-16 shrink-0 text-right text-sm font-semibold">{formatCurrency(item.price * item.qty)}</p>

      <button
        onClick={() => removeItem(item.productId)}
        className="flex h-9 w-9 shrink-0 items-center justify-center text-gray-300 active:text-red-500"
        aria-label="Remove item"
      >
        <HiOutlineTrash className="h-4 w-4" />
      </button>
    </div>
  );
}
