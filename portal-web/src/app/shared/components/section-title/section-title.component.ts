import { Component, Input } from '@angular/core';
import { BadgeComponent } from '../badge/badge.component';

/**
 * Encabezado de sección reutilizable: eyebrow + título + subtítulo.
 */
@Component({
  selector: 'app-section-title',
  standalone: true,
  imports: [BadgeComponent],
  template: `
    <div class="max-w-2xl" [class.mx-auto]="align === 'center'" [class.text-center]="align === 'center'">
      @if (eyebrow) {
        <app-badge tone="gold" class="mb-4 inline-block">{{ eyebrow }}</app-badge>
      }
      <h2 class="font-display text-3xl font-bold leading-tight text-ivory md:text-4xl lg:text-5xl">
        {{ title }}
      </h2>
      @if (subtitle) {
        <p class="mt-5 text-base text-ivory-dim md:text-lg">{{ subtitle }}</p>
      }
    </div>
  `,
})
export class SectionTitleComponent {
  @Input() eyebrow = '';
  @Input() title = '';
  @Input() subtitle = '';
  @Input() align: 'center' | 'left' = 'center';
}
