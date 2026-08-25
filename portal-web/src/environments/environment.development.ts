/**
 * Entorno de desarrollo (se reemplaza en builds de desarrollo vía angular.json).
 */
export const environment = {
  production: false,
  appName: 'PokerPros Management',
  /** Nombre del desarrollador tal como aparece en la ficha de Google Play Store. */
  developer: 'NexoSoftware',
  /** Nombres de las apps tal como aparecen en la ficha de Google Play Store. */
  playStoreApps: ['PokerPros Player', 'PokerPros Admin'],
  /** URL base de la API del backend (prefijo global /api incluido). */
  apiUrl: 'http://localhost:3000/api',
  tagline: 'Gestiona tu sala de póker: mesas cash, torneos y clubs.',
  domain: 'nexosoftware.ve',
  contact: {
    email: 'contacto@pokerprosmanagement.ve',
    phone: '+58 412 123 4567',
    whatsapp: '+584121234567',
    address: 'Caracas, Distrito Capital, Venezuela',
    hours: 'Lunes a Viernes · 9:00 am - 6:00 pm (VET)',
    social: {
      instagram: 'https://instagram.com/pokerprosmanagement',
      twitter: 'https://x.com/pokerprosve',
      facebook: 'https://facebook.com/pokerprosmanagement',
      telegram: 'https://t.me/pokerprosmanagement',
    },
  },
};
