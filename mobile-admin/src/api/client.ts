import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from './config';
import { log } from '@/utils/logger';

export const TOKEN_STORAGE_KEY = 'pokelap.authToken';

/** Cliente axios compartido (baseURL /api). */
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'X-App-Client': 'mobile-admin' },
});

log.info(`API base URL: ${API_URL}`);

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

export async function setAuthToken(token: string | null): Promise<void> {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    delete apiClient.defaults.headers.common.Authorization;
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export async function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_STORAGE_KEY);
}

function fullUrl(url?: string, baseURL?: string): string {
  return `${baseURL ?? ''}${url ?? ''}`;
}

apiClient.interceptors.request.use((config) => {
  log.info(`→ ${config.method?.toUpperCase()} ${fullUrl(config.url, config.baseURL)}`);
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    log.info(
      `← ${response.status} ${response.config.method?.toUpperCase()} ${fullUrl(response.config.url, response.config.baseURL)}`,
    );
    return response;
  },
  (error) => {
    if (axios.isAxiosError(error)) {
      const url = fullUrl(error.config?.url, error.config?.baseURL);
      if (!error.response) {
        // Error de red: el servidor no respondio (URL inaccesible, DNS, timeout, CORS, etc.).
        log.error(`✗ NETWORK ERROR ${error.config?.method?.toUpperCase()} ${url}`, {
          code: error.code,
          message: error.message,
          timeout: error.config?.timeout,
        });
      } else {
        log.error(`✗ ${error.response.status} ${error.config?.method?.toUpperCase()} ${url}`, error.response.data);
      }
      if (error.response?.status === 401) {
        onUnauthorized?.();
      }
    } else {
      log.error('✗ Unexpected error', error);
    }
    return Promise.reject(error);
  },
);
