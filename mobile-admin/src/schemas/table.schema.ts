import { z } from 'zod';
import { CURRENCIES } from '@/constants/currencies';
import { TFunction } from '@/i18n';

export const createTableSchema = (t: TFunction) =>
  z
    .object({
      name: z.string().min(1, t('validation.nameRequired')).max(100),
      gameTypeId: z.coerce.number().int().min(1, t('validation.selectGameType')),
      currency: z.enum(CURRENCIES),
      smallBlind: z.coerce.number().min(0, t('validation.mustBeZeroOrMore')),
      bigBlind: z.coerce.number().min(0, t('validation.mustBeZeroOrMore')),
      minBuyIn: z.coerce.number().min(0, t('validation.mustBeZeroOrMore')),
      maxBuyIn: z.coerce.number().min(0, t('validation.mustBeZeroOrMore')),
      seats: z.coerce.number().int().min(1, t('validation.atLeastOneSeat')).max(20),
      status: z.enum(['open', 'running', 'paused', 'closed']),
      mode: z.enum(['live', 'online']),
      notes: z.string().max(1000).optional(),
      clubId: z.preprocess(
        (v) => (v === '' || v == null ? undefined : v),
        z.coerce.number().int().min(1).optional(),
      ),
    })
    .refine((data) => data.bigBlind >= data.smallBlind, {
      message: t('validation.bigBlindGTE'),
      path: ['bigBlind'],
    })
    .refine((data) => data.maxBuyIn >= data.minBuyIn, {
      message: t('validation.maxBuyInGTE'),
      path: ['maxBuyIn'],
    });

export type TableFormValues = z.infer<ReturnType<typeof createTableSchema>>;
