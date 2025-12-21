
const DEFAULT_DEV_URL = 'http://127.0.0.1:8000/api';
const DEFAULT_PROD_URL = 'https://apigatekeeper.cloudgentechnologies.com/api';

export const API_BASE_URL = (
  ((globalThis as any).process?.env?.EXPO_PUBLIC_API_BASE) ||
  DEFAULT_PROD_URL 
).replace(/\/$/, '');

export const AUTH_STORAGE_KEY = 'trueface_auth';

export default API_BASE_URL;

