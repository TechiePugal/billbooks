import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import ImageUploader from '../components/common/ImageUploader';
import { useShopSettings } from '../hooks/useShopSettings';
import { saveShopSettings, exportBackup, restoreBackup } from '../services/settingsService';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { logout } from '../services/authService';

const SECTIONS = ['Shop', 'Invoice', 'Payment', 'Printer', 'App', 'Backup'];

export default function Settings() {
  const user = useAuthStore((s) => s.user);
  const shopId = useAuthStore((s) => s.user?.shopId);
  const { settings, isLoading } = useShopSettings();
  const { register, handleSubmit, reset, watch, setValue } = useForm({ defaultValues: settings });
  const [isSaving, setIsSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [activeSection, setActiveSection] = useState('Shop');
  const restoreInputRef = useRef(null);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);

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
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err.message || 'Could not save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackup = async () => {
    try {
      await exportBackup(shopId);
      toast.success('Backup downloaded');
    } catch {
      toast.error('Backup failed');
    }
  };

  const handleRestoreFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const result = await restoreBackup(shopId, json);
      toast.success(`Restored ${result.restoredProducts} products, ${result.restoredCategories} categories`);
    } catch {
      toast.error('That file could not be read as a valid backup.');
    } finally {
      e.target.value = '';
    }
  };

  const showQr = watch('showQr');

  return (
    <div className="p-4 pb-6">
      <h1 className="mb-4 font-display text-xl font-bold text-brand-700">Settings</h1>

      <div className="mb-4 flex gap-2 overflow-x-auto">
        {SECTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${
              activeSection === s ? 'bg-brand-500 text-white' : 'bg-white text-gray-500 shadow-sm'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {activeSection === 'Shop' && (
          <Section title="Shop Details">
            <ImageUploader folder="shop-logo" value={logoUrl} onChange={setLogoUrl} shape="round" label="Shop logo" />
            <Input label="Shop name" {...register('shopName')} />
            <Input label="Address" {...register('address')} />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Phone" {...register('phone')} />
              <Input label="Email" type="email" {...register('email')} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input label="GST Number" {...register('gstNumber')} />
              <Input label="FSSAI Number" {...register('fssaiNumber')} />
            </div>
          </Section>
        )}

        {activeSection === 'Invoice' && (
          <Section title="Invoice Settings">
            <div className="grid grid-cols-2 gap-2">
              <Input label="Invoice prefix" {...register('invoicePrefix')} />
              <div>
                <span className="mb-1 block text-sm font-medium text-gray-600">Paper size</span>
                <select {...register('paperSize')} className="w-full rounded-card border border-gray-200 px-4 py-3">
                  <option value="58mm">58mm Thermal</option>
                  <option value="80mm">80mm Thermal</option>
                  <option value="a4">A4</option>
                </select>
              </div>
            </div>
            <Input label="Footer message" {...register('footerMessage')} />
            <ToggleRow label="Show logo on invoice" {...register('showLogo')} />
            <ToggleRow label="Show GST number on invoice" {...register('showGst')} />
            <ToggleRow label="Show payment QR on invoice" {...register('showQr')} />
          </Section>
        )}

        {activeSection === 'Payment' && (
          <Section title="Payment Settings">
            <div>
              <span className="mb-1 block text-sm font-medium text-gray-600">QR type at checkout</span>
              <select {...register('qrType')} className="w-full rounded-card border border-gray-200 px-4 py-3">
                <option value="dynamic">Dynamic — auto-fills the exact bill amount (recommended)</option>
                <option value="static">Static — a fixed QR image, customer types amount manually</option>
              </select>
            </div>

            <Input label="Merchant name (shown to customer)" {...register('merchantName')} />
            <Input label="Merchant UPI ID" placeholder="shopname@upi" {...register('upiId')} />
            <p className="text-xs text-gray-400">
              Used to build the Dynamic QR — the customer scans and the exact bill amount is pre-filled, so there's
              no typing and no short-payment mistakes.
            </p>

            <ImageUploader
              folder="shop-logo"
              value={qrImageUrl}
              onChange={setQrImageUrl}
              label="Static QR image (optional — from your bank/UPI app)"
            />
            <p className="text-xs text-gray-400">
              Only shown at checkout if "Static" is selected above. Useful as a backup if your UPI ID ever changes
              or you'd rather show your bank's official QR.
            </p>
          </Section>
        )}

        {activeSection === 'Printer' && (
          <Section title="Printer Settings">
            <div>
              <span className="mb-1 block text-sm font-medium text-gray-600">Default printer type</span>
              <select {...register('printerType')} className="w-full rounded-card border border-gray-200 px-4 py-3">
                <option value="browser">Browser print dialog (any USB/network printer)</option>
                <option value="bluetooth">Bluetooth thermal printer</option>
              </select>
            </div>
            <ToggleRow label="Auto-print after payment" {...register('autoPrint')} />
            <p className="text-xs text-gray-400">
              Bluetooth thermal printers pair through your device's own Bluetooth settings first; once paired, the
              browser print dialog will list them like any other printer.
            </p>
          </Section>
        )}

        {activeSection === 'App' && (
          <Section title="App Preferences">
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
              <span className="text-sm font-medium">Theme</span>
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600"
              >
                {theme === 'light' ? 'Switch to Dark' : 'Switch to Light'}
              </button>
            </div>
            <div>
              <span className="mb-1 block text-sm font-medium text-gray-600">Language</span>
              <select {...register('language')} className="w-full rounded-card border border-gray-200 px-4 py-3">
                <option value="en">English</option>
                <option value="ta">தமிழ் (Tamil)</option>
              </select>
              <p className="mt-1 text-xs text-gray-400">
                Language is saved now; wiring every screen's text through a translation table is the next step —
                today only this setting is stored so it's ready to switch on.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (window.confirm('Sign out of this shop?')) logout();
              }}
            >
              Sign Out
            </Button>
          </Section>
        )}

        {activeSection === 'Backup' && (
          <Section title="Backup & Restore">
            <Button type="button" onClick={handleBackup}>
              Download Backup (JSON)
            </Button>
            <Button type="button" variant="outline" onClick={() => restoreInputRef.current?.click()}>
              Restore from Backup
            </Button>
            <input ref={restoreInputRef} type="file" accept="application/json" onChange={handleRestoreFile} className="hidden" />
            <p className="text-xs text-gray-400">
              Backup exports your products, categories, customers, and orders as a JSON file. Restore only brings
              back products and categories — past orders are never overwritten, to keep your sales history accurate.
            </p>
          </Section>
        )}

        {activeSection !== 'Backup' && (
          <Button type="submit" loading={isSaving}>
            Save Changes
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
