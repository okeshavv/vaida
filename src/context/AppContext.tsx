import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Patient, UserRole, SupportedLanguage } from '../types';

interface AppState {
  user: Patient | null;
  isAuthenticated: boolean;
  role: UserRole;
  language: SupportedLanguage;
  isOnline: boolean;
  pendingSyncCount: number;
  setUser: (user: Patient | null) => void;
  setRole: (role: UserRole) => void;
  setLanguage: (lang: SupportedLanguage) => void;
  setPendingSyncCount: (count: number) => void;
  logout: () => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Patient | null>(() => {
    const stored = localStorage.getItem('vaida_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [role, setRoleState] = useState<UserRole>(() => {
    const ur = localStorage.getItem('userRole');
    if (ur === 'patient' || ur === 'asha' || ur === 'doctor') return ur;
    const vr = localStorage.getItem('vaida_role');
    if (vr === 'patient' || vr === 'asha' || vr === 'doctor') return vr;
    return 'patient';
  });
  const [language, setLanguageState] = useState<SupportedLanguage>(() =>
    (localStorage.getItem('vaida_lang') as SupportedLanguage) || 'en'
  );
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (user) localStorage.setItem('vaida_user', JSON.stringify(user));
    else localStorage.removeItem('vaida_user');
  }, [user]);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem('vaida_lang', lang);
  }, []);

  const handleSetRole = useCallback((r: UserRole) => {
    setRoleState(r);
    localStorage.setItem('vaida_role', r);
    localStorage.setItem('userRole', r);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setRoleState('patient');
    localStorage.removeItem('vaida_access_token');
    localStorage.removeItem('vaida_user');
    localStorage.removeItem('userRole');
    localStorage.removeItem('vaida_role');
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        role,
        language,
        isOnline,
        pendingSyncCount,
        setUser,
        setRole: handleSetRole,
        setLanguage,
        setPendingSyncCount,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
