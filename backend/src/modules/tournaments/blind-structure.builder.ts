import { BadRequestException } from '@nestjs/common';
import {
  BlindGrowth,
  BlindLevelItem,
  BlindStructureItem,
  BlindStructureResult,
  BuildBlindStructureParams,
} from './types/blind-structure';

/**
 * Motor de escalera de ciegas estilo casino.
 *
 * La secuencia de Big Blinds replica exactamente la estructura de la imagen:
 *   Nv1: 100/100 ante 100
 *   Nv2: 100/200 ante 200
 *   Nv3: 200/300 ante 300
 *   Nv4: 200/400 ante 400   → break
 *   Nv5: 300/600 ante 600
 *   Nv6: 400/800 ante 800
 *   Nv7: 500/1000 ante 1000
 *   Nv8: 600/1200 ante 1200  → break
 *   Nv9: 1000/1500 ante 1500
 *   ...y así sucesivamente
 *
 * Reglas:
 *   - SB = BB del nivel anterior (nivel 1: SB = BB)
 *   - Ante = BB (bb_ante), BB/5 (per_player) o 0 (none)
 *   - Break cada `breakEveryLevels` niveles
 */

/**
 * Secuencia canónica de Big Blinds usada en la estructura.
 * Construida para cubrir hasta 60 niveles.
 */
const CASINO_BB_SEQUENCE: number[] = [
  // Niveles 1-4
  100, 200, 300, 400,
  // Niveles 5-8
  600, 800, 1000, 1200,
  // Niveles 9-11
  1500, 2000, 2500,
  // Niveles 12-17
  3000, 4000, 6000, 8000, 10000, 12000,
  // Niveles 18-21
  15000, 20000, 25000, 30000,
  // Niveles 22-25
  40000, 50000, 60000, 80000,
  // Niveles 26-28
  100000, 150000, 150000,
  // Niveles 29-33
  200000, 250000, 300000, 400000, 500000,
  // Niveles 34-37
  600000, 800000, 1000000, 1200000,
  // Niveles 38-40
  1600000, 2000000, 2500000,
  // Niveles 41-45 (extensión)
  3000000, 4000000, 5000000, 6000000, 8000000,
  // Niveles 46-50
  10000000, 12000000, 15000000, 20000000, 25000000,
  // Niveles 51-60
  30000000, 40000000, 50000000, 60000000, 80000000,
  100000000, 120000000, 150000000, 200000000, 250000000,
];

/** Mantissas para el ante per-player (1, 2, 3, 5) x 10^k. */
const ANTE_MANTISSAS = [1, 2, 3, 5];

/** Redondea al patrón clásico (1, 2, 3, 5) x 10^k. */
function toNiceAnte(value: number): number {
  if (value <= 0) return 0;
  const exp = Math.floor(Math.log10(value));
  const base = value / 10 ** exp;
  let best = ANTE_MANTISSAS[0];
  let bestDiff = Infinity;
  for (const m of ANTE_MANTISSAS) {
    const diff = Math.abs(base - m);
    if (diff < bestDiff) { bestDiff = diff; best = m; }
  }
  return Math.round(best * 10 ** exp);
}

/** Campo por defecto cuando maxPlayers es null. */
const DEFAULT_PLAYERS = 45;
const MIN_LEVELS = 12;
const MAX_LEVELS = 60;

/** Factor de niveles según el ritmo. */
const GROWTH_LEVEL_FACTOR: Record<BlindGrowth, number> = {
  slow: 1.15,
  normal: 1,
  fast: 0.85,
};

export function buildBlindStructure(params: BuildBlindStructureParams): BlindStructureResult {
  const {
    startingStack,
    levelDurationMin = 20,
    numberOfLevels,
    growth = 'normal',
    anteMode = 'bb_ante',
    breakEveryLevels = 4,
    breakDurationMin = 10,
    maxPlayers,
  } = params;

  if (!startingStack || startingStack <= 0) {
    throw new BadRequestException('startingStack must be a positive number');
  }

  const players = maxPlayers && maxPlayers >= 2 ? maxPlayers : DEFAULT_PLAYERS;
  const baseTarget = Math.round((10 + players * 0.8) * GROWTH_LEVEL_FACTOR[growth]);
  const targetLevels = numberOfLevels
    ? Math.min(MAX_LEVELS, Math.max(1, numberOfLevels))
    : Math.min(MAX_LEVELS, Math.max(MIN_LEVELS, baseTarget));

  const items: BlindStructureItem[] = [];

  for (let level = 1; level <= targetLevels; level++) {
    const idx = level - 1;
    if (idx >= CASINO_BB_SEQUENCE.length) break;

    const bigBlind = CASINO_BB_SEQUENCE[idx];
    // SB = BB del nivel anterior. Nivel 1: SB = BB.
    const smallBlind = level === 1 ? bigBlind : CASINO_BB_SEQUENCE[idx - 1];

    const ante =
      anteMode === 'none'
        ? 0
        : anteMode === 'per_player'
          ? Math.min(toNiceAnte(Math.round(bigBlind / 5)), Math.floor(bigBlind / 2))
          : bigBlind; // bb_ante: ante = BB

    items.push({
      type: 'level',
      level,
      smallBlind,
      bigBlind,
      ante: Math.round(ante),
      durationMin: Math.round(levelDurationMin),
    });

    const hasBreak = breakEveryLevels > 0 && level % breakEveryLevels === 0;
    if (hasBreak) {
      items.push({ type: 'break', durationMin: Math.round(breakDurationMin), afterLevel: level });
    }
  }

  const levels = items.filter((i): i is BlindLevelItem => i.type === 'level');
  const breaks = items.filter((i) => i.type === 'break');
  const estimatedDurationMin =
    levels.reduce((sum, l) => sum + l.durationMin, 0) +
    breaks.reduce((sum, br) => sum + br.durationMin, 0);

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


