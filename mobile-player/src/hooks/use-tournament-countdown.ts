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
  // Inicio efectivo del nivel actual: usa levelStartedAt si está disponible;
  // si no, lo deriva de startedAt + duraciones de los items previos.
  const levelStartMs = useMemo(() => {
    if (!tournament) return null;
    if (tournament.levelStartedAt) {
      const ts = new Date(tournament.levelStartedAt).getTime();
      if (!Number.isNaN(ts)) return ts;
    }
    if (tournament.startedAt) {
      const base = new Date(tournament.startedAt).getTime();
      if (Number.isNaN(base)) return null;
      const idx = tournament.currentLevel ?? 0;
      let acc = base;
      for (let i = 0; i < idx; i++) {
        acc += (tournament.blindStructure?.[i]?.durationMin ?? 0) * 60_000;
      }
      return acc;
    }
    return null;
  }, [tournament]);

  useEffect(() => {
    if (!isRunning || !levelStartMs || !currentItem) {
      setRemainingSec(0);
      return;
    }
    const durationMs = (currentItem.durationMin ?? 0) * 60_000;
    const update = () => {
      const now = Date.now();
      const rem = Math.max(0, Math.ceil((levelStartMs + durationMs - now) / 1000));
      setRemainingSec(rem);
      setElapsedLevelSec(Math.max(0, Math.floor((now - levelStartMs) / 1000)));

      // Al llegar a 0, refrescar el torneo para tomar el siguiente nivel (el
      // backend lo avanza automáticamente). Evita loops si ya no quedan items.
      if (rem === 0 && tournament?.id && currentIndex != null && currentIndex < items.length - 1) {
        void qc.invalidateQueries({ queryKey: ['tournaments', tournament.id] });
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isRunning, levelStartMs, currentItem, currentIndex, tournament?.id, qc, items.length]);

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
