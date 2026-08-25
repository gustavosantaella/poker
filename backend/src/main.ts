import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { networkInterfaces } from 'os';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Seguridad: en producción no se permite el secret por defecto ni la ausencia de CORS explícito.
  const isProduction = config.get<string>('nodeEnv') === 'production';
  if (isProduction && (config.get<string>('jwt.secret') === 'PokerPros-dev-secret' || !config.get<string>('jwt.secret'))) {
    throw new Error('JWT_SECRET must be configured in production');
  }

  // Los archivos (avatares, etc.) se sirven desde Vercel Blob, no desde el servidor.

  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // Global API prefix: /api
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor(), new LoggingInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS: restringido a CORS_ORIGINS (lista separada por comas) si está definido.
  // En desarrollo sin configuración se permite cualquier origen (apps nativas no usan CORS).
  const corsOrigins = config.get<string[]>('corsOrigins') ?? [];
  const origin = corsOrigins.length > 0 ? corsOrigins : !isProduction;
  app.enableCors({ origin, credentials: false });

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);

  logger.log(`PokerPros API running at http://localhost:${port}/api`);

  // Lista las IPs LAN para que la app (Expo Go en telefono/emulador) pueda apuntar al backend.
  const nets = networkInterfaces();
  const addresses: string[] = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  if (addresses.length === 0) {
    logger.warn('No LAN IPv4 address found - the app on a physical device cannot reach this server.');
  }
  for (const address of addresses) {
    logger.log(`Reachable from your device at: http://${address}:${port}/api`);
  }
}

void bootstrap();