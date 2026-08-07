import { memo } from 'react';
import { formatCurrency } from '../../utils/billing';

function ProductCard({ product, onAdd }) {
  return (
    <button
      onClick={() => onAdd(product)}
      // Fixed overall height (h-40 → sm:h-48) + fixed image height (not aspect-square,
      // which used to let long/short names change each card's total height) so every
      // card in the grid is exactly the same size, on every row, regardless of name length.
      className="animate-pop-in flex h-40 flex-col overflow-hidden rounded-card bg-white text-left shadow-card transition active:scale-95 sm:h-48"
    >
      <div className="h-24 w-full shrink-0 bg-brand-50 sm:h-28">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-display text-2xl text-brand-200">
            {product.name?.[0]?.toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-center gap-0.5 p-2.5">
        <p className="line-clamp-2 text-sm font-medium leading-tight text-ink">{product.name}</p>
        <p className="font-display text-base font-semibold text-brand-600">
          {formatCurrency(product.sellingPrice)}
        </p>
      </div>
    </button>
  );
}

export default memo(ProductCard);
