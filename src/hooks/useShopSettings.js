import { useEffect, useState } from 'react';
import { getShopSettings } from '../services/orderService';
import { useAuthStore } from '../store/authStore';

const DEFAULTS = {
  shopName: 'My Shop',
  address: '',
  phone: '',
  gstNumber: '',
  invoicePrefix: 'INV',
  footerMessage: 'Thank you! Visit again.',
  paperSize: '80mm', // '58mm' | '80mm' | 'a4'
  showLogo: true,
  showGst: true,
  showQr: true,
  qrType: 'dynamic', // 'dynamic' | 'static'
  staticQrUrl: '',
  upiId: import.meta.env.VITE_DEFAULT_UPI_ID || '',
  merchantName: import.meta.env.VITE_DEFAULT_MERCHANT_NAME || ''
};

export function useShopSettings() {
  const shopId = useAuthStore((s) => s.user?.shopId);
  const [settings, setSettings] = useState(DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!shopId) return;
    let cancelled = false;
    getShopSettings(shopId).then((data) => {
      if (!cancelled) {
        setSettings({ ...DEFAULTS, ...data });
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [shopId]);

  return { settings, isLoading };
}
