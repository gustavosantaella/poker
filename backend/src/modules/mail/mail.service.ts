import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Variables de plantilla disponibles en los correos: escalares simples.
 * Los booleanos solo tienen sentido dentro de `{{#if clave}}` (se muestran vacíos).
 */
export type MailVariables = Record<string, string | number | boolean | null | undefined>;

export interface SendMailOptions {
  to: string;
  toName?: string;
  subject: string;
  /** Plantilla HTML dentro de `modules/mail/templates` (sin extensión). */
  template?: string;
  /** Variables para la plantilla (`{{clave}}`). */
  variables?: MailVariables;
  /** HTML ya renderizado (alternativa a `template`). */
  html?: string;
  /** Texto plano opcional (clientes que no renderizan HTML). */
  text?: string;
  /** Etiqueta de Mailtrap para filtrar en el panel. */
  category?: string;
}

/**
 * Envío de correo transaccional con la Email Sending API de Mailtrap.
 *
 * Contrato validado contra la API real:
 *   POST https://send.api.mailtrap.io/api/send        (producción)
 *   POST https://sandbox.api.mailtrap.io/api/send/:id (pruebas, bandeja de Mailtrap)
 *   cabecera `Api-Token: <MAILTRAP_TOKEN>`
 *   body { from, to, subject, html, text?, category? }
 *   respuesta 200 { "success": true, "message_ids": ["..."] }
 *
 * Configuración:
 *   MAILTRAP_TOKEN            token de API de la cuenta (obligatorio para enviar).
 *   MAILTRAP_SANDBOX_INBOX_ID id de la bandeja de pruebas: si está definido, los
 *                             correos van al Sandbox en lugar de los destinatarios.
 *   MAILTRAP_API_URL          URL completa del endpoint (anula las anteriores).
 *
 * Un fallo de correo NUNCA rompe el flujo de negocio: se registra y se devuelve
 * `false`, de forma que invitar a un colaborador sigue funcionando aunque el
 * proveedor esté caído (el código se puede compartir a mano).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly templates = new Map<string, string>();

  constructor(private readonly config: ConfigService) { }

  /** ¿Hay credenciales configuradas? (sin token no se intenta enviar). */
  get isEnabled(): boolean {
    return Boolean(this.config.get<string>('mail.token'));
  }

  /** Endpoint de envío efectivo: Sandbox si hay bandeja configurada, si no producción. */
  get apiUrl(): string {
    const explicit = this.config.get<string>('mail.apiUrl');
    if (explicit) return explicit;
    const inboxId = this.config.get<string>('mail.sandboxInboxId');
    console.log('INBOX ID', inboxId);
    console.log('API URL', explicit);
    console.log('IS SANDBOX', this.isSandbox);
    if (inboxId) return `https://sandbox.api.mailtrap.io/api/send/${inboxId}`;
    return 'https://send.api.mailtrap.io/api/send';
  }

  /** ¿Los correos van a una bandeja de pruebas en vez de al destinatario real? */
  get isSandbox(): boolean {
    const explicit = this.config.get<string>('mail.apiUrl');
    return !explicit && Boolean(this.config.get<string>('mail.sandboxInboxId'));
  }

  /** URL del Sandbox configurado (o `null`). Útil para mostrar en logs/diagnóstico. */
  get sandboxUrl(): string | null {
    return this.isSandbox ? this.apiUrl : null;
  }

  /**
   * Renderiza una plantilla HTML con `{{variables}}`.
   * Soporta un condicional simple `{{#if clave}}...{{/if}}` y envuelve el resultado
   * en `layout.html` (sustituyendo su `{{content}}`).
   *
   * Nota: se usa la forma con *callback* en `replace` para que los `$` del HTML
   * (precios, plantillas…) no se interpreten como patrones de sustitución.
   */
  render(template: string, variables: MailVariables = {}): string {
    const body = this.interpolate(this.readTemplate(template), variables);
    return this.interpolate(this.readTemplate('layout'), { ...variables, content: body });
  }

  /** Sustituye condicionales y variables en un fragmento de plantilla. */
  private interpolate(
    source: string,
    variables: MailVariables,
  ): string {
    return source
      .replace(/\{\{#if\s+([\w.]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match, key: string, body: string) =>
        variables[key] ? body : '',
      )
      .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) => {
        const value = variables[key];
        return value === null || value === undefined ? '' : String(value);
      });
  }


  /** Envía un correo (plantilla o HTML directo). Devuelve `true` si el proveedor lo aceptó. */
  async send(options: SendMailOptions): Promise<boolean> {
    const token = this.config.get<string>('mail.token');
    if (!token) {
      this.logger.warn(`MAILTRAP_TOKEN is not configured: skipping email to ${options.to}`);
      return false;
    }

    let html = options.html ?? '';
    if (!html && options.template) {
      html = this.render(options.template, options.variables);
    }

    const body = {
      from: {
        email: this.config.get<string>('mail.fromEmail'),
        name: this.config.get<string>('mail.fromName'),
      },
      to: [{ email: options.to, ...(options.toName ? { name: options.toName } : {}) }],
      subject: options.subject,
      html,
      ...(options.text ? { text: options.text } : {}),
      ...(options.category ? { category: options.category } : {}),
    };

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Api-Token': token, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = (await response.text()).slice(0, 500);
      if (!response.ok) {
        this.logger.error(
          `Mailtrap rejected the email to ${options.to} (${response.status}): ${payload}`,
        );
        return false;
      }
      this.logger.log(
        `Email sent to ${options.to}${this.isSandbox ? ' [sandbox]' : ''}: ${payload}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Email delivery failed for ${options.to}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return false;
    }
  }

  /**
   * Lee una plantilla de `modules/mail/templates` (cacheada).
   * Funciona en desarrollo (`src`, ts-node) y en producción (`dist`, copiada por
   * `nest-cli.json` → `compilerOptions.assets`).
   */
  private readTemplate(name: string): string {
    const cached = this.templates.get(name);
    if (cached) return cached;
    const file = `${name}.html`;
    const candidates = [
      join(__dirname, 'templates', file),
      join(process.cwd(), 'src', 'modules', 'mail', 'templates', file),
      join(process.cwd(), 'dist', 'modules', 'mail', 'templates', file),
    ];
    const found = candidates.find((path) => existsSync(path));
    if (!found) {
      throw new Error(`Mail template not found: ${file} (looked in ${candidates.join(', ')})`);
    }
    const content = readFileSync(found, 'utf8');
    this.templates.set(name, content);
    return content;
  }
}
