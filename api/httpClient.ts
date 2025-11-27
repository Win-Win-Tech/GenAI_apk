import axios, { AxiosInstance } from 'axios';
import { API_BASE_URL } from '../config/apiConfig';
import { getAuthData, clearAuthData } from '../utils/session';

const httpClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
  },
});

let logoutCallback: (() => void) | null = null;

export const registerLogoutCallback = (callback: () => void) => {
  logoutCallback = callback;
};

// Request interceptor
httpClient.interceptors.request.use(async (config: any) => {
  const auth = await getAuthData();
  if (auth?.token && config) {
    if (!config.headers) config.headers = {};
    // set both Authorization and authorization (some callers/libraries use lowercase)
    const tokenValue = `Token ${auth.token}`;
    if (!config.headers.Authorization && !config.headers.authorization) {
      config.headers.Authorization = tokenValue;
      config.headers.authorization = tokenValue;
    } else {
      // ensure both keys are present
      if (!config.headers.Authorization && config.headers.authorization) {
        config.headers.Authorization = config.headers.authorization;
      }
      if (!config.headers.authorization && config.headers.Authorization) {
        config.headers.authorization = config.headers.Authorization;
      }
    }
  }
  // debug request summary (do not log token itself)
  console.log(
    `[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url} - headers: ${config.headers ? Object.keys(config.headers).join(',') : 'none'}; tokenPresent:${Boolean(auth?.token)}`
  );
  return config;
});

// Response interceptor
httpClient.interceptors.response.use(
  (response: any) => {
    console.log(`[API Response] ${response.status} ${response.config.url}`);
    return response;
  },
  async (error: any) => {
    if (error?.config) {
      const method = error.config.method?.toUpperCase() || 'REQUEST';
      const url = error.config.url || 'unknown';

      if (error?.response) {
        console.error(`[API Error] ${error.response.status} ${method} ${url}:`, error.response.data);
      } else if (error?.code) {
        console.error(`[API Error] ${error.code} ${method} ${url}:`, error.message);
      } else {
        console.error(`[API Error] ${method} ${url}:`, error.message);
      }
    }

    if (error?.response?.status === 401 || error?.response?.status === 403) {
      console.log('[API Error] Authentication error, triggering logout...');
      await clearAuthData();
      if (logoutCallback) {
        logoutCallback();
      }
    }
    return Promise.reject(error);
  }
);

export default httpClient;
