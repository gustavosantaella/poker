import { z } from 'zod';

export const gameTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(80),
  description: z.string().max(500).optional(),
  holeCards: z.coerce.number().int().min(1, 'At least 1 hole card').max(10),
  communityCards: z.coerce.number().int().min(0).max(10),
  isActive: z.boolean(),
});

export type GameTypeFormValues = z.infer<typeof gameTypeSchema>;