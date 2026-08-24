/**
 * Logger minimo para depurar flujos de red y auth en desarrollo.
 * En produccion se desactiva a menos que EXPO_PUBLIC_ENABLE_API_LOGS=true.
 */
declare const __DEV__: boolean;

const ENABLED =
  (typeof __DEV__ !== 'undefined' && __DEV__) || process.env.EXPO_PUBLIC_ENABLE_API_LOGS === 'true';

const PREFIX = '[PokerPros]';

export const log = {
  info: (...args: unknown[]) => {
    if (ENABLED) console.log(PREFIX, ...args);
  },
  warn: (...args: unknown[]) => {
    if (ENABLED) console.warn(PREFIX, ...args);
  },
  error: (...args: unknown[]) => {
    if (ENABLED) console.error(PREFIX, ...args);
  },
};
