import { useEffect } from 'react';
import { subscribeToAuthChanges } from '../services/authService';
import { useAuthStore } from '../store/authStore';

export function useAuthListener() {
  const setUser = useAuthStore((s) => s.setUser);
  const clearUser = useAuthStore((s) => s.clearUser);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((profile) => {
      profile ? setUser(profile) : clearUser();
    });
    return unsubscribe;
  }, [setUser, clearUser]);
}

export function useAuth() {
  return useAuthStore((s) => ({ user: s.user, isInitializing: s.isInitializing }));
}
