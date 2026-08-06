import { BadRequestException } from '@nestjs/common';
import {
  BlindGrowth,
  BlindLevelItem,
  BlindStructureItem,
  BlindStructureResult,
  BuildBlindStructureParams,
} from './types/blind-structure';

/**
 * Motor automatico de escalera de ciegas.
 *
 * A partir de los datos del formulario (stack inicial, tiempo por nivel,
 * crecimiento, modo de ante, breaks...) genera una estructura de niveles
 * profesional con valores redondeados al patron clasico (25/50, 50/100,
 * 75/150, 100/200, 150/300, 200/400, 300/600, ...).
 */

const NICE_MANTISSAS = [1, 1.2, 1.5, 2, 3, 4, 5, 6, 8];
const ANTE_MANTISSAS = [1, 2, 3, 5];

const GROWTH_CYCLES: Record<BlindGrowth, number[]> = {
  slow: [1.25, 1.2, 1.25, 1.33, 1.2],
  normal: [1.5, 1.25, 1.5, 1.33, 1.25],
  fast: [2, 1.5, 1.66, 1.5],
};

/** Redondea un valor al numero clasico mas cercano (1, 1.2, 1.5, 2, 3, 4, 5, 6, 8) x 10^k. */
function toNice(value: number): number {
  if (value <= 0) return 0;
  const exp = Math.floor(Math.log10(value));
  const base = value / 10 ** exp;
  let best = NICE_MANTISSAS[NICE_MANTISSAS.length - 1];
  let bestDiff = Infinity;
  for (const m of NICE_MANTISSAS) {
    const diff = Math.abs(base - m);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = m;
    }
  }
  let result = best * 10 ** exp;
  const next = 10 ** (exp + 1);
  if (next - value < value - result) result = next;
  return result;
}

/** Redondea el ante al patron clasico (1, 2, 3, 5) x 10^k. */
function toNiceAnte(value: number): number {
  if (value <= 0) return 0;
  const exp = Math.floor(Math.log10(value));
  const base = value / 10 ** exp;
  let best = ANTE_MANTISSAS[0];
  let bestDiff = Infinity;
  for (const m of ANTE_MANTISSAS) {
    const diff = Math.abs(base - m);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = m;
    }
  }
  return best * 10 ** exp;
}

export function buildBlindStructure(params: BuildBlindStructureParams): BlindStructureResult {
  const {
    startingStack,
    startingBigBlind,
    levelDurationMin = 20,
    numberOfLevels,
    growth = 'normal',
    anteMode = 'bb_ante',
    anteStartLevel,
    breakEveryLevels = 4,
    breakDurationMin = 10,
  } = params;

  if (!startingStack || startingStack <= 0) {
    throw new BadRequestException('startingStack must be a positive number');
  }

  const cycles = GROWTH_CYCLES[growth];
  const maxLevels = 60;
  const minLevels = 8;
  const endBB = startingStack / 20; // regla estandar: el torneo termina cuando la BB ~ 5% del stack
  let bb = toNice(startingBigBlind ?? startingStack / 100);
  if (bb <= 0) bb = 1;
  let sb = Math.floor(bb / 2);

  const items: BlindStructureItem[] = [];
  let level = 1;

  const shouldStop = (current: number): boolean => {
    if (numberOfLevels) return current >= numberOfLevels;
    return current >= minLevels && bb >= endBB;
  };

  while (level <= maxLevels) {
    if (level > 1) {
      const factor = cycles[(level - 2) % cycles.length];
      bb = toNice(bb * factor);
      sb = Math.floor(bb / 2);
    }

    const anteActive = anteMode !== 'none' && (anteStartLevel ? level >= anteStartLevel : bb >= 200);
    const ante = anteActive
      ? anteMode === 'bb_ante'
        ? bb
        : anteMode === 'per_player'
          ? Math.min(toNiceAnte(Math.round(bb / 5)), Math.floor(bb / 2))
          : 0
      : 0;

    const currentLevel: BlindLevelItem = {
      type: 'level',
      level,
      smallBlind: sb,
      bigBlind: bb,
      ante,
      durationMin: levelDurationMin,
    };
    items.push(currentLevel);

    if (shouldStop(level)) break;

    const hasBreak = breakEveryLevels > 0 && level % breakEveryLevels === 0;
    if (hasBreak) {
      items.push({ type: 'break', durationMin: breakDurationMin, afterLevel: level });
    }
    level += 1;
  }

  const levels = items.filter((i): i is BlindLevelItem => i.type === 'level');
  const breaks = items.filter((i) => i.type === 'break');
  const estimatedDurationMin =
    levels.reduce((sum, l) => sum + l.durationMin, 0) + breaks.reduce((sum, br) => sum + br.durationMin, 0);

  return {
    items,
    summary: {
      levelCount: levels.length,
      breakCount: breaks.length,
      estimatedDurationMin,
      finalLevel: levels[levels.length - 1] ?? null,
    },
  };
}
