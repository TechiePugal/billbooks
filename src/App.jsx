import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import AppRoutes from './routes/AppRoutes';
import { useAuthListener } from './hooks/useAuth';
import { useUiStore } from './store/uiStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, refetchOnWindowFocus: false }
  }
});

function AuthBoundary() {
  useAuthListener();
  return <AppRoutes />;
}

function ThemeSync() {
  const theme = useUiStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeSync />
        <AuthBoundary />
        <Toaster position="top-center" toastOptions={{ duration: 2500 }} />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
