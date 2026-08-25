import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

/**
 * Punto de entrada para Vercel Functions (ver vercel.json).
 *
 * Vercel ejecuta la app NestJS como una sola función serverless: su launcher
 * exige que el módulo exporte una función o un servidor HTTP. Este archivo
 * exporta un handler (req, res) que enruta cada request al adaptador Express
 * de NestJS. El arranque local normal sigue viviendo en src/main.ts.
 */

// La app se crea una sola vez por instancia (warm start) y se reutiliza.
let appPromise: Promise<NestExpressApplication> | null = null;

function getApp(): Promise<NestExpressApplication> {
  if (!appPromise) {
    appPromise = createServerlessApp();
  }
  return appPromise;
}

async function createServerlessApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Seguridad: en producción no se permite el secret por defecto.
  const isProduction = config.get<string>('nodeEnv') === 'production';
  if (isProduction && (config.get<string>('jwt.secret') === 'PokerPros-dev-secret' || !config.get<string>('jwt.secret'))) {
    throw new Error('JWT_SECRET must be configured in production');
  }

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
  const corsOrigins = config.get<string[]>('corsOrigins') ?? [];
  const origin = corsOrigins.length > 0 ? corsOrigins : !isProduction;
  app.enableCors({ origin, credentials: false });

  // Registra routers, guards e interceptores antes de servir peticiones.
  // (Requisito en Vercel: el handler se usa sin app.listen().)
  await app.init();

  return app;
}

export default async function handler(req: unknown, res: unknown): Promise<void> {
  const app = await getApp();
  const expressInstance = app.getHttpAdapter().getInstance() as (req: unknown, res: unknown) => void;
  expressInstance(req, res);
}
