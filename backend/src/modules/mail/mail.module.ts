import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

/** Envío de correo transaccional (Mailtrap). */
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
