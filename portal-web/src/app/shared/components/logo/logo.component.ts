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
      <span
        class="relative grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-gold-300 to-gold-600 shadow-lg shadow-gold-500/25 transition-shadow duration-300 group-hover:shadow-gold-400/50"
      >
        <span class="absolute inset-[3px] rounded-full border-2 border-dashed border-velvet-900/50"></span>
        <span class="font-display text-base font-bold leading-none text-velvet-950">♠</span>
      </span>
      <span class="font-display text-lg font-bold tracking-tight text-ivory">
        PokerPros <span class="text-gold-400">Management</span>
      </span>
    </a>
  `,
})
export class LogoComponent {}
