export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    type: process.env.DB_TYPE ?? 'mysql',
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    username: process.env.DB_USERNAME ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    name: process.env.DB_DATABASE ?? 'PokerPros',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'PokerPros-dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  auth: {
    // Código secreto opcional: si se envía en el registro, la cuenta se crea como admin.
    // Si no se define, nadie puede auto-registrarse como admin (solo vía seed o admin existente).
    adminInviteCode: process.env.ADMIN_INVITE_CODE ?? '',
  },
  blob: {
    // Almacenamiento de archivos (avatares, etc.) en Vercel Blob.
    // Autenticación preferente: OIDC (VERCEL_OIDC_TOKEN, rotado por Vercel).
    // Alternativa: token de lectura/escritura BLOB_READ_WRITE_TOKEN.
    storeId: process.env.BLOB_STORE_ID ?? '',
    oidcToken: process.env.VERCEL_OIDC_TOKEN ?? '',
    readWriteToken: process.env.BLOB_READ_WRITE_TOKEN ?? '',
  },
  app: {
    // Esquema del deep link de la app móvil que recibe las invitaciones de club
    // (`PokerProsplayer://invite?token=...`, ver mobile-player/app.json).
    mobileScheme: process.env.MOBILE_APP_SCHEME ?? 'PokerProsplayer',
    // Esquema de la app de administración (avisos al equipo del club).
    adminScheme: process.env.ADMIN_APP_SCHEME ?? 'PokerProsadmin',
  },
  mail: {
    // Mailtrap (Email Sending API). Un mismo token sirve para las dos APIs:
    // - Sandbox (pruebas): MAILTRAP_SANDBOX_INBOX_ID apunta a la bandeja de pruebas.
    // - Producción: se omite y se usa send.api.mailtrap.io con un token de un
    //   dominio de envío verificado.
    token: process.env.MAILTRAP_TOKEN ?? '',
    apiUrl: process.env.MAILTRAP_API_URL ?? '',
    sandboxInboxId: process.env.MAILTRAP_SANDBOX_INBOX_ID ?? '',
    fromEmail: process.env.MAIL_FROM_EMAIL ?? 'no-reply@pokerpros.com',
    fromName: process.env.MAIL_FROM_NAME ?? 'PorkerPros',
    // Días de validez de una invitación de colaborador.
    invitationTtlDays: parseInt(process.env.CLUB_INVITATION_TTL_DAYS ?? '7', 10),
  },

  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
});

