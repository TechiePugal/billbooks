import { forwardRef } from 'react';

const Input = forwardRef(function Input({ label, error, className = '', ...props }, ref) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-gray-600">{label}</span>}
      <input
        ref={ref}
        className={`w-full rounded-card border border-gray-200 bg-white px-4 py-3 text-base focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 ${
          error ? 'border-red-400' : ''
        } ${className}`}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
    </label>
  );
});

export default Input;
