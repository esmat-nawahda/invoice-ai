import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createBusinessApi } from '../utils/api';

interface AuthContextType {
  apiKey: string | null;
  isAuthenticated: boolean;
  login: (apiKey: string) => void;
  logout: () => void;
  api: ReturnType<typeof createBusinessApi> | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [api, setApi] = useState<ReturnType<typeof createBusinessApi> | null>(null);

  useEffect(() => {
    // Check for stored API key on app load
    const storedApiKey = localStorage.getItem('invoice-ai-api-key');
    if (storedApiKey) {
      setApiKey(storedApiKey);
      setApi(createBusinessApi(storedApiKey));
    }
  }, []);

  const login = (newApiKey: string) => {
    setApiKey(newApiKey);
    setApi(createBusinessApi(newApiKey));
    localStorage.setItem('invoice-ai-api-key', newApiKey);
  };

  const logout = () => {
    setApiKey(null);
    setApi(null);
    localStorage.removeItem('invoice-ai-api-key');
  };

  const value: AuthContextType = {
    apiKey,
    isAuthenticated: !!apiKey,
    login,
    logout,
    api,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};