import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LogoComponent } from '../logo/logo.component';
import { ButtonComponent } from '../button/button.component';

interface NavLink {
  label: string;
  href: string;
  fragment?: string;
}

/** Barra de navegación fija con menú responsive. */
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LogoComponent, ButtonComponent],
  template: `
    <header class="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-velvet-950/80 backdrop-blur-xl">
      <nav class="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <app-logo />

        <div class="hidden items-center gap-8 md:flex">
          @for (link of links; track link.label) {
            <a
              [routerLink]="link.href"
              [fragment]="link.fragment"
              routerLinkActive="text-gold-400"
              [routerLinkActiveOptions]="{ exact: link.href === '/' }"
              class="text-sm font-medium text-ivory-dim transition-colors hover:text-ivory"
            >
              {{ link.label }}
            </a>
          }
        </div>

        <div class="hidden items-center gap-3 md:flex">
          <app-button [routerLink]="'/contacto'" [variant]="'ghost'" [size]="'sm'">Contáctanos</app-button>
          <app-button [routerLink]="'/planes'" [size]="'sm'">Ver planes</app-button>
        </div>

        <button
          (click)="menuOpen.set(!menuOpen())"
          [attr.aria-expanded]="menuOpen()"
          aria-label="Abrir menú"
          class="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-ivory md:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            @if (!menuOpen()) {
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            } @else {
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            }
          </svg>
        </button>
      </nav>

      @if (menuOpen()) {
        <div class="border-t border-white/5 bg-velvet-900 px-4 pb-6 pt-3 md:hidden">
          <div class="flex flex-col gap-1">
            @for (link of links; track link.label) {
              <a
                [routerLink]="link.href"
                [fragment]="link.fragment"
                (click)="menuOpen.set(false)"
                class="rounded-lg px-3 py-2.5 text-sm font-medium text-ivory-dim hover:bg-white/5 hover:text-ivory"
              >
                {{ link.label }}
              </a>
            }
          </div>
          <div class="mt-4">
            <app-button [routerLink]="'/planes'" [block]="true">Ver planes</app-button>
          </div>
        </div>
      }
    </header>
  `,
})
export class NavbarComponent {
  protected readonly menuOpen = signal(false);

  protected readonly links: NavLink[] = [
    { label: 'Inicio', href: '/' },
    { label: 'Funcionalidades', href: '/', fragment: 'funcionalidades' },
    { label: 'Planes', href: '/planes' },
    { label: 'Contacto', href: '/contacto' },
  ];
}
