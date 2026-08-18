import type { IncomingMessage, ServerResponse } from 'http';

// Entry temporal solo para validar el routing de vercel.json en `vercel dev`.
export default function handler(req: IncomingMessage, res: ServerResponse): void {
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      url: req.url,
      method: req.method,
      forwardedUrl: (req.headers['x-vercel-forwarded-url'] as string) ?? null,
      host: req.headers.host,
    }),
  );
}
