import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createChip,
  deleteChip,
  fetchChips,
  updateChip,
} from '@/api/chips';
import { fetchDashboardStats } from '@/api/dashboard';
import {
  createGameType,
  deleteGameType,
  fetchAllGameTypes,
  fetchGameTypes,
  updateGameType,
} from '@/api/gameTypes';
import {
  createTable,
  deleteTable,
  fetchTable,
  fetchTables,
  updateTable,
} from '@/api/tables';
import {
  createTournament,
  deleteTournament,
  fetchTournament,
  fetchTournaments,
  updateTournament,
} from '@/api/tournaments';
import {
  ChipPayload,
  GameTypePayload,
  TablePayload,
  TournamentPayload,
} from '@/api/types';

export function useGameTypes() {
  return useQuery({ queryKey: ['game-types'], queryFn: fetchGameTypes });
}

export function useAllGameTypes() {
  return useQuery({ queryKey: ['game-types', 'all'], queryFn: fetchAllGameTypes });
}

export function useChips() {
  return useQuery({ queryKey: ['chips'], queryFn: fetchChips });
}

export function useTables() {
  return useQuery({ queryKey: ['tables'], queryFn: () => fetchTables() });
}

export function useTable(id?: number) {
  return useQuery({
    queryKey: ['tables', id],
    queryFn: () => fetchTable(id as number),
    enabled: !!id,
  });
}

export function useTournaments() {
  return useQuery({ queryKey: ['tournaments'], queryFn: fetchTournaments });
}

export function useTournament(id: number) {
  return useQuery({
    queryKey: ['tournaments', id],
    queryFn: () => fetchTournament(id),
    enabled: id > 0,
  });
}

export function useDashboardStats() {
  return useQuery({ queryKey: ['dashboard', 'stats'], queryFn: fetchDashboardStats });
}

// ---- Mutations: chips ----

export function useCreateChip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ChipPayload) => createChip(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['chips'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateChip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ChipPayload }) => updateChip(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['chips'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteChip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteChip(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['chips'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// ---- Mutations: tables ----

export function useCreateTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TablePayload) => createTable(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tables'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<TablePayload> }) => updateTable(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tables'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTable(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tables'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// ---- Mutations: tournaments ----

export function useCreateTournament() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TournamentPayload) => createTournament(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tournaments'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateTournament() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<TournamentPayload> }) => updateTournament(id, payload),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ['tournaments'] });
      void qc.invalidateQueries({ queryKey: ['tournaments', vars.id] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteTournament() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTournament(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tournaments'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// ---- Mutations: game types ----

export function useCreateGameType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GameTypePayload) => createGameType(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['game-types'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateGameType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: GameTypePayload }) => updateGameType(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['game-types'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteGameType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteGameType(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['game-types'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}