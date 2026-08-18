export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    type: process.env.DB_TYPE ?? 'mysql',
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    username: process.env.DB_USERNAME ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    name: process.env.DB_DATABASE ?? 'pokelap',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'pokelap-dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  auth: {
    // Código secreto opcional: si se envía en el registro, la cuenta se crea como admin.
    // Si no se define, nadie puede auto-registrarse como admin (solo vía seed o admin existente).
    adminInviteCode: process.env.ADMIN_INVITE_CODE ?? '',
  },
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
});

