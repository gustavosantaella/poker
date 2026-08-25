import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { SectionTitleComponent } from '../../shared/components/section-title/section-title.component';
import { RevealDirective } from '../../shared/directives/reveal.directive';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

interface DeletionStep {
  title: string;
  description: string;
}

interface RetentionItem {
  label: string;
  period: string;
}

/**
 * Página "Eliminación de cuenta y datos" (requisito de la ficha de Google Play Store).
 *
 * - Referencia el nombre de las apps y del desarrollador que aparecen en Play Store.
 * - Muestra los pasos para solicitar la eliminación (dentro de la app o por esta página).
 * - Especifica los tipos de datos que se eliminan o se conservan y los periodos de retención.
 * - El formulario registra la solicitud en el backend: POST {apiUrl}/account/request-delete.
 */
@Component({
  selector: 'app-delete-data',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, SectionTitleComponent, RevealDirective],
  templateUrl: './delete-data.html',
  styleUrl: './delete-data.scss',
})
export class DeleteDataComponent {
  protected readonly env = environment;
  protected readonly updatedAt = '25 de agosto de 2026';
  protected readonly encode = encodeURIComponent;

  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    reason: ['', [Validators.maxLength(2000)]],
    consent: [false, Validators.requiredTrue],
  });

  protected state: SubmitState = 'idle';
  protected errorMessage = '';

  /** Pasos para eliminar la cuenta desde la propia aplicación (borrado inmediato). */
  protected readonly inAppSteps: DeletionStep[] = [
    {
      title: 'Abre la aplicación',
      description: `Inicia sesión en ${environment.playStoreApps[0]} o ${environment.playStoreApps[1]} con tu cuenta.`,
    },
    {
      title: 'Ve a tu perfil',
      description: 'Entra en la sección "Perfil" o "Configuración" de la aplicación.',
    },
    {
      title: 'Toca "Eliminar cuenta"',
      description: 'Lee la advertencia y confirma la acción.',
    },
    {
      title: 'Listo',
      description: 'Tu cuenta y tus datos asociados se eliminan de forma inmediata y automática.',
    },
  ];

  /** Pasos para solicitar la eliminación a través del formulario de esta página. */
  protected readonly formSteps: DeletionStep[] = [
    {
      title: 'Completa el formulario',
      description:
        'Indica el correo electrónico que usaste para registrarte y, si lo deseas, el motivo de la solicitud.',
    },
    {
      title: 'Envía la solicitud',
      description: 'Confirma que deseas eliminar tu cuenta y envía el formulario de esta página.',
    },
    {
      title: 'Revisión de nuestro equipo',
      description: 'Procesamos tu solicitud en un plazo máximo de 30 días.',
    },
    {
      title: 'Confirmación',
      description: `Te confirmamos por correo cuando se complete la eliminación. Si tienes dudas, escribe a ${environment.contact.email}.`,
    },
  ];

  /** Tipos de datos que se eliminan cuando se procesa la solicitud. */
  protected readonly deletedData: string[] = [
    'Perfil de usuario (nombre, correo, alias, teléfono, país, ciudad y dirección)',
    'Foto de perfil o avatar',
    'Reservas de mesas y de torneos',
    'Membresías de clubs y los clubs que administras',
  ];

  /** Tipos de datos que se conservan, con su periodo de retención. */
  protected readonly retainedData: RetentionItem[] = [
    {
      label: 'La solicitud de eliminación en sí (auditoría y cumplimiento)',
      period: 'Hasta 24 meses',
    },
    {
      label: 'Copias de seguridad de la infraestructura',
      period: 'Hasta 90 días después del borrado',
    },
    {
      label: 'Datos de facturación o contables requeridos por la legislación aplicable',
      period: 'El plazo que exija la ley',
    },
    {
      label: 'Estadísticas agregadas o anonimizadas que no permitan identificarte',
      period: 'Indefinido',
    },
  ];

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.state === 'submitting') return;
    this.state = 'submitting';
    this.errorMessage = '';

    const { email, reason } = this.form.getRawValue();
    try {
      await firstValueFrom(
        this.http.post(`${this.env.apiUrl}/account/request-delete`, {
          email: email.trim(),
          reason: reason.trim() || undefined,
        }),
      );
      this.state = 'success';
    } catch {
      this.state = 'error';
      this.errorMessage =
        'No pudimos enviar tu solicitud automáticamente. Inténtalo de nuevo o escríbenos directamente por correo.';
    }
  }
}
