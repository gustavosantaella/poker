import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createClub,
  createClubInvitation,
  fetchClub,
  fetchClubAuditLog,
  fetchClubCollaborators,
  fetchClubInvitations,
  fetchClubMembers,
  fetchClubs,
  fetchClubStats,
  fetchUsers,
  removeClubMember,
  resendClubInvitation,
  revokeClubInvitation,
  rotateClubCode,
  transferClubOwnership,
  updateClub,
  updateClubCollaborator,
  updateClubMember,
  CreateClubPayload,
} from '@/api/clubs';
import {
  createClubCashMovement,
  deleteClubCashMovement,
  fetchClubCashMovements,
  fetchClubCashPlayer,
  fetchClubCashPlayers,
  fetchClubCashSummary,
  fetchClubCashTournament,
  fetchClubCashTournaments,
  ClubCashMovementPayload,
  ClubCashQuery,
  ClubCashSettlePayload,
  registerClubCashPayouts,
  settleClubCash,
  syncClubCash,
  updateClubCashMovement,
} from '@/api/cash';
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
  fetchTableReservations,
  fetchTables,
  removeTableReservation,
  updateTable,
} from '@/api/tables';
import {
  addTournamentChip,
  createReservation,
  createTournament,
  deleteTournament,
  eliminateReservation,
  fetchPlayers,
  fetchPrizes,
  fetchReservations,
  fetchTournament,
  fetchTournamentChips,
  fetchTournaments,
  nextTournamentLevel,
  pauseTournament,
  rebuyReservation,
  removeReservation,
  removeTournamentChip,
  resumeTournament,
  standUpReservation,
  startTournament,
  updatePrizes,
  updateReservation,
  updateTournament,
} from '@/api/tournaments';
import {
  ChipPayload,
  ClubCashMethod,
  ClubCashStatus,
  ClubMemberRole,
  GameTypePayload,
  ReservationStatus,
  TablePayload,
  TournamentPayload,
} from '@/api/types';

export function useGameTypes() {
  return useQuery({ queryKey: ['game-types'], queryFn: fetchGameTypes });
}

export function useClubs() {
  return useQuery({ queryKey: ['clubs'], queryFn: fetchClubs });
}

export function useCreateClub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateClubPayload) => createClub(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['clubs'] });
    },
  });
}

export function useUpdateClub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CreateClubPayload> }) =>
      updateClub(id, payload),
    onSuccess: (club) => {
      void qc.invalidateQueries({ queryKey: ['clubs'] });
      void qc.invalidateQueries({ queryKey: ['clubs', club.id] });
      void qc.invalidateQueries({ queryKey: ['clubs', club.id, 'stats'] });
    },
  });
}

export function useClubMembers(clubId: number) {
  return useQuery({
    queryKey: ['clubs', clubId, 'members'],
    queryFn: () => fetchClubMembers(clubId),
    enabled: clubId > 0,
  });
}

export function useUpdateClubMember(clubId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, status }: { memberId: number; status: 'accepted' | 'rejected' }) =>
      updateClubMember(clubId, memberId, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['clubs', clubId, 'members'] });
      void qc.invalidateQueries({ queryKey: ['clubs'] });
    },
  });
}

export function useRemoveClubMember(clubId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: number) => removeClubMember(clubId, memberId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['clubs', clubId, 'members'] });
      void qc.invalidateQueries({ queryKey: ['clubs', clubId, 'collaborators'] });
      void qc.invalidateQueries({ queryKey: ['clubs', clubId, 'stats'] });
      void qc.invalidateQueries({ queryKey: ['clubs'] });
    },
  });
}

// ---- Dashboard del club ----

export function useClub(clubId: number) {
  return useQuery({
    queryKey: ['clubs', clubId],
    queryFn: () => fetchClub(clubId),
    enabled: clubId > 0,
  });
}

export function useClubStats(clubId: number) {
  return useQuery({
    queryKey: ['clubs', clubId, 'stats'],
    queryFn: () => fetchClubStats(clubId),
    enabled: clubId > 0,
  });
}

export function useClubCollaborators(clubId: number) {
  return useQuery({
    queryKey: ['clubs', clubId, 'collaborators'],
    queryFn: () => fetchClubCollaborators(clubId),
    enabled: clubId > 0,
  });
}

/** Cambia los permisos de un colaborador (admin, operador, cajero). */
export function useUpdateClubCollaborator(clubId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: number; role: ClubMemberRole }) =>
      updateClubCollaborator(clubId, memberId, role),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['clubs', clubId, 'collaborators'] });
      void qc.invalidateQueries({ queryKey: ['clubs', clubId, 'stats'] });
    },
  });
}

export function useClubInvitations(clubId: number) {
  return useQuery({
    queryKey: ['clubs', clubId, 'invitations'],
    queryFn: () => fetchClubInvitations(clubId),
    enabled: clubId > 0,
  });
}

/** Invita a un colaborador por correo con unos permisos. */
export function useCreateClubInvitation(clubId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: ClubMemberRole }) =>
      createClubInvitation(clubId, email, role),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['clubs', clubId, 'invitations'] });
      void qc.invalidateQueries({ queryKey: ['clubs', clubId, 'collaborators'] });
      void qc.invalidateQueries({ queryKey: ['clubs', clubId, 'stats'] });
    },
  });
}

export function useRevokeClubInvitation(clubId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: number) => revokeClubInvitation(clubId, invitationId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['clubs', clubId, 'invitations'] });
      void qc.invalidateQueries({ queryKey: ['clubs', clubId, 'stats'] });
      void qc.invalidateQueries({ queryKey: ['clubs', clubId, 'audit'] });
    },
  });
}

/** Reenvía una invitación caducada o sin correo entregado (rota el código). */
export function useResendClubInvitation(clubId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: number) => resendClubInvitation(clubId, invitationId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['clubs', clubId, 'invitations'] });
      void qc.invalidateQueries({ queryKey: ['clubs', clubId, 'collaborators'] });
      void qc.invalidateQueries({ queryKey: ['clubs', clubId, 'stats'] });
      void qc.invalidateQueries({ queryKey: ['clubs', clubId, 'audit'] });
    },
  });
}

// ---- Auditoría, propiedad y código del club ----

/** Historial de acciones sensibles del club (solo el admin del club). */
export function useClubAuditLog(clubId: number, limit = 50) {
  return useQuery({
    queryKey: ['clubs', clubId, 'audit', limit],
    queryFn: () => fetchClubAuditLog(clubId, limit),
    enabled: clubId > 0,
  });
}

/** Traspasa la propiedad del club a otro usuario (el anterior queda como operador). */
export function useTransferClubOwnership(clubId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => transferClubOwnership(clubId, userId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['clubs', clubId] });
      void qc.invalidateQueries({ queryKey: ['clubs', clubId, 'collaborators'] });
      void qc.invalidateQueries({ queryKey: ['clubs', clubId, 'members'] });
      void qc.invalidateQueries({ queryKey: ['clubs', clubId, 'stats'] });
      void qc.invalidateQueries({ queryKey: ['clubs', clubId, 'audit'] });
      void qc.invalidateQueries({ queryKey: ['clubs'] });
    },
  });
}

/** Regenera el código de invitación del club (invalida el anterior). */
export function useRotateClubCode(clubId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => rotateClubCode(clubId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['clubs', clubId] });
      void qc.invalidateQueries({ queryKey: ['clubs', clubId, 'audit'] });
    },
  });
}

export function useUsers() {
  return useQuery({ queryKey: ['users'], queryFn: fetchUsers });
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
    retry: false,
  });
}

export function useTableReservations(tableId: number) {
  return useQuery({
    queryKey: ['table-reservations', tableId],
    queryFn: () => fetchTableReservations(tableId),
    enabled: tableId > 0,
  });
}

export function useRemoveTableReservation(tableId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reservationId: number) => removeTableReservation(tableId, reservationId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['table-reservations', tableId] });
    },
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
    retry: false,
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

// ---- Estado en vivo del torneo ----

export function useStartTournament() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => startTournament(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
}

export function usePauseTournament() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => pauseTournament(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
}

export function useResumeTournament() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => resumeTournament(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
}

export function useNextTournamentLevel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => nextTournamentLevel(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
}

// ---- Reservas ----

export function useReservations(tournamentId: number) {
  return useQuery({
    queryKey: ['reservations', tournamentId],
    queryFn: () => fetchReservations(tournamentId),
    enabled: tournamentId > 0,
  });
}

export function useCreateReservation(tournamentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => createReservation(tournamentId, userId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['reservations', tournamentId] });
      void qc.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
}

export function useUpdateReservation(tournamentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      stack,
      tableNumber,
      seatNumber,
    }: {
      id: number;
      status: ReservationStatus;
      stack?: number;
      tableNumber?: number;
      seatNumber?: number;
    }) => updateReservation(tournamentId, id, status, stack, tableNumber, seatNumber),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['reservations', tournamentId] });
      void qc.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
}

export function useRemoveReservation(tournamentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => removeReservation(tournamentId, id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['reservations', tournamentId] });
      void qc.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
}

export function useRebuyReservation(tournamentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      stack,
      tableNumber,
      seatNumber,
    }: {
      id: number;
      stack?: number;
      tableNumber?: number;
      seatNumber?: number;
    }) => rebuyReservation(tournamentId, id, stack, tableNumber, seatNumber),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['reservations', tournamentId] });
      void qc.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
}

export function useStandUpReservation(tournamentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reservationId: number) => standUpReservation(tournamentId, reservationId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['reservations', tournamentId] });
      void qc.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
}

/** Eliminar jugador del torneo: deja de contar en "en juego" pero conserva su reserva. */
export function useEliminateReservation(tournamentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reservationId: number) => eliminateReservation(tournamentId, reservationId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['reservations', tournamentId] });
      void qc.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
}

// ---- Caja y recaudación del club ----

/** Resumen de recaudación (dinero que entra y sale, pendiente, comisión...). */
export function useClubCashSummary(clubId: number, query: ClubCashQuery = {}) {
  return useQuery({
    queryKey: ['clubs', clubId, 'cash', 'summary', query],
    queryFn: () => fetchClubCashSummary(clubId, query),
    enabled: clubId > 0,
  });
}

/** Recaudación por torneo del periodo. */
export function useClubCashTournaments(clubId: number, query: ClubCashQuery = {}) {
  return useQuery({
    queryKey: ['clubs', clubId, 'cash', 'tournaments', query],
    queryFn: () => fetchClubCashTournaments(clubId, query),
    enabled: clubId > 0,
  });
}

/** Detalle de recaudación de un torneo (jugadores, cobros y premios). */
export function useClubCashTournament(clubId: number, tournamentId: number) {
  return useQuery({
    queryKey: ['clubs', clubId, 'cash', 'tournament', tournamentId],
    queryFn: () => fetchClubCashTournament(clubId, tournamentId),
    enabled: clubId > 0 && tournamentId > 0,
  });
}

/** Ranking de jugadores por dinero invertido. */
export function useClubCashPlayers(clubId: number, query: ClubCashQuery = {}) {
  return useQuery({
    queryKey: ['clubs', clubId, 'cash', 'players', query],
    queryFn: () => fetchClubCashPlayers(clubId, query),
    enabled: clubId > 0,
  });
}

/** Detalle de un jugador: total invertido y desglose por torneo. */
export function useClubCashPlayer(clubId: number, userId: number, query: ClubCashQuery = {}) {
  return useQuery({
    queryKey: ['clubs', clubId, 'cash', 'player', userId, query],
    queryFn: () => fetchClubCashPlayer(clubId, userId, query),
    enabled: clubId > 0 && userId > 0,
  });
}

/** Libro de caja paginado. */
export function useClubCashMovements(clubId: number, query: ClubCashQuery = {}) {
  return useQuery({
    queryKey: ['clubs', clubId, 'cash', 'movements', query],
    queryFn: () => fetchClubCashMovements(clubId, query),
    enabled: clubId > 0,
  });
}

/** Invalida todas las consultas de caja del club (tras cobrar, pagar o anotar). */
function useInvalidateClubCash(clubId: number) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['clubs', clubId, 'cash'] });
    void qc.invalidateQueries({ queryKey: ['clubs', clubId, 'stats'] });
    void qc.invalidateQueries({ queryKey: ['clubs', clubId, 'audit'] });
  };
}

/** Sincroniza las reservas con la caja del club. */
export function useSyncClubCash(clubId: number) {
  const invalidate = useInvalidateClubCash(clubId);
  return useMutation({
    mutationFn: (payload: { tournamentId?: number; method?: ClubCashMethod } = {}) =>
      syncClubCash(clubId, payload),
    onSuccess: invalidate,
  });
}

/** Cobra o devuelve a pendiente movimientos de caja. */
export function useSettleClubCash(clubId: number) {
  const invalidate = useInvalidateClubCash(clubId);
  return useMutation({
    mutationFn: (payload: ClubCashSettlePayload) => settleClubCash(clubId, payload),
    onSuccess: invalidate,
  });
}

/** Registra un movimiento manual de caja. */
export function useCreateClubCashMovement(clubId: number) {
  const invalidate = useInvalidateClubCash(clubId);
  return useMutation({
    mutationFn: (payload: ClubCashMovementPayload) => createClubCashMovement(clubId, payload),
    onSuccess: invalidate,
  });
}

/** Edita un movimiento de caja (estado, forma de pago, nota...). */
export function useUpdateClubCashMovement(clubId: number) {
  const invalidate = useInvalidateClubCash(clubId);
  return useMutation({
    mutationFn: ({
      movementId,
      payload,
    }: {
      movementId: number;
      payload: { status?: ClubCashStatus; method?: ClubCashMethod; note?: string };
    }) => updateClubCashMovement(clubId, movementId, payload),
    onSuccess: invalidate,
  });
}

/** Elimina un movimiento de caja (solo el admin del club). */
export function useDeleteClubCashMovement(clubId: number) {
  const invalidate = useInvalidateClubCash(clubId);
  return useMutation({
    mutationFn: (movementId: number) => deleteClubCashMovement(clubId, movementId),
    onSuccess: invalidate,
  });
}

/** Registra los premios pagados de un torneo. */
export function useRegisterClubCashPayouts(clubId: number, tournamentId: number) {
  const invalidate = useInvalidateClubCash(clubId);
  return useMutation({
    mutationFn: (payouts: { userId: number; place: number; amount: number }[]) =>
      registerClubCashPayouts(clubId, tournamentId, payouts),
    onSuccess: invalidate,
  });
}

// ---- Fichas del torneo ----

export function useTournamentChips(tournamentId: number) {
  return useQuery({
    queryKey: ['tournament-chips', tournamentId],
    queryFn: () => fetchTournamentChips(tournamentId),
    enabled: tournamentId > 0,
  });
}

export function useAddTournamentChip(tournamentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ chipId, discardLevel }: { chipId: number; discardLevel?: number }) =>
      addTournamentChip(tournamentId, chipId, discardLevel),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tournament-chips', tournamentId] });
    },
  });
}

export function useRemoveTournamentChip(tournamentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => removeTournamentChip(tournamentId, id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tournament-chips', tournamentId] });
    },
  });
}

// ---- Premios ----

export function usePrizes(tournamentId: number) {
  return useQuery({
    queryKey: ['prizes', tournamentId],
    queryFn: () => fetchPrizes(tournamentId),
    enabled: tournamentId > 0,
  });
}

export function useUpdatePrizes(tournamentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prizes: { place: number; amount: number }[]) => updatePrizes(tournamentId, prizes),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['prizes', tournamentId] });
    },
  });
}

// ---- Jugadores ----

export function usePlayers() {
  return useQuery({ queryKey: ['players'], queryFn: fetchPlayers });
}