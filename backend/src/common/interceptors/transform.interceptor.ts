import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';

export interface ApiEnvelope<T> {
  data: T;
}

/** Wraps every response in a consistent { data } envelope. */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiEnvelope<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiEnvelope<T>> {
    // Los endpoints SSE (text/event-stream) NO se envuelven: cada frame ya es un
    // MessageEvent y el envelope rompería el protocolo.
    const request = context.switchToHttp().getRequest();
    if (String(request.headers?.accept ?? '').includes('text/event-stream')) {
      return next.handle() as Observable<ApiEnvelope<T>>;
    }
    return next.handle().pipe(map((data) => ({ data })));
  }
}
