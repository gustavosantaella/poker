import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from './config';

export const TOKEN_STORAGE_KEY = 'pokelap.authToken';

/** Cliente axios compartido (baseURL /api). */
export const apiClient = axios.create({ baseURL: API_URL });

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

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);