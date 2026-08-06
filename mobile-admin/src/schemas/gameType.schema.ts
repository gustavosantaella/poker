import { z } from 'zod';
import { TFunction } from '@/i18n';

export const createGameTypeSchema = (t: TFunction) =>
  z.object({
    name: z.string().min(1, t('validation.nameRequired')).max(80),
    description: z.string().max(500).optional(),
    holeCards: z.coerce.number().int().min(1, t('validation.atLeastOneHoleCard')).max(10),
    communityCards: z.coerce.number().int().min(0).max(10),
    isActive: z.boolean(),
  });

export type GameTypeFormValues = z.infer<ReturnType<typeof createGameTypeSchema>>;
