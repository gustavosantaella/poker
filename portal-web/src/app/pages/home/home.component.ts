import { Component } from '@angular/core';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { FeatureCardComponent } from '../../shared/components/feature-card/feature-card.component';
import {
  PricingCardComponent,
  PricingFeature,
} from '../../shared/components/pricing-card/pricing-card.component';
import { SectionTitleComponent } from '../../shared/components/section-title/section-title.component';
import { StatComponent } from '../../shared/components/stat/stat.component';
import { RevealDirective } from '../../shared/directives/reveal.directive';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface Step {
  number: string;
  title: string;
  description: string;
}

interface Stat {
  value: string;
  label: string;
}

/** Página de inicio: hero + funcionalidades + cómo funciona + planes. */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    BadgeComponent,
    ButtonComponent,
    FeatureCardComponent,
    PricingCardComponent,
    SectionTitleComponent,
    StatComponent,
    RevealDirective,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent {
  protected readonly stats: Stat[] = [
    { value: '0 USD', label: 'para empezar' },
    { value: '3', label: 'torneos/mes en el plan gratis' },
    { value: '1', label: 'mesa cash en el plan gratis' },
    { value: '∞', label: 'sin límites con Premium' },
  ];

  protected readonly features: Feature[] = [
    {
      icon: 'cash',
      title: 'Mesas cash',
      description:
        'Crea mesas con blinds, buy-ins y asientos configurables. Tus jugadores reservan su lugar en segundos.',
    },
    {
      icon: 'trophy',
      title: 'Torneos',
      description:
        'Organiza torneos con stack, re-entry, add-on y premios garantizados. Controla la inscripción en tiempo real.',
    },
    {
      icon: 'users',
      title: 'Clubs',
      description:
        'Agrupa a tus jugadores en clubs privados con un código único de 6 dígitos y gestiona las solicitudes de ingreso.',
    },
    {
      icon: 'calendar',
      title: 'Calendario',
      description:
        'Visualiza todas tus mesas y torneos en un calendario claro y organizado para no perder ningún evento.',
    },
    {
      icon: 'activity',
      title: 'Live & Online',
      description:
        'Gestiona partidas presenciales y en línea desde la misma plataforma, con el estado de cada evento al instante.',
    },
    {
      icon: 'zap',
      title: 'Tiempo real',
      description:
        'Actualizaciones de jugadores, reservas y estados al instante con eventos en vivo.',
    },
    {
      icon: 'dashboard',
      title: 'Panel de administración',
      description:
        'Dashboards con métricas de tus mesas, torneos, clubs y jugadores para tomar mejores decisiones.',
    },
    {
      icon: 'award',
      title: 'Premios y chips',
      description:
        'Define premios garantizados y gestiona las fichas (chips) de tus torneos sin complicaciones.',
    },
  ];

  protected readonly steps: Step[] = [
    {
      number: '01',
      title: 'Crea tu cuenta',
      description: 'Regístrate como administrador de tu sala de póker en segundos.',
    },
    {
      number: '02',
      title: 'Configura tu evento',
      description: 'Define tus mesas, torneos, blinds, buy-ins y premios a tu medida.',
    },
    {
      number: '03',
      title: 'Juega y crece',
      description: 'Tus jugadores reservan su asiento y disfrutan la experiencia al instante.',
    },
  ];

  protected readonly freeFeatures: PricingFeature[] = [
    { label: '3 torneos por mes', included: true },
    { label: '1 mesa cash', included: true },
    { label: 'Reservas de asientos', included: true },
    { label: 'Calendario de eventos', included: true },
    { label: 'Clubs', included: false },
  ];

  protected readonly premiumFeatures: PricingFeature[] = [
    { label: 'Torneos ilimitados', included: true },
    { label: 'Mesas cash ilimitadas', included: true },
    { label: 'Clubs y miembros', included: true },
    { label: 'Acceso a todas las funcionalidades', included: true },
    { label: 'Soporte prioritario', included: true },
  ];
}
