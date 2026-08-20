import { Component, Input } from '@angular/core';

/** Iconos SVG (stroke, estilo lucide) usados por las tarjetas de funcionalidad. */
const ICONS: Record<string, string> = {
  cash: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  trophy:
    '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  calendar:
    '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  globe:
    '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  dashboard:
    '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  ticket:
    '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2M13 17v2M13 11v2"/>',
  clock:
    '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  chart:
    '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
};

/** Tarjeta de funcionalidad reutilizable (icono + título + descripción). */
@Component({
  selector: 'app-feature-card',
  standalone: true,
  template: `
    <article
      class="group relative h-full rounded-2xl border border-white/8 bg-velvet-800/60 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-gold-400/40 hover:bg-velvet-800 hover:shadow-xl hover:shadow-gold-500/10"
    >
      <div
        class="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gold-400/10 text-gold-400 ring-1 ring-inset ring-gold-400/20 transition-colors duration-300 group-hover:bg-gold-400 group-hover:text-velvet-950"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          [innerHTML]="iconPath"
        ></svg>
      </div>
      <h3 class="font-display text-xl font-bold text-ivory">{{ title }}</h3>
      <p class="mt-2.5 text-sm leading-relaxed text-ivory-dim">{{ description }}</p>
    </article>
  `,
})
export class FeatureCardComponent {
  @Input() icon = 'zap';
  @Input() title = '';
  @Input() description = '';

  protected get iconPath(): string {
    return ICONS[this.icon] ?? ICONS['zap'];
  }
}
