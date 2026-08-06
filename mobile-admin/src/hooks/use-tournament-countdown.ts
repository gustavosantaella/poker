import { useEffect, useMemo, useState } from 'react';
import { BlindStructureItem, Tournament } from '@/api/types';
import { useNextTournamentLevel } from './use-queries';

export interface TournamentCountdown {
  currentItem: BlindStructureItem | null;
  currentIndex: number | null;
  isRunning: boolean;
  remainingSec: number;
  time: string;
  advancing: boolean;
}

function formatTime(totalSec: number): string {
  const safe = Math.max(0, totalSec);
  const minutes = Math.floor(safe / 60);
  const seconds = Math.floor(safe % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Cuenta regresiva del torneo en vivo: calcula el tiempo restante del item
 * actual (nivel o descanso) y avanza automaticamente al siguiente cuando
 * se agota, respetando la duracion definida para cada item.
 */
export function useTournamentCountdown(
  tournament: Tournament | undefined,
  autoAdvance = true,
): TournamentCountdown {
  const nextLevel = useNextTournamentLevel();
  const [remainingSec, setRemainingSec] = useState(0);

  const items = tournament?.blindStructure ?? [];
  const currentIndex = tournament?.currentLevel ?? null;
  const currentItem = currentIndex != null ? (items[currentIndex] ?? null) : null;
  const isRunning = tournament?.status === 'running';

  useEffect(() => {
    if (!isRunning || !tournament?.levelStartedAt || !currentItem) {
      setRemainingSec(0);
      return;
    }
    const startedAt = new Date(tournament.levelStartedAt).getTime();
    const durationMs = (currentItem.durationMin ?? 0) * 60_000;
    const update = () => {
      const remaining = Math.ceil((startedAt + durationMs - Date.now()) / 1000);
      setRemainingSec(Math.max(0, remaining));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isRunning, tournament?.levelStartedAt, currentItem, currentIndex]);

  // Avanza automaticamente cuando el tiempo del item actual se agota.
  useEffect(() => {
    if (!autoAdvance) return;
    if (isRunning && currentItem && remainingSec <= 0 && tournament && currentIndex != null) {
      const timer = setTimeout(() => {
        void nextLevel.mutateAsync(tournament.id).catch(() => undefined);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [autoAdvance, isRunning, currentItem, remainingSec, tournament, currentIndex, nextLevel]);

  return useMemo(
    () => ({
      currentItem,
      currentIndex,
      isRunning,
      remainingSec,
      time: formatTime(remainingSec),
      advancing: nextLevel.isPending,
    }),
    [currentItem, currentIndex, isRunning, remainingSec, nextLevel.isPending],
  );
}