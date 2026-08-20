import { Component, Input, computed } from '@angular/core';

export type AppBadgeTone = 'gold' | 'felt' | 'naipe' | 'neutral';

/** Etiqueta/badge reutilizable con distintos tonos. */
@Component({
  selector: 'app-badge',
  standalone: true,
  template: `
    <span [class]="classes()"><ng-content /></span>
  `,
})
export class BadgeComponent {
  @Input() tone: AppBadgeTone = 'gold';

  protected readonly classes = computed(() => {
    const tones: Record<AppBadgeTone, string> = {
      gold: 'border-gold-400/30 bg-gold-400/10 text-gold-300',
      felt: 'border-felt-400/30 bg-felt-500/15 text-felt-300',
      naipe: 'border-naipe-500/30 bg-naipe-500/10 text-naipe-400',
      neutral: 'border-white/10 bg-white/5 text-ivory-dim',
    };
    return `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wider ${tones[this.tone]}`;
  });
}
