import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { networkInterfaces } from 'os';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

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
  app.enableCors({ origin: true, credentials: false });

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);

  logger.log(`PokeLAP API running at http://localhost:${port}/api`);

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