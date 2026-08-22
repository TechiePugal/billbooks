import { memo } from 'react';
import { formatCurrency } from '../../utils/billing';

function ProductCard({ product, onAdd }) {
  return (
    <button
      onClick={() => onAdd(product)}
      // Fixed overall height + fixed image height (not aspect-square, which
      // used to let long/short names change each card's total height) so
      // every card in the grid is exactly the same size on every row,
      // regardless of name length. Sized deliberately small — this is a
      // "tap fast, tap often" screen, not a product showcase, so more
      // items visible at once beats bigger cards.
      className="animate-pop-in flex h-28 flex-col overflow-hidden rounded-lg bg-white text-left shadow-card transition active:scale-95 sm:h-32"
    >
      <div className="h-16 w-full shrink-0 bg-brand-50 sm:h-[4.5rem]">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-display text-lg text-brand-200">
            {product.name?.[0]?.toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-center gap-0 px-1.5 py-1">
        <p className="line-clamp-1 text-xs font-medium leading-tight text-ink">{product.name}</p>
        <p className="font-display text-sm font-semibold text-brand-600">
          {formatCurrency(product.sellingPrice)}
        </p>
      </div>
    </button>
  );
}

export default memo(ProductCard);
