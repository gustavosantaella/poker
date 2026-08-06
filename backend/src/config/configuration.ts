export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    username: process.env.DB_USERNAME ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    name: process.env.DB_DATABASE ?? 'pokelap',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'pokelap-dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
});
