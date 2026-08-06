import { z, ZodIssueCode } from 'zod';

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

export const tournamentSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100),
    gameTypeId: z.coerce.number().int().min(1, 'Select a game type'),
    startDate: z.string().min(1, 'Start date is required'),
    status: z.enum(['scheduled', 'registering', 'running', 'paused', 'completed', 'cancelled']),
    buyIn: z.coerce.number().min(0, 'Must be 0 or more'),
    fee: z.coerce.number().min(0).optional(),
    startingStack: z.coerce.number().int().min(100, 'Starting stack must be at least 100'),
    maxPlayers: optionalInt(2, 1000),
    registrationOpen: z.boolean(),
    reEntryEnabled: z.boolean(),
    maxReEntries: optionalInt(1),
    lateRegistrationEnabled: z.boolean(),
    lateRegistrationUntilLevel: optionalInt(1),
    addOnEnabled: z.boolean(),
    addOnAmount: optionalNumber(0),
    addOnStack: optionalInt(1),
    addOnUntilLevel: optionalInt(1),
    startingBigBlind: optionalInt(1),
    levelDurationMin: z.coerce.number().int().min(1, 'At least 1 minute').max(240),
    numberOfLevels: optionalInt(1, 60),
    growth: z.enum(['slow', 'normal', 'fast']),
    anteMode: z.enum(['none', 'per_player', 'bb_ante']),
    anteStartLevel: optionalInt(1),
    breakEveryLevels: z.coerce.number().int().min(0, '0 or more').max(20),
    breakDurationMin: optionalInt(0),
  })
  .superRefine((data, ctx) => {
    if (data.reEntryEnabled && (data.maxReEntries === undefined || data.maxReEntries < 1)) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        path: ['maxReEntries'],
        message: 'Max re-entries is required when re-entry is enabled',
      });
    }
    if (
      data.lateRegistrationEnabled &&
      (data.lateRegistrationUntilLevel === undefined || data.lateRegistrationUntilLevel < 1)
    ) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        path: ['lateRegistrationUntilLevel'],
        message: 'Until level is required when late registration is enabled',
      });
    }
    if (data.addOnEnabled) {
      if (data.addOnAmount === undefined || data.addOnAmount < 0) {
        ctx.addIssue({
          code: ZodIssueCode.custom,
          path: ['addOnAmount'],
          message: 'Add-on amount is required when add-on is enabled',
        });
      }
      if (data.addOnStack === undefined || data.addOnStack < 1) {
        ctx.addIssue({
          code: ZodIssueCode.custom,
          path: ['addOnStack'],
          message: 'Add-on stack is required when add-on is enabled',
        });
      }
      if (data.addOnUntilLevel === undefined || data.addOnUntilLevel < 1) {
        ctx.addIssue({
          code: ZodIssueCode.custom,
          path: ['addOnUntilLevel'],
          message: 'Until level is required when add-on is enabled',
        });
      }
    }
  });

export type TournamentFormValues = z.infer<typeof tournamentSchema>;