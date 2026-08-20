import { Component } from '@angular/core';
import { SectionTitleComponent } from '../../shared/components/section-title/section-title.component';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { environment } from '../../../environments/environment';

interface PolicySection {
  title: string;
  paragraphs: string[];
}

/** Página de políticas y privacidad. */
@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [SectionTitleComponent, RevealDirective],
  templateUrl: './privacy.html',
  styleUrl: './privacy.scss',
})
export class PrivacyComponent {
  protected readonly env = environment;
  protected readonly updatedAt = '19 de agosto de 2026';

  protected readonly sections: PolicySection[] = [
    {
      title: '1. Introducción',
      paragraphs: [
        `En ${this.env.appName} nos tomamos muy en serio la privacidad de nuestros usuarios. Esta política explica qué información recopilamos, cómo la usamos y los derechos que tienes sobre ella.`,
        'Al usar la plataforma aceptas las prácticas descritas en este documento. Si tienes dudas, puedes escribirnos a través de los canales de contacto.',
      ],
    },
    {
      title: '2. Datos que recopilamos',
      paragraphs: [
        'Datos de cuenta: nombre, correo electrónico, alias y foto de perfil que proporcionas al registrarte.',
        'Datos de actividad: reservas de asientos, mesas y torneos en los que participas, clubs a los que perteneces y saldo de chips dentro de la plataforma.',
        'Datos técnicos: información básica del dispositivo y del navegador necesaria para ofrecer el servicio de forma segura.',
      ],
    },
    {
      title: '3. Uso de los datos',
      paragraphs: [
        'Usamos tus datos únicamente para operar la plataforma: gestionar tu cuenta, procesar reservas, organizar torneos y mesas, administrar clubs y brindarte soporte.',
        'Podemos enviarte comunicaciones relacionadas con el servicio (avisos de eventos, actualizaciones de la plataforma). No enviamos publicidad de terceros.',
      ],
    },
    {
      title: '4. Almacenamiento y seguridad',
      paragraphs: [
        'La información se almacena en servidores seguros con cifrado en tránsito y acceso restringido solo al personal autorizado.',
        'Aplicamos medidas técnicas y organizativas para proteger tus datos contra accesos no autorizados, pérdida o alteración.',
      ],
    },
    {
      title: '5. Compartición de datos',
      paragraphs: [
        'No vendemos ni alquilamos tus datos personales a terceros.',
        'Solo compartimos información con proveedores de infraestructura (almacenamiento, correo, bases de datos) en la medida estrictamente necesaria para operar el servicio, siempre bajo acuerdos de confidencialidad.',
      ],
    },
    {
      title: '6. Tus derechos',
      paragraphs: [
        'Tienes derecho a acceder, corregir o eliminar tus datos personales, así como a solicitar una copia portátil de los mismos.',
        'Puedes ejercer estos derechos en cualquier momento contactándonos. Procesaremos tu solicitud en un plazo razonable.',
      ],
    },
    {
      title: '7. Contacto',
      paragraphs: [
        `Para cualquier consulta sobre esta política o sobre el tratamiento de tus datos, escríbenos a ${this.env.contact.email} o llámanos al ${this.env.contact.phone}.`,
      ],
    },
  ];
}
