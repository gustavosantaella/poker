import { BadRequestException } from '@nestjs/common';
import {
  BlindGrowth,
  BlindLevelItem,
  BlindStructureItem,
  BlindStructureResult,
  BuildBlindStructureParams,
} from './types/blind-structure';

/**
 * Motor de escalera de ciegas clasica.
 *
 * Empieza en 100/100 ante 100 y crece con la escalera clasica
 * (100/100, 100/200, 200/300, 300/500, 500/800, ...) donde la SB del
 * nivel es la BB del anterior. El ante es configurable (bb_ante,
 * per_player o none). La estructura termina cuando la BB supera ~5% del
 * stack promedio restante (o al fijar un numero de niveles).
 */

/** Mantissas para el ante por jugador (1, 2, 3, 5) x 10^k. */
const ANTE_MANTISSAS = [1, 2, 3, 5];

/** Campo grande por defecto cuando maxPlayers es null (jugadores ilimitados). */
const DEFAULT_PLAYERS = 45;
const MIN_LEVELS = 12;
const MAX_LEVELS = 60;

/**
 * Escalera clasica de ciegas: SB = BB del nivel anterior.
 * 100/100, 100/200, 200/300, 300/500, 500/800, 800/1600, 1600/3200, ...
 * Despues de 500/800 la ciega grande DOBLA en cada nivel.
 * Se genera programaticamente hasta cubrir MAX_LEVELS niveles.
 */
const NICE_BLIND_SEQUENCE: number[] = (() => {
  const values = [100, 200, 300, 500, 800];
  while (values.length < MAX_LEVELS) {
    values.push(values[values.length - 1] * 2);
  }
  return values;
})();

/** Ajuste del numero de niveles segun el ritmo elegido (slow = estructura mas profunda). */
const GROWTH_LEVEL_FACTOR: Record<BlindGrowth, number> = {
  slow: 1.15,
  normal: 1,
  fast: 0.85,
};

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
  return Math.round(best * 10 ** exp);
}

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

  // Cantidad de jugadores: determina el numero de niveles del torneo
  // (ilimitado usa el campo por defecto, como antes).
  const players = maxPlayers && maxPlayers >= 2 ? maxPlayers : DEFAULT_PLAYERS;

  // Niveles objetivo: escala con el campo y el ritmo elegido (mas jugadores = mas niveles).
  const baseTarget = Math.round((10 + players * 0.8) * GROWTH_LEVEL_FACTOR[growth]);
  const targetLevels = numberOfLevels
    ? Math.min(MAX_LEVELS, Math.max(1, numberOfLevels))
    : Math.min(MAX_LEVELS, Math.max(MIN_LEVELS, baseTarget));

  const items: BlindStructureItem[] = [];

  for (let level = 1; level <= targetLevels; level++) {
    const idx = level - 1;
    if (idx >= NICE_BLIND_SEQUENCE.length) break;

    const bigBlind = NICE_BLIND_SEQUENCE[idx];

    // SB = BB del nivel anterior: 100/100, 100/200, 200/300, 300/500, 500/800, ...
    const smallBlind = level === 1 ? bigBlind : NICE_BLIND_SEQUENCE[idx - 1];

    // Ante configurable como antes: bb_ante => ante = BB; per_player => ~BB/5; none => sin ante.
    const ante =
      anteMode === 'none'
        ? 0
        : anteMode === 'per_player'
          ? Math.min(toNiceAnte(Math.round(bigBlind / 5)), Math.floor(bigBlind / 2))
          : bigBlind;

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