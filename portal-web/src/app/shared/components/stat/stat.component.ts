import { Component, Input } from '@angular/core';

/** Estadística reutilizable (valor grande + etiqueta). */
@Component({
  selector: 'app-stat',
  standalone: true,
  template: `
    <div class="text-center">
      <p class="font-display text-3xl font-bold text-gradient-gold md:text-4xl">
        {{ value }}
      </p>
      <p class="mt-1.5 text-sm text-ivory-dim">{{ label }}</p>
    </div>
  `,
})
export class StatComponent {
  @Input() value = '';
  @Input() label = '';
}
