import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';

/**
 * Registra cada request HTTP: metodo, ruta, status, duracion e IP.
 * Ayuda a diagnosticar problemas de red (ej. Expo Go en un dispositivo fisico).
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const { method, originalUrl } = request;
    const ip = request.ip ?? request.socket?.remoteAddress ?? 'unknown';
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startedAt;
          this.logger.log(`${method} ${originalUrl} ${response.statusCode} ${duration}ms ip=${ip}`);
        },
        error: (error: Error & { status?: number }) => {
          const duration = Date.now() - startedAt;
          const status = error.status ?? 500;
          this.logger.error(`${method} ${originalUrl} ${status} ${duration}ms ip=${ip} - ${error.message}`);
          if (status >= 500) {
            this.logger.debug(error.stack);
          }
        },
      }),
    );
  }
}
