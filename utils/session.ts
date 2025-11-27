import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_STORAGE_KEY } from '../config/apiConfig';

const LEGACY_AUTH_KEYS = ['trueface_auth'];

export interface AuthData {
  token?: string;
  name?: string;
  email?: string;
  role?: string;
  location_id?: string | number;
  location?: string;
  [key: string]: any;
}

export const getAuthData = async (): Promise<AuthData | null> => {
  try {
    let raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      for (const legacyKey of LEGACY_AUTH_KEYS) {
        raw = await AsyncStorage.getItem(legacyKey);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            await setAuthData(parsed);
            await AsyncStorage.removeItem(legacyKey);
            return parsed;
          } catch {
            await AsyncStorage.removeItem(legacyKey);
            raw = null;
          }
        }
      }
    }
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

export const setAuthData = async (auth: AuthData | null): Promise<void> => {
  if (!auth) {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    for (const key of LEGACY_AUTH_KEYS) {
      await AsyncStorage.removeItem(key);
    }
    return;
  }
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  // Remove legacy keys but do not remove the active storage key if it's listed
  for (const key of LEGACY_AUTH_KEYS) {
    if (key === AUTH_STORAGE_KEY) continue;
    await AsyncStorage.removeItem(key);
  }
};

export const clearAuthData = async (): Promise<void> => {
  await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  for (const key of LEGACY_AUTH_KEYS) {
    await AsyncStorage.removeItem(key);
  }
};

export const isAuthenticated = async (): Promise<boolean> => {
  const auth = await getAuthData();
  return Boolean(auth?.token);
};
