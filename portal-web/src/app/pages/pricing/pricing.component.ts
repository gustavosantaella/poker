import { Component } from '@angular/core';
import { ButtonComponent } from '../../shared/components/button/button.component';
import {
  PricingCardComponent,
  PricingFeature,
} from '../../shared/components/pricing-card/pricing-card.component';
import { SectionTitleComponent } from '../../shared/components/section-title/section-title.component';
import { RevealDirective } from '../../shared/directives/reveal.directive';

/** Página de planes y precios (solo visual, sin procesamiento de pagos). */
@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [
    ButtonComponent,
    PricingCardComponent,
    SectionTitleComponent,
    RevealDirective,
  ],
  templateUrl: './pricing.html',
  styleUrl: './pricing.scss',
})
export class PricingComponent {
  protected readonly freeFeatures: PricingFeature[] = [
    { label: '3 torneos por mes', included: true },
    { label: '1 mesa cash', included: true },
    { label: 'Reservas de asientos', included: true },
    { label: 'Calendario de eventos', included: true },
    { label: 'Modo Live y Online', included: true },
    { label: 'Clubs', included: false },
    { label: 'Torneos ilimitados', included: false },
    { label: 'Mesas cash ilimitadas', included: false },
  ];

  protected readonly premiumFeatures: PricingFeature[] = [
    { label: 'Torneos ilimitados', included: true },
    { label: 'Mesas cash ilimitadas', included: true },
    { label: 'Clubs y miembros', included: true },
    { label: 'Modo Live y Online', included: true },
    { label: 'Premios garantizados y chips', included: true },
    { label: 'Panel de administración completo', included: true },
    { label: 'Soporte prioritario', included: true },
  ];
}
