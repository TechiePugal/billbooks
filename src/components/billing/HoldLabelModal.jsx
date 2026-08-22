import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../common/Modal';
import Button from '../common/Button';

export default function HoldLabelModal({ isOpen, onClose, onConfirm }) {
  const { t } = useTranslation();
  const [label, setLabel] = useState('');

  const handleConfirm = () => {
    onConfirm(label);
    setLabel('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('cart.holdBill')}>
      <p className="mb-3 text-sm text-gray-500">{t('cart.holdLabelPrompt')}</p>
      <input
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
        placeholder={t('cart.holdLabelPlaceholder')}
        className="w-full rounded-card border border-gray-200 bg-white px-4 py-3 text-base focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
      <Button className="mt-4" onClick={handleConfirm}>
        {t('cart.holdBill')}
      </Button>
    </Modal>
  );
}
