import { Component } from '@angular/core';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { SectionTitleComponent } from '../../shared/components/section-title/section-title.component';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { environment } from '../../../environments/environment';

interface ContactItem {
  icon: string;
  label: string;
  value: string;
  href?: string;
}

/** Página de contacto: la información se lee del environment de Angular. */
@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [ButtonComponent, SectionTitleComponent, RevealDirective],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
})
export class ContactComponent {
  protected readonly env = environment;

  protected readonly contactItems: ContactItem[] = [
    {
      icon: 'mail',
      label: 'Correo electrónico',
      value: environment.contact.email,
      href: `mailto:${environment.contact.email}`,
    },
    {
      icon: 'phone',
      label: 'Teléfono / WhatsApp',
      value: environment.contact.phone,
      href: `tel:${environment.contact.whatsapp}`,
    },
    { icon: 'pin', label: 'Ubicación', value: environment.contact.address },
    { icon: 'clock', label: 'Horario de atención', value: environment.contact.hours },
  ];
}
