import axios from 'axios';
import { API_URL } from '@/api/config';

/** Extrae un mensaje de error legible desde cualquier excepcion (axios, validacion, etc). */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(' - ') : data.message;
    }
    if (error.response?.status === 401) {
      return 'Your session has expired. Please sign in again.';
    }
    if (error.response?.status === 403) {
      return 'You do not have permission to perform this action.';
    }
    if (!error.response) {
      const reason = error.code === 'ECONNABORTED' ? 'request timed out' : 'cannot reach the server';
      return `Network error (${reason}). Verify the API URL is correct and reachable from this device: ${API_URL}`;
    }
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}