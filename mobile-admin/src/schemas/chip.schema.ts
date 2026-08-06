import { z } from 'zod';
import { TFunction } from '@/i18n';

export const createChipSchema = (t: TFunction) =>
  z.object({
    value: z.coerce.number().min(1, t('validation.valueMin')),
    color: z.string().min(1, t('validation.colorRequired')).max(50),
    hexColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, t('validation.hexColor')),
    quantity: z.preprocess(
      (v) => (v === '' || v == null ? undefined : v),
      z.coerce.number().int().min(0).optional(),
    ),
    notes: z.string().max(255).optional(),
    isActive: z.boolean(),
  });

export type ChipFormValues = z.infer<ReturnType<typeof createChipSchema>>;
