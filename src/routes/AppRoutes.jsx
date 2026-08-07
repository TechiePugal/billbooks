import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../layouts/MainLayout';
import Spinner from '../components/common/Spinner';

const Login = lazy(() => import('../pages/Login'));
const Billing = lazy(() => import('../pages/Billing'));
const Inventory = lazy(() => import('../pages/Inventory'));
const Reports = lazy(() => import('../pages/Reports'));
const Settings = lazy(() => import('../pages/Settings'));

const PageFallback = () => (
  <div className="flex h-[60vh] items-center justify-center">
    <Spinner />
  </div>
);

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/billing" element={<Billing />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/billing" replace />} />
        <Route path="*" element={<Navigate to="/billing" replace />} />
      </Routes>
    </Suspense>
  );
}
