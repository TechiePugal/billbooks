import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { FcGoogle } from 'react-icons/fc';
import { signInWithGoogle } from '../services/authService';
import { useAuth } from '../hooks/useAuth';
import { SUPPORTED_LANGUAGES, setAppLanguage } from '../i18n';

export default function Login() {
  const { t, i18n } = useTranslation();
  const { user, isInitializing } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  if (!isInitializing && user) return <Navigate to="/billing" replace />;

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
      toast.success(t('login.welcomeToast'));
    } catch (err) {
      // Popup-closed-by-user is the most common "error" here and isn't
      // worth alarming anyone about.
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        toast.error(err?.message || t('login.signInFailedToast'));
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-brand-500 px-6">
      <div className="mb-6 flex gap-2">
        {SUPPORTED_LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => setAppLanguage(l.code)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              i18n.language === l.code ? 'bg-white text-brand-700' : 'bg-brand-400 text-white'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="w-full max-w-sm rounded-card bg-white p-8 shadow-card">
        <div className="mb-8 text-center">
          <p className="font-display text-2xl font-bold text-brand-700">{t('login.appName')}</p>
          <p className="mt-2 text-sm text-gray-400">{t('login.tagline')}</p>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={isSigningIn}
          className="flex w-full items-center justify-center gap-3 rounded-card border-2 border-gray-200 bg-white py-3.5 text-base font-semibold text-gray-700 shadow-card transition active:scale-[0.98] disabled:opacity-50"
        >
          <FcGoogle className="h-6 w-6" />
          {isSigningIn ? t('login.signingIn') : t('login.continueWithGoogle')}
        </button>

        <p className="mt-6 text-center text-xs text-gray-400">{t('login.footnote')}</p>
      </div>
    </div>
  );
}
