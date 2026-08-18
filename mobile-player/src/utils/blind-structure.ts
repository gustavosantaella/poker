import { BlindStructureItem, BlindStructureSummary } from '@/api/types';

/** Calculates the summary of a blind structure. */
export function summarizeStructure(
  items: BlindStructureItem[] | null | undefined,
): BlindStructureSummary | null {
  if (!items || items.length === 0) return null;
  const levels = items.filter((i) => i.type === 'level');
  const breaks = items.filter((i) => i.type === 'break');
  const estimatedDurationMin =
    levels.reduce((sum, l) => sum + (l.durationMin ?? 0), 0) +
    breaks.reduce((sum, b) => sum + (b.durationMin ?? 0), 0);
  return {
    levelCount: levels.length,
    breakCount: breaks.length,
    estimatedDurationMin,
    finalLevel: (levels[levels.length - 1] ?? null) as BlindStructureSummary['finalLevel'],
  };
}
