import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { getAuthData, setAuthData, clearAuthData, AuthData } from '../utils/session';
import httpClient, { registerLogoutCallback } from '../api/httpClient';

export interface AuthContextType {
  auth: AuthData | null;
  login: (data: AuthData) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
  role?: string;
  name?: string;
  email?: string;
  locationId?: string | number;
  location?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }): React.ReactElement => {
  const [auth, setAuth] = useState<AuthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const authData = await getAuthData();
        setAuth(authData);
      } catch (error) {
        console.error('Error loading auth data:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (data: AuthData) => {
    try {
      await setAuthData(data);
      // verify persistence immediately for debugging
      try {
        const stored = await getAuthData();
        console.log('AuthContext: stored auth after setAuthData:', stored);
      } catch (readErr) {
        console.warn('AuthContext: failed to read back stored auth after setAuthData', readErr);
      }
    } catch (e) {
      console.error('AuthContext: setAuthData failed', e);
    }
    setAuth(data);
    // Ensure axios default headers include token immediately so subsequent requests
    // (that might run before the effect) have the Authorization header.
    try {
      if (data?.token) {
        const tokenValue = `Token ${data.token}`;
        if (!httpClient.defaults.headers) httpClient.defaults.headers = {} as any;
        httpClient.defaults.headers.Authorization = tokenValue;
        httpClient.defaults.headers.authorization = tokenValue;
      }
    } catch (err) {
      // don't block login on this
      console.warn('Failed to set httpClient default headers', err);
    }
  };

  const logout = async () => {
    await clearAuthData();
    setAuth(null);
  };

  // Keep http client default headers in sync with auth
  useEffect(() => {
    if (auth?.token) {
      const tokenValue = `Token ${auth.token}`;
      if (!httpClient.defaults.headers) httpClient.defaults.headers = {} as any;
      httpClient.defaults.headers.Authorization = tokenValue;
      httpClient.defaults.headers.authorization = tokenValue;
    } else {
      if (httpClient.defaults?.headers) {
        delete httpClient.defaults.headers.Authorization;
        delete httpClient.defaults.headers.authorization;
      }
    }
  }, [auth]);

  // Register logout callback with httpClient to handle 401s
  useEffect(() => {
    registerLogoutCallback(() => {
      setAuth(null);
    });
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      auth,
      login,
      logout,
      isAuthenticated: Boolean(auth?.token),
      loading,
      role: auth?.role,
      name: auth?.name,
      email: auth?.email,
      locationId: auth?.location_id ?? auth?.location,
      location: auth?.location,
    }),
    [auth, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
