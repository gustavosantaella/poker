import { Component, Input } from '@angular/core';
import { ButtonComponent } from '../button/button.component';

export interface PricingFeature {
  label: string;
  included: boolean;
}

/**
 * Tarjeta de plan de precios reutilizable.
 */
@Component({
  selector: 'app-pricing-card',
  standalone: true,
  imports: [ButtonComponent],
  template: `
    <article
      class="relative flex h-full flex-col rounded-3xl border p-8 transition-all duration-300"
      [class]="
        highlighted
          ? 'border-gold-400/50 bg-gradient-to-b from-gold-400/10 to-velvet-800/80 shadow-2xl shadow-gold-500/20 lg:-translate-y-4'
          : 'border-white/10 bg-velvet-800/60 hover:border-white/20'
      "
    >
      @if (highlighted) {
        <span
          class="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-gold-300 to-gold-500 px-4 py-1 text-xs font-bold uppercase tracking-wider text-velvet-950 shadow-lg shadow-gold-500/30"
        >
          Más popular
        </span>
      }

      <h3 class="font-display text-2xl font-bold text-ivory">{{ name }}</h3>
      <p class="mt-1.5 text-sm text-ivory-dim">{{ description }}</p>

      <div class="mt-6 flex items-end gap-1.5">
        <span
          class="font-display text-5xl font-bold"
          [class.text-gradient-gold]="highlighted"
          [class.text-ivory]="!highlighted"
        >
          {{ price }}
        </span>
        <span class="pb-1.5 text-sm text-ivory-muted">{{ period }}</span>
      </div>

      <ul class="mt-7 flex-1 space-y-3.5">
        @for (feature of features; track feature.label) {
          <li class="flex items-start gap-3 text-sm">
            <span
              class="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
              [class]="feature.included ? 'bg-felt-500/20 text-success' : 'bg-naipe-500/15 text-naipe-400'"
            >
              @if (feature.included) {
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              } @else {
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              }
            </span>
            <span [class]="feature.included ? 'text-ivory-dim' : 'text-ivory-muted line-through'">
              {{ feature.label }}
            </span>
          </li>
        }
      </ul>

      <div class="mt-8">
        <app-button
          [variant]="highlighted ? 'primary' : 'outline'"
          [routerLink]="ctaRouterLink"
          [size]="'lg'"
          [block]="true"
        >
          {{ ctaLabel }}
        </app-button>
      </div>
    </article>
  `,
})
export class PricingCardComponent {
  @Input() name = '';
  @Input() price = '';
  @Input() period = '';
  @Input() description = '';
  @Input() features: PricingFeature[] = [];
  @Input() highlighted = false;
  @Input() ctaLabel = '';
  @Input() ctaRouterLink = '/contacto';
}
