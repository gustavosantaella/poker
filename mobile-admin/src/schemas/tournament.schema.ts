import { z, ZodIssueCode } from 'zod';
import { TFunction } from '@/i18n';

const optionalInt = (min: number, max?: number) =>
  z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    max === undefined
      ? z.coerce.number().int().min(min).optional()
      : z.coerce.number().int().min(min).max(max).optional(),
  );

const optionalNumber = (min: number) =>
  z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.number().min(min).optional(),
  );

export const createTournamentSchema = (t: TFunction) =>
  z
    .object({
      name: z.string().min(1, t('validation.nameRequired')).max(100),
      gameTypeId: z.coerce.number().int().min(1, t('validation.selectGameType')),
      startDate: z.string().min(1, t('validation.startDateRequired')),
      status: z.enum(['scheduled', 'registering', 'running', 'paused', 'completed', 'cancelled']),
      buyIn: z.coerce.number().min(0, t('validation.mustBeZeroOrMore')),
      fee: z.coerce.number().min(0).optional(),
      startingStack: z.coerce.number().int().min(100, t('validation.startingStackMin')),
      maxPlayers: optionalInt(2, 1000),
      maxPlayersUnlimited: z.boolean(),
      registrationOpen: z.boolean(),
      reEntryEnabled: z.boolean(),
      reEntryUnlimited: z.boolean(),
      maxReEntries: optionalInt(0),
      lateRegistrationEnabled: z.boolean(),
      lateRegistrationUntilLevel: optionalInt(1),
      addOnEnabled: z.boolean(),
      addOnAmount: optionalNumber(0),
      addOnStack: optionalInt(1),
      addOnUntilLevel: optionalInt(1),
      guaranteedPrize: optionalNumber(0),
      paidPlacesType: z.enum(['percent', 'fixed']),
      paidPlacesValue: optionalInt(1),
      adminFeeType: z.enum(['percent', 'fixed']),
      adminFeeValue: optionalNumber(0),
      startingBigBlind: optionalInt(1),
      levelDurationMin: z.coerce.number().int().min(1, t('validation.levelDurationMin')).max(240),
      numberOfLevels: optionalInt(1, 60),
      growth: z.enum(['slow', 'normal', 'fast']),
      anteMode: z.enum(['none', 'per_player', 'bb_ante']),
      anteStartLevel: optionalInt(1),
      breakEveryLevels: z.coerce.number().int().min(0, t('validation.breakMin')).max(20),
      breakDurationMin: optionalInt(0),
    })
    .superRefine((data, ctx) => {
      if (
        data.reEntryEnabled &&
        !data.reEntryUnlimited &&
        (data.maxReEntries === undefined || data.maxReEntries < 1)
      ) {
        ctx.addIssue({
          code: ZodIssueCode.custom,
          path: ['maxReEntries'],
          message: t('validation.maxReEntriesRequired'),
        });
      }
      if (
        data.lateRegistrationEnabled &&
        (data.lateRegistrationUntilLevel === undefined || data.lateRegistrationUntilLevel < 1)
      ) {
        ctx.addIssue({
          code: ZodIssueCode.custom,
          path: ['lateRegistrationUntilLevel'],
          message: t('validation.untilLevelRequired'),
        });
      }
      if (data.addOnEnabled) {
        if (data.addOnAmount === undefined || data.addOnAmount < 0) {
          ctx.addIssue({
            code: ZodIssueCode.custom,
            path: ['addOnAmount'],
            message: t('validation.addOnAmountRequired'),
          });
        }
        if (data.addOnStack === undefined || data.addOnStack < 1) {
          ctx.addIssue({
            code: ZodIssueCode.custom,
            path: ['addOnStack'],
            message: t('validation.addOnStackRequired'),
          });
        }
        if (data.addOnUntilLevel === undefined || data.addOnUntilLevel < 1) {
          ctx.addIssue({
            code: ZodIssueCode.custom,
            path: ['addOnUntilLevel'],
            message: t('validation.addOnUntilLevelRequired'),
          });
        }
      }
      if (data.paidPlacesType === 'percent' && data.paidPlacesValue != null && data.paidPlacesValue > 100) {
        ctx.addIssue({ code: ZodIssueCode.custom, path: ['paidPlacesValue'], message: t('validation.percentMax') });
      }
      if (data.adminFeeType === 'percent' && data.adminFeeValue != null && data.adminFeeValue > 100) {
        ctx.addIssue({ code: ZodIssueCode.custom, path: ['adminFeeValue'], message: t('validation.percentMax') });
      }
    });

export type TournamentFormValues = z.infer<ReturnType<typeof createTournamentSchema>>;
