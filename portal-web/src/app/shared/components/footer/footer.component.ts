import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LogoComponent } from '../logo/logo.component';
import { environment } from '../../../../environments/environment';

/** Pie de página reutilizable. */
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, LogoComponent],
  template: `
    <footer class="border-t border-white/5 bg-velvet-900">
      <div class="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div class="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <app-logo />
            <p class="mt-4 max-w-xs text-sm leading-relaxed text-ivory-dim">{{ env.tagline }}</p>
            <div class="mt-5 flex gap-3">
              <a [href]="env.contact.social.instagram" target="_blank" rel="noopener noreferrer" aria-label="Instagram" class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-ivory-dim transition-colors hover:border-gold-400/40 hover:text-gold-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
              <a [href]="env.contact.social.twitter" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-ivory-dim transition-colors hover:border-gold-400/40 hover:text-gold-400">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
            </div>
          </div>

          <div>
            <h4 class="font-display text-sm font-bold uppercase tracking-wider text-ivory">Navegación</h4>
            <ul class="mt-4 space-y-2.5 text-sm">
              <li><a routerLink="/" class="text-ivory-dim transition-colors hover:text-gold-400">Inicio</a></li>
              <li><a routerLink="/planes" class="text-ivory-dim transition-colors hover:text-gold-400">Planes y precios</a></li>
              <li><a routerLink="/contacto" class="text-ivory-dim transition-colors hover:text-gold-400">Contáctanos</a></li>
            </ul>
          </div>

          <div>
            <h4 class="font-display text-sm font-bold uppercase tracking-wider text-ivory">Legal</h4>
            <ul class="mt-4 space-y-2.5 text-sm">
              <li><a routerLink="/politicas-de-privacidad" class="text-ivory-dim transition-colors hover:text-gold-400">Políticas y privacidad</a></li>
              <li><a routerLink="/eliminacion-de-datos" class="text-ivory-dim transition-colors hover:text-gold-400">Eliminación de datos</a></li>
              <li><span class="text-ivory-muted">Términos y condiciones</span></li>
            </ul>
          </div>

          <div>
            <h4 class="font-display text-sm font-bold uppercase tracking-wider text-ivory">Contacto</h4>
            <ul class="mt-4 space-y-2.5 text-sm text-ivory-dim">
              <li class="flex items-center gap-2.5">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-gold-400"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>
                <a [href]="'mailto:' + env.contact.email" class="break-all transition-colors hover:text-gold-400">{{ env.contact.email }}</a>
              </li>
              <li class="flex items-center gap-2.5">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-gold-400"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                {{ env.contact.phone }}
              </li>
              <li class="flex items-center gap-2.5">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-gold-400"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {{ env.contact.address }}
              </li>
            </ul>
          </div>
        </div>

        <div class="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-6 text-xs text-ivory-muted sm:flex-row">
          <p>© {{ year }} {{ env.appName }} · Todos los derechos reservados.</p>
          <p>Hecho con ♠ · {{ env.domain }}</p>
        </div>
      </div>
    </footer>
  `,
})
export class FooterComponent {
  protected readonly env = environment;
  protected readonly year = new Date().getFullYear();
}
