import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from './config';

export const TOKEN_STORAGE_KEY = 'pokelapPlayer.authToken';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'X-App-Client': 'mobile-player' },
});

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
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);
