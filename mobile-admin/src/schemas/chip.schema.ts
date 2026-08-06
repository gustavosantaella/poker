import { z } from 'zod';

export const chipSchema = z.object({
  value: z.coerce.number().min(1, 'Value must be at least 1'),
  color: z.string().min(1, 'Color name is required').max(50),
  hexColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Use a valid hex color, e.g. #FF0000'),
  quantity: z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.number().int().min(0).optional(),
  ),
  notes: z.string().max(255).optional(),
  isActive: z.boolean(),
});

export type ChipFormValues = z.infer<typeof chipSchema>;