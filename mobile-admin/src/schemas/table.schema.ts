import { z } from 'zod';

export const tableSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100),
    gameTypeId: z.coerce.number().int().min(1, 'Select a game type'),
    smallBlind: z.coerce.number().min(0, 'Must be 0 or more'),
    bigBlind: z.coerce.number().min(0, 'Must be 0 or more'),
    minBuyIn: z.coerce.number().min(0, 'Must be 0 or more'),
    maxBuyIn: z.coerce.number().min(0, 'Must be 0 or more'),
    seats: z.coerce.number().int().min(1, 'At least 1 seat').max(20),
    status: z.enum(['open', 'running', 'paused', 'closed']),
    notes: z.string().max(1000).optional(),
  })
  .refine((data) => data.bigBlind >= data.smallBlind, {
    message: 'Big blind must be greater than or equal to small blind',
    path: ['bigBlind'],
  })
  .refine((data) => data.maxBuyIn >= data.minBuyIn, {
    message: 'Max buy-in must be greater than or equal to min buy-in',
    path: ['maxBuyIn'],
  });

export type TableFormValues = z.infer<typeof tableSchema>;