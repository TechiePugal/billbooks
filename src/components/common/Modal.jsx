import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HiXMark } from 'react-icons/hi2';

export default function Modal({ isOpen, onClose, title, children, dismissible = true }) {
  const { t } = useTranslation();
  // Esc closes, and body scroll is locked behind the modal so the page
  // underneath doesn't scroll along with a long modal on mobile.
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape' && dismissible) onClose();
    };
    document.addEventListener('keydown', handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose, dismissible]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={dismissible ? onClose : undefined}
    >
      <div
        className="animate-slide-up flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-card bg-white sm:max-h-[85dvh] sm:rounded-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
          <h2 className="font-display text-xl font-semibold text-brand-700">{title}</h2>
          <button
            onClick={onClose}
            className="-mr-1.5 flex h-10 w-10 items-center justify-center rounded-full text-gray-400 active:bg-gray-100"
            aria-label={t('common.close')}
          >
            <HiXMark className="h-6 w-6" />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
