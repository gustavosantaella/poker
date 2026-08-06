import axios from 'axios';
import { API_URL } from '@/api/config';
import { translate } from '@/i18n';

/** Extrae un mensaje de error legible desde cualquier excepcion (axios, validacion, etc). */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(' - ') : data.message;
    }
    if (error.response?.status === 401) {
      return translate('errors.sessionExpired');
    }
    if (error.response?.status === 403) {
      return translate('errors.forbidden');
    }
    if (!error.response) {
      const reason =
        error.code === 'ECONNABORTED'
          ? translate('errors.networkTimeout')
          : translate('errors.networkUnreachable');
      return translate('errors.network', { reason, url: API_URL });
    }
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return translate('errors.generic');
}