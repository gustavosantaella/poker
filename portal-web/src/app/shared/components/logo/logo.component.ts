import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [RouterLink],
  template: `
    <a
      routerLink="/"
      aria-label="PokerPros Management — Inicio"
      class="group inline-flex items-center gap-2.5"
    >
      <img
        src="/logo.png"
        alt="PokerPros Management"
        width="36"
        height="36"
        class="h-9 w-9 rounded-full object-cover shadow-lg shadow-gold-500/25 ring-2 ring-white/10 transition-transform duration-300 group-hover:scale-105"
      />
      <span class="font-display text-lg font-bold tracking-tight text-ivory">
        PokerPros <span class="text-gold-400">Management</span>
      </span>
    </a>
  `,
})
export class LogoComponent {}
