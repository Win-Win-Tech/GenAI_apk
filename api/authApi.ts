import httpClient from './httpClient';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  name: string;
  email: string;
  role: string;
  location_id?: string | number;
  location?: string;
  [key: string]: any;
}

export const login = (email: string, password: string): Promise<any> =>
  httpClient.post('/auth/login/', { email, password });

export const logout = (): Promise<any> =>
  httpClient.post('/auth/logout/');
