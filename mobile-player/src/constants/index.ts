export const MODE_VALUES = ['live', 'online'] as const;

export type Mode = (typeof MODE_VALUES)[number];
