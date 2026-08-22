import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import AppRoutes from './routes/AppRoutes';
import ErrorBoundary from './components/common/ErrorBoundary';
import { useAuthListener } from './hooks/useAuth';
import { useUiStore } from './store/uiStore';
import { useShopSettings } from './hooks/useShopSettings';
import { setAppLanguage, hasStoredLanguagePreference } from './i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, refetchOnWindowFocus: false }
  }
});

function AuthBoundary() {
  useAuthListener();
  return (
    <>
      <LanguageSync />
      <AppRoutes />
    </>
  );
}

function ThemeSync() {
  const theme = useUiStore((s) => s.theme);
  const themeColor = useUiStore((s) => s.themeColor);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.dataset.theme = themeColor;
  }, [theme, themeColor]);
  return null;
}

/**
 * On a brand-new device (no language ever chosen here before), adopt the
 * shop's saved language from Firestore once it loads — so signing in on a
 * second phone shows the same language without a manual re-pick. Never
 * overrides a language already chosen on this device.
 */
function LanguageSync() {
  const { settings, isLoading } = useShopSettings();
  useEffect(() => {
    if (!isLoading && settings.language && !hasStoredLanguagePreference()) {
      setAppLanguage(settings.language);
    }
  }, [isLoading, settings.language]);
  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeSync />
          <AuthBoundary />
          <Toaster position="top-center" toastOptions={{ duration: 2500 }} />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
