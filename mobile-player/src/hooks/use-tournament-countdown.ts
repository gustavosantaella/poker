import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BlindStructureItem, Tournament } from '@/api/types';

export interface TournamentCountdown {
  currentItem: BlindStructureItem | null;
  currentIndex: number | null;
  isRunning: boolean;
  remainingSec: number;
  time: string;
  elapsedLevelSec: number;
  elapsedLevel: string;
  elapsedTotalSec: number;
  elapsedTotal: string;
}

function formatTime(totalSec: number): string {
  const safe = Math.max(0, totalSec);
  const minutes = Math.floor(safe / 60);
  const seconds = Math.floor(safe % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatDuration(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function useTournamentCountdown(
  tournament: Tournament | undefined,
): TournamentCountdown {
  const qc = useQueryClient();
  const [remainingSec, setRemainingSec] = useState(0);
  const [elapsedLevelSec, setElapsedLevelSec] = useState(0);

  const items = tournament?.blindStructure ?? [];
  const currentIndex = tournament?.currentLevel ?? null;
  const currentItem = currentIndex != null ? (items[currentIndex] ?? null) : null;
  const isRunning = tournament?.status === 'running';
  const startedAtMs = useMemo(
    () => (tournament?.startedAt ? new Date(tournament.startedAt).getTime() : null),
    [tournament?.startedAt],
  );
  const levelStartedAtMs = useMemo(
    () => (tournament?.levelStartedAt ? new Date(tournament.levelStartedAt).getTime() : null),
    [tournament?.levelStartedAt],
  );

  useEffect(() => {
    if (!isRunning || !levelStartedAtMs || !currentItem) {
      setRemainingSec(0);
      return;
    }
    const durationMs = (currentItem.durationMin ?? 0) * 60_000;
    const update = () => {
      const now = Date.now();
      const rem = Math.max(0, Math.ceil((levelStartedAtMs + durationMs - now) / 1000));
      setRemainingSec(rem);
      setElapsedLevelSec(Math.max(0, Math.floor((now - levelStartedAtMs) / 1000)));

      // If timer hits exactly 0, trigger a refetch of the tournament to get the next level
      // assuming the admin app or server is advancing it.
      if (rem === 0 && tournament?.id) {
         void qc.invalidateQueries({ queryKey: ['tournaments', tournament.id] });
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isRunning, levelStartedAtMs, currentItem, currentIndex, tournament?.id, qc]);

  const elapsedTotalSec = useMemo(() => {
    if (tournament?.status === 'completed') {
      return items.reduce((sum, item) => sum + (item.durationMin ?? 0) * 60, 0);
    }
    if (currentIndex == null) return 0;
    const completedSec = items
      .slice(0, currentIndex)
      .reduce((sum, item) => sum + (item.durationMin ?? 0) * 60, 0);
    return completedSec + elapsedLevelSec;
  }, [items, currentIndex, elapsedLevelSec, tournament?.status]);

  return useMemo(
    () => ({
      currentItem,
      currentIndex,
      isRunning,
      remainingSec,
      time: formatTime(remainingSec),
      elapsedLevelSec,
      elapsedLevel: formatTime(elapsedLevelSec),
      elapsedTotalSec,
      elapsedTotal: formatDuration(elapsedTotalSec),
    }),
    [
      currentItem,
      currentIndex,
      isRunning,
      remainingSec,
      elapsedLevelSec,
      elapsedTotalSec,
    ],
  );
}
