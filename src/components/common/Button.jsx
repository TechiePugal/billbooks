import { useTranslation } from 'react-i18next';

const VARIANTS = {
  primary: 'bg-brand-500 text-white active:bg-brand-600',
  accent: 'bg-accent-500 text-brand-900 active:bg-accent-600',
  outline: 'border-2 border-brand-500 text-brand-500 active:bg-brand-50',
  ghost: 'text-brand-500 active:bg-brand-50',
  danger: 'bg-red-500 text-white active:bg-red-600'
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  loading,
  children,
  ...props
}) {
  const { t } = useTranslation();
  const sizeClass = size === 'lg' ? 'py-4 text-base' : size === 'sm' ? 'py-2 text-sm' : 'py-3 text-sm';

  return (
    <button
      disabled={disabled || loading}
      className={`w-full rounded-card font-semibold shadow-card transition active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 ${sizeClass} ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading ? t('common.loading') : children}
    </button>
  );
}
