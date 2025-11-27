import httpClient from './httpClient';
import { API_BASE_URL } from '../config/apiConfig';
import { getAuthData } from '../utils/session';

export interface Employee {
  id?: number;
  [key: string]: any;
}

export const getEmployees = (params?: any): Promise<any> =>
  httpClient.get('/employees/', { params });

export const registerEmployee = async (formData: FormData): Promise<any> => {
  // Use fetch for file uploads (more reliable in React Native)
  const auth = await getAuthData();
  const token = auth?.token;
  try {
    const url = `${API_BASE_URL}/register/`;
    // Helpful debug: try to log form data parts (React Native FormData uses _parts)
    try {
      const parts = (formData as any)?._parts;
      if (Array.isArray(parts)) {
        console.log('[registerEmployee] FormData parts:', parts.map((p: any) => p[0]));
      }
    } catch (e) {
      // ignore
    }

    console.log('[registerEmployee] POST', url, 'tokenPresent:', !!token);

    const res = await fetch(url, {
      method: 'POST',
      headers: token ? { Authorization: `Token ${token}` } : undefined,
      body: formData,
    });

    // Read response safely: try json, fall back to text for better debugging
    let data: any = null;
    try {
      data = await res.json();
    } catch (e) {
      try {
        const text = await res.text();
        data = { _rawText: text };
      } catch (e2) {
        data = null;
      }
    }

    console.log('[registerEmployee] Response status:', res.status, 'data:', data);

    if (res.ok) {
      return { data, status: res.status };
    }

    const err: any = new Error('Request failed');
    err.response = { data, status: res.status };
    throw err;
  } catch (e: any) {
    // Re-throw with a similar shape to axios errors where possible
    if (e?.response) throw e;
    const err: any = new Error(e?.message || 'Network Error');
    throw err;
  }
};

export const updateEmployee = (id: number | string, payload: any): Promise<any> => {
  const isFormData = payload instanceof FormData;
  const config = isFormData
    ? { headers: { 'Content-Type': 'multipart/form-data' } }
    : undefined;
  return httpClient.patch(`/employees/${id}/`, payload, config);
};

export const deleteEmployee = (id: number | string): Promise<any> =>
  httpClient.delete(`/employees/${id}/`);
