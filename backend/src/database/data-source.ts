import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * DataSource para comandos CLI de TypeORM (migraciones).
 * Uso: npm run migration:generate -- src/database/migrations/Nombre
 *      npm run migration:run
 *      npm run migration:revert
 */
export default new DataSource({
  type: (process.env.DB_TYPE ?? 'mysql') as any,
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '3306', 10),
  username: process.env.DB_USERNAME ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_DATABASE ?? 'PokerPros',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*{.ts,.js}'],
  synchronize: false,
  migrationsRun: false,
});
