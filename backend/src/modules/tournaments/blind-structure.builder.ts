import { BadRequestException } from '@nestjs/common';
import {
  BlindGrowth,
  BlindLevelItem,
  BlindStructureItem,
  BlindStructureResult,
  BuildBlindStructureParams,
} from './types/blind-structure';

/**
 * Motor automatico de escalera de ciegas profesional.
 *
 * Calcula la estructura en funcion de la configuracion real del torneo:
 * - stack inicial y cantidad de jugadores (fichas en juego),
 * - add-ons y re-entries (fichas extra estimadas),
 * - ritmo (slow/normal/fast), modo de ante y descansos.
 *
 * El torneo termina cuando la ciega grande llega a ~5% del stack promedio
 * con 3 jugadores restantes, y el numero de niveles escala con el tamano
 * del campo para producir estructuras profundas y realistas.
 */

const NICE_MANTISSAS = [1, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2, 2.2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9];
const ANTE_MANTISSAS = [1, 2, 3, 5];

/** Campo grande por defecto cuando maxPlayers es null (jugadores ilimitados). */
const DEFAULT_PLAYERS = 45;
const MIN_LEVELS = 12;
const MAX_LEVELS = 60;

/** Ajuste del numero de niveles segun el ritmo elegido (slow = estructura mas profunda). */
const GROWTH_LEVEL_FACTOR: Record<BlindGrowth, number> = {
  slow: 1.15,
  normal: 1,
  fast: 0.85,
};

/** Perfiles de rugosidad: variacion alrededor del factor medio por nivel. */
const GROWTH_SHAPES: Record<BlindGrowth, number[]> = {
  slow: [1, 1.02, 1, 1.03, 0.97, 1.05, 0.98, 1.02],
  normal: [1.02, 0.98, 1.06, 0.97, 1.04, 0.98, 1.05, 0.97],
  fast: [1.08, 0.97, 1.12, 0.96, 1.1, 0.97, 1.06, 0.98],
};

/** Redondea al numero clasico mas cercano (1, 1.1, 1.2, ... 9) x 10^k. */
function toNice(value: number): number {
  if (value <= 0) return 0;
  const exp = Math.floor(Math.log10(value));
  const base = value / 10 ** exp;
  let best = NICE_MANTISSAS[NICE_MANTISSAS.length - 1];
  let bestDiff = Infinity;
  for (const m of NICE_MANTISSAS) {
    const diff = Math.abs(base - m);
    if (diff < bestDiff - 1e-9) {
      bestDiff = diff;
      best = m;
    }
  }
  let result = best * 10 ** exp;
  const next = 10 ** (exp + 1);
  if (next - value < value - result) result = next;
  // Las ciegas siempre son numeros enteros (evita 110.00000000000001 por precision float).
  return Math.round(result);
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
  return Math.round(best * 10 ** exp);
}

function geometricMean(values: number[]): number {
  return Math.exp(values.reduce((sum, v) => sum + Math.log(v), 0) / values.length);
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
    maxPlayers,
    addOnEnabled,
    addOnStack,
    reEntryEnabled,
    maxReEntries,
  } = params;

  if (!startingStack || startingStack <= 0) {
    throw new BadRequestException('startingStack must be a positive number');
  }

  // Cantidad de jugadores: determina las fichas en juego y la profundidad del torneo.
  const players = maxPlayers && maxPlayers >= 2 ? maxPlayers : DEFAULT_PLAYERS;

  // Fichas totales estimadas en juego: stack inicial + add-ons + re-entries.
  let totalChips = startingStack * players;
  if (addOnEnabled && addOnStack && addOnStack > 0) {
    totalChips += addOnStack * players * 0.6; // ~60% de los jugadores toma add-on
  }
  if (reEntryEnabled && maxReEntries !== undefined && maxReEntries !== null && maxReEntries >= 0) {
    const reEntryCount = maxReEntries === 0 ? 2 : Math.min(maxReEntries, 3); // 0 = ilimitado hasta el cierre de registro
    totalChips += startingStack * players * 0.25 * reEntryCount;
  }

  // BB final: ~5% del stack promedio cuando quedan 3 jugadores.
  const endBB = Math.max(totalChips / 60, startingStack / 20);

  // Niveles objetivo: escala con el campo y el ritmo elegido (mas jugadores = mas niveles).
  const baseTarget = Math.round((10 + players * 0.8) * GROWTH_LEVEL_FACTOR[growth]);
  const targetLevels = numberOfLevels
    ? Math.min(MAX_LEVELS, Math.max(1, numberOfLevels))
    : Math.min(MAX_LEVELS, Math.max(MIN_LEVELS, baseTarget));

  let bb = toNice(startingBigBlind ?? startingStack / 100);
  if (bb <= 0) bb = 1;
  let sb = Math.floor(bb / 2);

  // Factor medio por nivel para pasar de la BB inicial a la BB final en targetLevels niveles.
  const shape = GROWTH_SHAPES[growth];
  const shapeMean = geometricMean(shape);
  const neededFactor = targetLevels > 1 ? Math.pow(endBB / bb, 1 / (targetLevels - 1)) : 1;

  const items: BlindStructureItem[] = [];
  let previousBb = 0;

  for (let level = 1; level <= targetLevels; level++) {
    if (level > 1) {
      const shapeFactor = shape[(level - 2) % shape.length] / shapeMean;
      let next = toNice(bb * neededFactor * shapeFactor);
      // Garantiza progresion monotona (sin estancarse en el mismo valor).
      if (next <= previousBb) next = toNice(previousBb * 1.05);
      bb = next;
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

    items.push({
      type: 'level',
      level,
      smallBlind: sb,
      bigBlind: bb,
      ante: Math.round(ante),
      durationMin: Math.round(levelDurationMin),
    });

    const hasBreak = breakEveryLevels > 0 && level % breakEveryLevels === 0;
    if (hasBreak) {
      items.push({ type: 'break', durationMin: Math.round(breakDurationMin), afterLevel: level });
    }
    previousBb = bb;
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