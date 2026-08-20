import { Component, Input, computed } from '@angular/core';
import { RouterLink } from '@angular/router';

export type AppButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type AppButtonSize = 'sm' | 'md' | 'lg';

/**
 * Botón reutilizable. Puede renderizar un <button>, un <a routerLink>
 * o un <a href> externo según las entradas que reciba.
 */
@Component({
  selector: 'app-button',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (href) {
      <a
        [href]="href"
        target="_blank"
        rel="noopener noreferrer"
        [class]="classes()"
        [class.pointer-events-none]="disabled"
        [class.opacity-60]="disabled"
      >
        <ng-content />
      </a>
    } @else if (routerLink) {
      <a [routerLink]="routerLink" [class]="classes()">
        <ng-content />
      </a>
    } @else {
      <button [type]="type" [disabled]="disabled" [class]="classes()">
        <ng-content />
      </button>
    }
  `,
})
export class ButtonComponent {
  @Input() variant: AppButtonVariant = 'primary';
  @Input() size: AppButtonSize = 'md';
  @Input() href?: string;
  @Input() routerLink?: string;
  @Input() disabled = false;
  @Input() block = false;
  @Input() type: 'button' | 'submit' = 'button';

  protected readonly classes = computed(() => {
    const base =
      'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-velvet-900';
    const variants: Record<AppButtonVariant, string> = {
      primary:
        'bg-gradient-to-r from-gold-300 to-gold-500 text-velvet-950 shadow-lg shadow-gold-500/25 hover:-translate-y-0.5 hover:from-gold-200 hover:to-gold-400 hover:shadow-gold-400/40',
      secondary:
        'bg-felt-500 text-ivory shadow-lg shadow-felt-500/20 hover:-translate-y-0.5 hover:bg-felt-400',
      outline:
        'border border-gold-400/40 text-gold-300 hover:border-gold-400/70 hover:bg-gold-400/10',
      ghost: 'text-ivory-dim hover:bg-white/5 hover:text-ivory',
    };
    const sizes: Record<AppButtonSize, string> = {
      sm: 'px-3.5 py-2 text-xs',
      md: 'px-5 py-2.5 text-sm',
      lg: 'px-7 py-3.5 text-base',
    };
    return `${base} ${variants[this.variant]} ${sizes[this.size]} ${this.block ? 'w-full' : ''}`;
  });
}
