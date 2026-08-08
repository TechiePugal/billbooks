import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import ImageUploader from '../components/common/ImageUploader';
import { useShopSettings } from '../hooks/useShopSettings';
import { saveShopSettings, exportBackup, restoreBackup } from '../services/settingsService';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { logout } from '../services/authService';
import { SUPPORTED_LANGUAGES, setAppLanguage } from '../i18n';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const shopId = useAuthStore((s) => s.user?.shopId);
  const { settings, isLoading } = useShopSettings();
  const { register, handleSubmit, reset, watch } = useForm({ defaultValues: settings });
  const [isSaving, setIsSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [activeSection, setActiveSection] = useState('Shop');
  const restoreInputRef = useRef(null);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);

  const SECTIONS = [
    { key: 'Shop', label: t('settings.sectionShop') },
    { key: 'Invoice', label: t('settings.sectionInvoice') },
    { key: 'Payment', label: t('settings.sectionPayment') },
    { key: 'Printer', label: t('settings.sectionPrinter') },
    { key: 'App', label: t('settings.sectionApp') },
    { key: 'Backup', label: t('settings.sectionBackup') }
  ];

  useEffect(() => {
    if (!isLoading) {
      reset(settings);
      setLogoUrl(settings.logoUrl || '');
      setQrImageUrl(settings.staticQrUrl || '');
    }
  }, [isLoading, settings, reset]);

  const onSubmit = async (values) => {
    setIsSaving(true);
    try {
      await saveShopSettings(shopId, { ...values, logoUrl, staticQrUrl: qrImageUrl });
      toast.success(t('settings.settingsSavedToast'));
    } catch (err) {
      toast.error(err.message || t('settings.settingsSaveFailedToast'));
    } finally {
      setIsSaving(false);
    }
  };

  // Language switches the whole app instantly on this device, and is also
  // persisted to the shop's settings straight away (not gated behind the
  // "Save Changes" button below) — a language choice should take effect the
  // moment it's tapped, the same way the theme toggle next to it does.
  const handleLanguageChange = (code) => {
    setAppLanguage(code);
    if (shopId) {
      saveShopSettings(shopId, { language: code }).catch(() => {
        // Non-fatal — the app still switched language on this device either way.
      });
    }
  };

  const handleBackup = async () => {
    try {
      await exportBackup(shopId);
      toast.success(t('settings.backupDownloadedToast'));
    } catch {
      toast.error(t('settings.backupFailedToast'));
    }
  };

  const handleRestoreFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const result = await restoreBackup(shopId, json);
      toast.success(t('settings.restoredToast', { products: result.restoredProducts, categories: result.restoredCategories }));
    } catch {
      toast.error(t('settings.restoreFailedToast'));
    } finally {
      e.target.value = '';
    }
  };

  const showQr = watch('showQr');

  return (
    <div className="p-4 pb-6">
      <h1 className="mb-4 font-display text-xl font-bold text-brand-700">{t('settings.title')}</h1>

      <div className="mb-4 flex gap-2 overflow-x-auto">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${
              activeSection === s.key ? 'bg-brand-500 text-white' : 'bg-white text-gray-500 shadow-sm'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {activeSection === 'Shop' && (
          <Section title={t('settings.shopDetails')}>
            <ImageUploader folder="shop-logo" value={logoUrl} onChange={setLogoUrl} shape="round" label={t('settings.shopLogo')} />
            <Input label={t('settings.shopName')} {...register('shopName')} />
            <Input label={t('settings.address')} {...register('address')} />
            <div className="grid grid-cols-2 gap-2">
              <Input label={t('settings.phone')} {...register('phone')} />
              <Input label={t('settings.email')} type="email" {...register('email')} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input label={t('settings.gstNumber')} {...register('gstNumber')} />
              <Input label={t('settings.fssaiNumber')} {...register('fssaiNumber')} />
            </div>
          </Section>
        )}

        {activeSection === 'Invoice' && (
          <Section title={t('settings.invoiceSettings')}>
            <div className="grid grid-cols-2 gap-2">
              <Input label={t('settings.invoicePrefix')} {...register('invoicePrefix')} />
              <div>
                <span className="mb-1 block text-sm font-medium text-gray-600">{t('settings.paperSize')}</span>
                <select {...register('paperSize')} className="w-full rounded-card border border-gray-200 px-4 py-3">
                  <option value="58mm">{t('settings.paper58')}</option>
                  <option value="80mm">{t('settings.paper80')}</option>
                  <option value="a4">{t('settings.paperA4')}</option>
                </select>
              </div>
            </div>
            <Input label={t('settings.footerMessage')} {...register('footerMessage')} />
            <ToggleRow label={t('settings.showLogoOnInvoice')} {...register('showLogo')} />
            <ToggleRow label={t('settings.showGstOnInvoice')} {...register('showGst')} />
            <ToggleRow label={t('settings.showQrOnInvoice')} {...register('showQr')} />
          </Section>
        )}

        {activeSection === 'Payment' && (
          <Section title={t('settings.paymentSettings')}>
            <div>
              <span className="mb-1 block text-sm font-medium text-gray-600">{t('settings.qrTypeLabel')}</span>
              <select {...register('qrType')} className="w-full rounded-card border border-gray-200 px-4 py-3">
                <option value="dynamic">{t('settings.qrDynamic')}</option>
                <option value="static">{t('settings.qrStatic')}</option>
              </select>
            </div>

            <Input label={t('settings.merchantName')} {...register('merchantName')} />
            <Input label={t('settings.merchantUpiId')} placeholder="shopname@upi" {...register('upiId')} />
            <p className="text-xs text-gray-400">{t('settings.dynamicQrHint')}</p>

            <ImageUploader
              folder="shop-logo"
              value={qrImageUrl}
              onChange={setQrImageUrl}
              label={t('settings.staticQrImage')}
            />
            <p className="text-xs text-gray-400">{t('settings.staticQrHint')}</p>
          </Section>
        )}

        {activeSection === 'Printer' && (
          <Section title={t('settings.printerSettings')}>
            <div>
              <span className="mb-1 block text-sm font-medium text-gray-600">{t('settings.defaultPrinterType')}</span>
              <select {...register('printerType')} className="w-full rounded-card border border-gray-200 px-4 py-3">
                <option value="browser">{t('settings.printerBrowser')}</option>
                <option value="bluetooth">{t('settings.printerBluetooth')}</option>
              </select>
            </div>
            <ToggleRow label={t('settings.autoPrintAfterPayment')} {...register('autoPrint')} />
            <p className="text-xs text-gray-400">{t('settings.printerBluetoothHint')}</p>
          </Section>
        )}

        {activeSection === 'App' && (
          <Section title={t('settings.appPreferences')}>
            <div className="flex items-center gap-3 rounded-card bg-brand-50 p-3">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="h-11 w-11 rounded-full object-cover" />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-200 font-display text-lg font-bold text-brand-700">
                  {(user?.name || '?')[0]?.toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-brand-700">{user?.name}</p>
                <p className="truncate text-xs text-gray-400">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-card bg-white p-3 shadow-card">
              <span className="text-sm font-medium">{t('settings.theme')}</span>
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600"
              >
                {theme === 'light' ? t('settings.switchToDark') : t('settings.switchToLight')}
              </button>
            </div>

            <div>
              <span className="mb-1 block text-sm font-medium text-gray-600">{t('settings.language')}</span>
              <div className="flex gap-2">
                {SUPPORTED_LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => handleLanguageChange(l.code)}
                    className={`flex-1 rounded-card py-3 text-sm font-semibold transition ${
                      i18n.language === l.code ? 'bg-brand-500 text-white' : 'bg-white text-brand-600 shadow-card'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-400">{t('settings.languageHint')}</p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (window.confirm(t('settings.signOutConfirm'))) logout();
              }}
            >
              {t('settings.signOut')}
            </Button>
          </Section>
        )}

        {activeSection === 'Backup' && (
          <Section title={t('settings.backupRestore')}>
            <Button type="button" onClick={handleBackup}>
              {t('settings.downloadBackup')}
            </Button>
            <Button type="button" variant="outline" onClick={() => restoreInputRef.current?.click()}>
              {t('settings.restoreBackup')}
            </Button>
            <input ref={restoreInputRef} type="file" accept="application/json" onChange={handleRestoreFile} className="hidden" />
            <p className="text-xs text-gray-400">{t('settings.backupHint')}</p>
          </Section>
        )}

        {activeSection !== 'Backup' && (
          <Button type="submit" loading={isSaving}>
            {t('common.saveChanges')}
          </Button>
        )}
      </form>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-3 rounded-card bg-white p-4 shadow-card">
      <h2 className="font-display text-base font-semibold text-brand-700">{title}</h2>
      {children}
    </div>
  );
}

function ToggleRow({ label, ...props }) {
  return (
    <label className="flex items-center justify-between rounded-card bg-brand-50 px-3 py-2.5">
      <span className="text-sm font-medium">{label}</span>
      <input type="checkbox" className="h-5 w-5 accent-brand-500" {...props} />
    </label>
  );
}
