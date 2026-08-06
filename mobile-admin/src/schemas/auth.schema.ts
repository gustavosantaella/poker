import { z } from 'zod';
import { TFunction } from '@/i18n';

export const createLoginSchema = (t: TFunction) =>
  z.object({
    email: z.string().min(1, t('validation.emailRequired')).email(t('validation.emailInvalid')),
    password: z.string().min(1, t('validation.passwordRequired')),
  });

export type LoginValues = z.infer<ReturnType<typeof createLoginSchema>>;

export const createRegisterSchema = (t: TFunction) =>
  z
    .object({
      name: z.string().min(2, t('validation.nameMin')).max(120),
      email: z.string().min(1, t('validation.emailRequired')).email(t('validation.emailInvalid')),
      password: z.string().min(8, t('validation.passwordMin')).max(72),
      confirmPassword: z.string().min(1, t('validation.confirmPassword')),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('validation.passwordsMismatch'),
      path: ['confirmPassword'],
    });

export type RegisterValues = z.infer<ReturnType<typeof createRegisterSchema>>;
