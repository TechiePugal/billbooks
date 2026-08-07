import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FcGoogle } from 'react-icons/fc';
import { signInWithGoogle } from '../services/authService';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { user, isInitializing } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  if (!isInitializing && user) return <Navigate to="/billing" replace />;

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
      toast.success('Welcome!');
    } catch (err) {
      // Popup-closed-by-user is the most common "error" here and isn't
      // worth alarming anyone about.
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        toast.error(err?.message || 'Could not sign in. Please try again.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-brand-500 px-6">
      <div className="w-full max-w-sm rounded-card bg-white p-8 shadow-card">
        <div className="mb-8 text-center">
          <p className="font-display text-2xl font-bold text-brand-700">FoodBill POS</p>
          <p className="mt-2 text-sm text-gray-400">
            Sign in with Google to open your shop. Your Google account is your shop — first sign-in sets it up
            automatically.
          </p>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={isSigningIn}
          className="flex w-full items-center justify-center gap-3 rounded-card border-2 border-gray-200 bg-white py-3.5 text-base font-semibold text-gray-700 shadow-card transition active:scale-[0.98] disabled:opacity-50"
        >
          <FcGoogle className="h-6 w-6" />
          {isSigningIn ? 'Signing in…' : 'Continue with Google'}
        </button>

        <p className="mt-6 text-center text-xs text-gray-400">
          Each Google account manages exactly one shop's billing, inventory, and reports.
        </p>
      </div>
    </div>
  );
}
