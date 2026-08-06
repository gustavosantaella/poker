import { Platform } from 'react-native';

// La URL de la API se configura con EXPO_PUBLIC_API_URL.
// Defaults:
//  - Web / iOS simulator : http://localhost:3000/api
//  - Android emulator    : http://10.0.2.2:3000/api
const DEFAULT_API_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000/api' : 'http://172.18.20.54:3000/api';

export const API_URL: string = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL;