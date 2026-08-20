import { Directive, ElementRef, Input, AfterViewInit, OnDestroy } from '@angular/core';

/**
 * Directiva reutilizable `appReveal`: anima la aparición del elemento
 * cuando entra en el viewport (IntersectionObserver).
 *
 * Uso:
 *   <section appReveal revealDelay="120">...</section>
 */
@Directive({
  selector: '[appReveal]',
  standalone: true,
})
export class RevealDirective implements AfterViewInit, OnDestroy {
  /** Retraso en ms antes de la animación (para escalonar tarjetas). */
  @Input() revealDelay = 0;

  private readonly el: HTMLElement;
  private observer?: IntersectionObserver;

  constructor(elementRef: ElementRef<HTMLElement>) {
    this.el = elementRef.nativeElement;
  }

  ngAfterViewInit(): void {
    this.el.classList.add('reveal-hidden');
    if (this.revealDelay) {
      this.el.style.transitionDelay = `${this.revealDelay}ms`;
    }
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.el.classList.add('reveal-visible');
            this.observer?.disconnect();
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -48px 0px' },
    );
    this.observer.observe(this.el);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
