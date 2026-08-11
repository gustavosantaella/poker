import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Tournament, TournamentReservation } from '@/api/types';
import { BlindStructurePreview } from '@/components/features/BlindStructurePreview';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppModal } from '@/components/ui/AppModal';
import { AppSelect } from '@/components/ui/AppSelect';
import { AppText } from '@/components/ui/AppText';
import { AppTextField } from '@/components/ui/AppTextField';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ListItem } from '@/components/ui/ListItem';
import { LoadingView } from '@/components/ui/LoadingView';
import {
  useAddTournamentChip,
  useChips,
  useDeleteTournament,
  usePauseTournament,
  usePrizes,
  useRebuyReservation,
  useRemoveReservation,
  useRemoveTournamentChip,
  useReservations,
  useResumeTournament,
  useStartTournament,
  useTournamentChips,
  useUpdatePrizes,
  useUpdateReservation,
} from '@/hooks/use-queries';
import { useTournamentCountdown } from '@/hooks/use-tournament-countdown';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import { summarizeStructure } from '@/utils/blind-structure';
import { getErrorMessage } from '@/utils/error';
import { formatNumber } from '@/utils/format';

type Section = 'main' | 'structure' | 'reservations' | 'chips' | 'players' | 'prizes';

/** Sheet de acciones de un torneo con sub-vistas (estructura, reservas, fichas, jugadores, premios). */
export function TournamentActionsSheet({
  tournament,
  visible,
  onClose,
}: {
  tournament: Tournament;
  visible: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const { colors } = useTheme();
  const [section, setSection] = useState<Section>('main');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useStartTournament();
  const pause = usePauseTournament();
  const resume = useResumeTournament();
  const remove = useDeleteTournament();
  const countdown = useTournamentCountdown(tournament, false);

  const handleClose = () => {
    setSection('main');
    setConfirmDelete(false);
    setError(null);
    onClose();
  };

  const handleStartPause = async () => {
    setError(null);
    try {
      if (tournament.status === 'running') {
        await pause.mutateAsync(tournament.id);
      } else if (tournament.status === 'paused') {
        await resume.mutateAsync(tournament.id);
      } else {
        await start.mutateAsync(tournament.id);
      }
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const handleDelete = async () => {
    setError(null);
    try {
      await remove.mutateAsync(tournament.id);
      setConfirmDelete(false);
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const title =
    confirmDelete
      ? t('tournament.deleteTournament')
      : section === 'main'
        ? t('tournament.actions')
        : section === 'structure'
          ? t('tournament.viewStructure')
          : section === 'reservations'
            ? t('tournament.reservations')
            : section === 'chips'
              ? t('chips.title')
              : section === 'players'
                ? t('tournament.players')
                : t('tournament.prizes');

  return (
    <>
      <BottomSheet visible={visible} title={title} onClose={handleClose}>
        {section !== 'main' ? (
          <Pressable onPress={() => setSection('main')} style={styles.backRow} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={colors.primary} />
            <AppText variant="body" weight="semibold" color={colors.primary}>
              {t('common.back')}
            </AppText>
          </Pressable>
        ) : null}
        {confirmDelete ? (
          <View style={styles.deleteConfirm}>
            <AppText variant="body" color={colors.textSecondary} style={styles.deleteMsg}>
              {t('tournament.deleteConfirm')}
            </AppText>
            <View style={styles.deleteActions}>
              <AppButton
                title={t('common.cancel')}
                variant="secondary"
                style={styles.deleteBtn}
                onPress={() => setConfirmDelete(false)}
                disabled={remove.isPending}
              />
              <AppButton
                title={t('common.delete')}
                variant="danger"
                style={styles.deleteBtn}
                onPress={handleDelete}
                loading={remove.isPending}
              />
            </View>
          </View>
        ) : section === 'main' ? (
          <MainOptions
            tournament={tournament}
            onStartPause={handleStartPause}
            onOpen={(s) => setSection(s)}
            onEdit={() => {
              handleClose();
              router.push(`/tournament/${tournament.id}`);
            }}
            onDelete={() => setConfirmDelete(true)}
          />
        ) : section === 'structure' ? (
          <StructureView tournament={tournament} countdown={countdown} />
        ) : section === 'reservations' ? (
          <ReservationsView
          tournamentId={tournament.id}
          startingStack={tournament.startingStack}
          tableCount={tournament.tableCount ?? 1}
          onError={setError}
        />
        ) : section === 'chips' ? (
          <ChipsView tournamentId={tournament.id} onError={setError} />
        ) : section === 'players' ? (
          <PlayersView tournament={tournament} onError={setError} />
        ) : (
          <PrizesView tournament={tournament} onError={setError} />
        )}

        {error ? (
          <AppText variant="caption" color={colors.danger} style={styles.error}>
            {error}
          </AppText>
        ) : null}
      </BottomSheet>
    </>
  );
}

function MainOptions({
  tournament,
  onStartPause,
  onOpen,
  onEdit,
  onDelete,
}: {
  tournament: Tournament;
  onStartPause: () => void;
  onOpen: (s: Section) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const running = tournament.status === 'running';
  const paused = tournament.status === 'paused';
  const startLabel = running ? t('tournament.pause') : paused ? t('tournament.resume') : t('tournament.start');
  const startIcon = running ? 'pause' : 'play';

  return (
    <View style={styles.list}>
      <ListItem
        title={startLabel}
        icon={startIcon}
        chevron
        onPress={onStartPause}
      />
      <ListItem title={t('tournament.viewStructure')} icon="list" chevron onPress={() => onOpen('structure')} />
      <ListItem title={t('tournament.editStructure')} icon="create-outline" chevron onPress={onEdit} />
      <ListItem title={t('tournament.reservations')} icon="people-outline" chevron onPress={() => onOpen('reservations')} />
      <ListItem title={t('chips.title')} icon="albums-outline" chevron onPress={() => onOpen('chips')} />
      <ListItem title={t('tournament.players')} icon="person-outline" chevron onPress={() => onOpen('players')} />
      <ListItem title={t('tournament.prizes')} icon="trophy-outline" chevron onPress={() => onOpen('prizes')} />
      <ListItem
        title={t('tournament.deleteTournament')}
        icon="trash-outline"
        iconColor={colors.danger}
        chevron
        onPress={onDelete}
      />
    </View>
  );
}

function StructureView({
  tournament,
  countdown,
}: {
  tournament: Tournament;
  countdown: ReturnType<typeof useTournamentCountdown>;
}) {
  const { t } = useI18n();
  const current = countdown.currentItem;
  const currentLabel = current
    ? current.type === 'break'
      ? t('tournament.breakShort')
      : t('tournament.levelShort', { level: current.level })
    : null;

  return (
    <View>
      {currentLabel ? (
        <AppText variant="caption" weight="semibold" style={styles.currentLine}>
          ▶ {t('tournament.currentItem', { label: currentLabel, time: countdown.time })}
        </AppText>
      ) : null}
      <BlindStructurePreview
        items={tournament.blindStructure}
        summary={summarizeStructure(tournament.blindStructure)}
        lateRegistrationLevel={
          tournament.lateRegistrationEnabled && tournament.lateRegistrationUntilLevel != null
            ? tournament.lateRegistrationUntilLevel
            : null
        }
        addOnLevel={
          tournament.addOnEnabled && tournament.addOnUntilLevel != null ? tournament.addOnUntilLevel : null
        }
        reEntryUnlimited={tournament.reEntryEnabled && tournament.maxReEntries === 0}
        currentIndex={tournament.currentLevel}
      />
    </View>
  );
}

function ReservationsView({
  tournamentId,
  startingStack,
  tableCount,
  onError,
}: {
  tournamentId: number;
  startingStack: number;
  tableCount: number;
  onError: (m: string) => void;
}) {
  const { t } = useI18n();
  const { data: reservations, isLoading } = useReservations(tournamentId);
  const update = useUpdateReservation(tournamentId);
  const remove = useRemoveReservation(tournamentId);
  const [stackTarget, setStackTarget] = useState<TournamentReservation | null>(null);
  const [stackInput, setStackInput] = useState('');
  const [stackError, setStackError] = useState<string | null>(null);
  const [assignTable, setAssignTable] = useState<string | null>(null);
  const [assignSeat, setAssignSeat] = useState<string | null>(null);

  // El listado de reservas solo muestra a los que AUN no estan jugando
  // (pendientes/rechazados); los aceptados se gestionan en el listado de jugadores.
  const pendingReservations = (reservations ?? []).filter((r) => r.status !== 'accepted');

  const tables = Math.max(1, tableCount || 1);
  const tableOptions = Array.from({ length: tables }, (_, i) => ({
    label: `${t('tournament.tableLabel')} ${i + 1}`,
    value: String(i + 1),
  }));
  const seatOptions = Array.from({ length: 9 }, (_, i) => ({
    label: `${t('tournament.seatLabel')} ${i + 1}`,
    value: String(i + 1),
  }));

  const statusLabel = (status: string) =>
    status === 'accepted'
      ? t('tournament.reservationAccepted')
      : status === 'rejected'
        ? t('tournament.reservationRejected')
        : t('tournament.reservationPending');

  /** Stack efectivo: el configurado por el admin o, por defecto, el del torneo. */
  const effectiveStack = (r: TournamentReservation) => r.stack ?? startingStack;

  const openStackModal = (reservation: TournamentReservation) => {
    setStackTarget(reservation);
    setStackInput(String(effectiveStack(reservation)));
    setStackError(null);
    setAssignTable(reservation.tableNumber != null ? String(reservation.tableNumber) : null);
    setAssignSeat(reservation.seatNumber != null ? String(reservation.seatNumber) : null);
  };

  const closeStackModal = () => {
    setStackTarget(null);
    setStackInput('');
    setStackError(null);
    setAssignTable(null);
    setAssignSeat(null);
  };

  const handleAccept = async () => {
    if (!stackTarget) return;
    const stack = Number(stackInput.trim());
    if (!Number.isInteger(stack) || stack < 1) {
      setStackError(t('tournament.invalidStack'));
      return;
    }
    try {
      await update.mutateAsync({
        id: stackTarget.id,
        status: 'accepted',
        stack,
        ...(assignTable != null && assignSeat != null
          ? { tableNumber: Number(assignTable), seatNumber: Number(assignSeat) }
          : {}),
      });
      closeStackModal();
    } catch (e) {
      setStackError(getErrorMessage(e));
    }
  };

  const editingAccepted = stackTarget?.status === 'accepted';

  return (
    <View>
      {isLoading ? (
        <LoadingView />
      ) : pendingReservations.length === 0 ? (
        <AppText variant="caption" center style={styles.empty}>
          {t('tournament.noReservations')}
        </AppText>
      ) : (
        pendingReservations.map((r) => (
          <AppCard key={r.id} style={styles.rowCard}>
            <View style={styles.rowInfo}>
              <AppText variant="body" weight="medium">
                {r.user?.name ?? `#${r.userId}`}
              </AppText>
              <AppText variant="caption">
                {r.user?.email ?? ''} • {statusLabel(r.status)}
                {r.status === 'accepted'
                  ? ` • ${t('tournament.stackLabel')}: ${formatNumber(effectiveStack(r))} • ${t('tournament.rebuyCount', { count: r.reEntries ?? 0 })} • ${t('tournament.assignedTo', { table: r.tableNumber ?? '-', seat: r.seatNumber ?? '-' })}`
                  : ''}
              </AppText>
            </View>
            <View style={styles.rowActions}>
              {r.status === 'accepted' ? (
                <AppButton title="" size="sm" variant="ghost" icon="pencil-outline" onPress={() => openStackModal(r)} />
              ) : (
                <AppButton
                  title={t('tournament.reservationAccept')}
                  size="sm"
                  variant="success"
                  onPress={() => openStackModal(r)}
                />
              )}
              {r.status !== 'rejected' ? (
                <AppButton
                  title={t('tournament.reservationReject')}
                  size="sm"
                  variant="danger"
                  onPress={() => update.mutateAsync({ id: r.id, status: 'rejected' })}
                />
              ) : null}
              <AppButton title="" size="sm" variant="ghost" icon="trash-outline" onPress={() => remove.mutateAsync(r.id)} />
            </View>
          </AppCard>
        ))
      )}

      <AppModal
        visible={stackTarget != null}
        title={editingAccepted ? t('tournament.editStack') : t('tournament.acceptPlayer')}
        onClose={closeStackModal}
        footer={
          <>
            <AppButton
              title={t('common.cancel')}
              variant="secondary"
              style={{ flex: 1 }}
              onPress={closeStackModal}
              disabled={update.isPending}
            />
            <AppButton
              title={editingAccepted ? t('common.save') : t('tournament.reservationAccept')}
              variant="success"
              style={{ flex: 1 }}
              onPress={handleAccept}
              loading={update.isPending}
            />
          </>
        }
      >
        {stackTarget ? (
          <View>
            <AppText variant="body" weight="semibold" style={styles.modalPlayer}>
              {stackTarget.user?.name ?? `#${stackTarget.userId}`}
            </AppText>
            <AppTextField
              label={t('tournament.stackLabel')}
              keyboardType="number-pad"
              value={stackInput}
              onChangeText={setStackInput}
              helper={t('tournament.stackDefaultHelper', { stack: formatNumber(startingStack) })}
              error={stackError ?? undefined}
            />
            <View style={styles.assignRow}>
              <View style={styles.assignCol}>
                <AppSelect
                  label={t('tournament.tableLabel')}
                  placeholder={t('tournament.autoAssign')}
                  value={assignTable}
                  options={tableOptions}
                  onSelect={setAssignTable}
                />
              </View>
              <View style={styles.assignCol}>
                <AppSelect
                  label={t('tournament.seatLabel')}
                  placeholder={t('tournament.autoAssign')}
                  value={assignSeat}
                  options={seatOptions}
                  onSelect={setAssignSeat}
                />
              </View>
            </View>
          </View>
        ) : null}
      </AppModal>
    </View>
  );
}

function ChipsView({ tournamentId, onError }: { tournamentId: number; onError: (m: string) => void }) {
  const { t } = useI18n();
  const { data: chips } = useChips();
  const { data: tournamentChips, isLoading } = useTournamentChips(tournamentId);
  const add = useAddTournamentChip(tournamentId);
  const remove = useRemoveTournamentChip(tournamentId);
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const [discardLevel, setDiscardLevel] = useState('');

  const allOptions = (chips?.items ?? []).map((c) => ({
    label: `${c.color} (${formatNumber(c.value)})`,
    value: String(c.id),
  }));
  const availableOptions = allOptions.filter(
    (o) => !(tournamentChips ?? []).some((tc) => tc.chipId === Number(o.value)),
  );

  const handleAdd = async () => {
    if (!selectedChip) return;
    try {
      await add.mutateAsync({
        chipId: Number(selectedChip),
        discardLevel: discardLevel.trim() !== '' ? Number(discardLevel) : undefined,
      });
      setSelectedChip(null);
      setDiscardLevel('');
    } catch (e) {
      onError(getErrorMessage(e));
    }
  };

  return (
    <View>
      <AppSelect
        label={t('tournament.selectChip')}
        placeholder={t('tournament.selectChip')}
        value={selectedChip}
        options={availableOptions}
        onSelect={setSelectedChip}
      />
      <AppTextField
        label={t('tournament.discardLevel')}
        keyboardType="number-pad"
        value={discardLevel}
        onChangeText={setDiscardLevel}
      />
      <AppButton title={t('tournament.addChip')} size="sm" onPress={handleAdd} loading={add.isPending} />

      {isLoading ? (
        <LoadingView />
      ) : (tournamentChips ?? []).length === 0 ? (
        <AppText variant="caption" center style={styles.empty}>
          {t('tournament.noChips')}
        </AppText>
      ) : (
        (tournamentChips ?? []).map((tc) => (
          <AppCard key={tc.id} style={styles.rowCard}>
            <View style={styles.rowInfo}>
              <AppText variant="body" weight="medium">
                {tc.chip?.color ?? `#${tc.chipId}`}
              </AppText>
              <AppText variant="caption">
                {formatNumber(tc.chip?.value ?? 0)} •{' '}
                {tc.discardLevel != null
                  ? t('tournament.levelShort', { level: tc.discardLevel })
                  : t('common.optional')}
              </AppText>
            </View>
            <AppButton title="" size="sm" variant="ghost" icon="trash-outline" onPress={() => remove.mutateAsync(tc.id)} />
          </AppCard>
        ))
      )}
    </View>
  );
}
function PlayersView({ tournament, onError }: { tournament: Tournament; onError: (m: string) => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { data: reservations, isLoading } = useReservations(tournament.id);
  const remove = useRemoveReservation(tournament.id);
  const rebuy = useRebuyReservation(tournament.id);
  const update = useUpdateReservation(tournament.id);
  const [deleteTarget, setDeleteTarget] = useState<TournamentReservation | null>(null);
  const [rebuyTarget, setRebuyTarget] = useState<TournamentReservation | null>(null);
  const [rebuyStackInput, setRebuyStackInput] = useState('');
  const [rebuyError, setRebuyError] = useState<string | null>(null);
  const [rebuyTable, setRebuyTable] = useState<string | null>(null);
  const [rebuySeat, setRebuySeat] = useState<string | null>(null);
  const [seatTarget, setSeatTarget] = useState<TournamentReservation | null>(null);
  const [seatStackInput, setSeatStackInput] = useState('');
  const [seatTable, setSeatTable] = useState<string | null>(null);
  const [seatSeat, setSeatSeat] = useState<string | null>(null);
  const [seatError, setSeatError] = useState<string | null>(null);

  const accepted = (reservations ?? []).filter((r) => r.status === 'accepted');

  const rebuyTables = Math.max(1, tournament.tableCount ?? 1);
  const rebuyTableOptions = Array.from({ length: rebuyTables }, (_, i) => ({
    label: `${t('tournament.tableLabel')} ${i + 1}`,
    value: String(i + 1),
  }));
  const rebuySeatOptions = Array.from({ length: 9 }, (_, i) => ({
    label: `${t('tournament.seatLabel')} ${i + 1}`,
    value: String(i + 1),
  }));

  /** Rebuy deshabilitado si el torneo no permite re-entradas o si se alcanzo el maximo por jugador. */
  const rebuyDisabled = (r: TournamentReservation) =>
    !tournament.reEntryEnabled ||
    (tournament.maxReEntries !== null && tournament.maxReEntries !== 0 && r.reEntries >= tournament.maxReEntries);

  const openRebuyModal = (r: TournamentReservation) => {
    setRebuyTarget(r);
    setRebuyStackInput(String(tournament.startingStack));
    setRebuyError(null);
    setRebuyTable(r.tableNumber != null ? String(r.tableNumber) : null);
    setRebuySeat(r.seatNumber != null ? String(r.seatNumber) : null);
  };

  const closeRebuyModal = () => {
    setRebuyTarget(null);
    setRebuyStackInput('');
    setRebuyError(null);
    setRebuyTable(null);
    setRebuySeat(null);
  };

  const handleRebuy = async () => {
    if (!rebuyTarget) return;
    const stack = Number(rebuyStackInput.trim());
    if (!Number.isInteger(stack) || stack < 1) {
      setRebuyError(t('tournament.invalidStack'));
      return;
    }
    try {
      await rebuy.mutateAsync({
        id: rebuyTarget.id,
        stack,
        ...(rebuyTable != null && rebuySeat != null
          ? { tableNumber: Number(rebuyTable), seatNumber: Number(rebuySeat) }
          : {}),
      });
      closeRebuyModal();
    } catch (e) {
      setRebuyError(getErrorMessage(e));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (e) {
      onError(getErrorMessage(e));
    }
  };

  /** Editar mesa/asiento (y stack) de un jugador aceptado. */
  const openSeatModal = (r: TournamentReservation) => {
    setSeatTarget(r);
    setSeatStackInput(String(r.stack ?? tournament.startingStack));
    setSeatTable(r.tableNumber != null ? String(r.tableNumber) : null);
    setSeatSeat(r.seatNumber != null ? String(r.seatNumber) : null);
    setSeatError(null);
  };

  const closeSeatModal = () => {
    setSeatTarget(null);
    setSeatStackInput('');
    setSeatTable(null);
    setSeatSeat(null);
    setSeatError(null);
  };

  const handleSaveSeat = async () => {
    if (!seatTarget) return;
    const stack = Number(seatStackInput.trim());
    if (!Number.isInteger(stack) || stack < 1) {
      setSeatError(t('tournament.invalidStack'));
      return;
    }
    try {
      await update.mutateAsync({
        id: seatTarget.id,
        status: 'accepted',
        stack,
        ...(seatTable != null && seatSeat != null
          ? { tableNumber: Number(seatTable), seatNumber: Number(seatSeat) }
          : {}),
      });
      closeSeatModal();
    } catch (e) {
      setSeatError(getErrorMessage(e));
    }
  };

  return (
    <View>
      {isLoading ? (
        <LoadingView />
      ) : deleteTarget ? (
        <View style={styles.deleteConfirm}>
          <AppText variant="body" color={colors.textSecondary} style={styles.deleteMsg}>
            {t('tournament.deletePlayerConfirm', {
              name: deleteTarget.user?.name ?? `#${deleteTarget.userId}`,
            })}
          </AppText>
          <View style={styles.deleteActions}>
            <AppButton
              title={t('common.cancel')}
              variant="secondary"
              style={styles.deleteBtn}
              onPress={() => setDeleteTarget(null)}
              disabled={remove.isPending}
            />
            <AppButton
              title={t('common.delete')}
              variant="danger"
              style={styles.deleteBtn}
              onPress={handleDelete}
              loading={remove.isPending}
            />
          </View>
        </View>
      ) : accepted.length === 0 ? (
        <AppText variant="caption" center style={styles.empty}>
          {t('tournament.noPlayers')}
        </AppText>
      ) : (
        accepted.map((r) => (
          <ListItem
            key={r.id}
            title={r.user?.name ?? `#${r.userId}`}
            subtitle={`${r.user?.email ?? ''} • ${t('tournament.stackLabel')}: ${formatNumber(r.stack ?? tournament.startingStack)} • ${t('tournament.rebuyCount', { count: r.reEntries ?? 0 })} • ${t('tournament.assignedTo', { table: r.tableNumber ?? '-', seat: r.seatNumber ?? '-' })}`}
            icon="person"
            right={
              <View style={styles.rowActions}>
                <AppButton
                  title=""
                  size="sm"
                  variant="ghost"
                  icon="pencil-outline"
                  onPress={() => openSeatModal(r)}
                />
                {tournament.reEntryEnabled ? (
                  <AppButton
                    title={t('tournament.rebuy')}
                    size="sm"
                    variant="ghost"
                    disabled={rebuyDisabled(r)}
                    onPress={() => openRebuyModal(r)}
                  />
                ) : null}
                <AppButton
                  title=""
                  size="sm"
                  variant="ghost"
                  icon="trash-outline"
                  onPress={() => setDeleteTarget(r)}
                />
              </View>
            }
          />
        ))
      )}

      <AppModal
        visible={rebuyTarget != null}
        title={t('tournament.rebuyTitle')}
        onClose={closeRebuyModal}
        footer={
          <>
            <AppButton
              title={t('common.cancel')}
              variant="secondary"
              style={{ flex: 1 }}
              onPress={closeRebuyModal}
              disabled={rebuy.isPending}
            />
            <AppButton
              title={t('tournament.rebuy')}
              variant="success"
              style={{ flex: 1 }}
              onPress={handleRebuy}
              loading={rebuy.isPending}
            />
          </>
        }
      >
        {rebuyTarget ? (
          <View>
            <AppText variant="body" weight="semibold" style={styles.modalPlayer}>
              {rebuyTarget.user?.name ?? `#${rebuyTarget.userId}`}
            </AppText>
            <AppTextField
              label={t('tournament.stackLabel')}
              keyboardType="number-pad"
              value={rebuyStackInput}
              onChangeText={setRebuyStackInput}
              helper={t('tournament.stackDefaultHelper', { stack: formatNumber(tournament.startingStack) })}
              error={rebuyError ?? undefined}
            />
            <View style={styles.assignRow}>
              <View style={styles.assignCol}>
                <AppSelect
                  label={t('tournament.tableLabel')}
                  placeholder={t('tournament.autoAssign')}
                  value={rebuyTable}
                  options={rebuyTableOptions}
                  onSelect={setRebuyTable}
                />
              </View>
              <View style={styles.assignCol}>
                <AppSelect
                  label={t('tournament.seatLabel')}
                  placeholder={t('tournament.autoAssign')}
                  value={rebuySeat}
                  options={rebuySeatOptions}
                  onSelect={setRebuySeat}
                />
              </View>
            </View>
          </View>
        ) : null}
      </AppModal>

      <AppModal
        visible={seatTarget != null}
        title={t('tournament.editSeat')}
        onClose={closeSeatModal}
        footer={
          <>
            <AppButton
              title={t('common.cancel')}
              variant="secondary"
              style={{ flex: 1 }}
              onPress={closeSeatModal}
              disabled={update.isPending}
            />
            <AppButton
              title={t('common.save')}
              variant="primary"
              style={{ flex: 1 }}
              onPress={handleSaveSeat}
              loading={update.isPending}
            />
          </>
        }
      >
        {seatTarget ? (
          <View>
            <AppText variant="body" weight="semibold" style={styles.modalPlayer}>
              {seatTarget.user?.name ?? `#${seatTarget.userId}`}
            </AppText>
            <AppTextField
              label={t('tournament.stackLabel')}
              keyboardType="number-pad"
              value={seatStackInput}
              onChangeText={setSeatStackInput}
              helper={t('tournament.stackDefaultHelper', { stack: formatNumber(tournament.startingStack) })}
              error={seatError ?? undefined}
            />
            <View style={styles.assignRow}>
              <View style={styles.assignCol}>
                <AppSelect
                  label={t('tournament.tableLabel')}
                  placeholder={t('tournament.autoAssign')}
                  value={seatTable}
                  options={rebuyTableOptions}
                  onSelect={setSeatTable}
                />
              </View>
              <View style={styles.assignCol}>
                <AppSelect
                  label={t('tournament.seatLabel')}
                  placeholder={t('tournament.autoAssign')}
                  value={seatSeat}
                  options={rebuySeatOptions}
                  onSelect={setSeatSeat}
                />
              </View>
            </View>
          </View>
        ) : null}
      </AppModal>
    </View>
  );
}

/** Cantidad de puestos pagados segun la configuracion del torneo (% del campo de jugadores o cantidad fija). */
function getPaidPlacesCount(tournament: Tournament): number {
  const value = tournament.paidPlacesValue ?? 0;
  if (tournament.paidPlacesType === 'percent' && value > 0) {
    const players = tournament.maxPlayers ?? 45;
    return Math.min(Math.max(Math.round((players * value) / 100), 1), 50);
  }
  return Math.min(Math.max(value, 0), 50);
}

/** Distribucion proporcional por defecto del premio garantizado entre los puestos pagados. */
function buildDefaultPrizes(placeCount: number, total: number): { place: number; amount: number }[] {
  if (total <= 0 || placeCount <= 0) return [];
  if (placeCount === 1) return [{ place: 1, amount: total }];
  const weights = Array.from({ length: placeCount }, (_, i) => placeCount - i);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const result: { place: number; amount: number }[] = [];
  let assigned = 0;
  weights.forEach((w, i) => {
    const place = i + 1;
    const amount = i === placeCount - 1 ? total - assigned : Math.round((total * w) / weightSum);
    result.push({ place, amount });
    assigned += amount;
  });
  return result;
}

function PrizesView({ tournament, onError }: { tournament: Tournament; onError: (m: string) => void }) {
  const { t } = useI18n();
  const { data: prizes, isLoading } = usePrizes(tournament.id);
  const update = useUpdatePrizes(tournament.id);
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  // La cantidad de puestos pagados SIEMPRE sale de la configuracion del torneo (% o fijo).
  const placeCount = getPaidPlacesCount(tournament);
  const defaultByPlace = new Map(
    buildDefaultPrizes(placeCount, tournament.guaranteedPrize ?? 0).map((p) => [p.place, p.amount]),
  );
  const savedByPlace = new Map((prizes ?? []).map((p) => [p.place, p.amount]));

  useEffect(() => {
    if (!isLoading && Object.keys(amounts).length === 0 && placeCount > 0) {
      const next: Record<string, string> = {};
      for (let place = 1; place <= placeCount; place++) {
        next[place] = String(savedByPlace.get(place) ?? defaultByPlace.get(place) ?? '');
      }
      setAmounts(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, prizes, placeCount]);

  const placesInfo =
    tournament.paidPlacesType === 'percent'
      ? t('tournament.paidPlacesInfoPercent', {
          count: placeCount,
          percent: tournament.paidPlacesValue ?? 0,
          players: tournament.maxPlayers ?? 45,
        })
      : t('tournament.paidPlacesInfoFixed', { count: placeCount });

  const handleSave = async () => {
    try {
      const list = Array.from({ length: placeCount }, (_, i) => ({
        place: i + 1,
        amount: Number(amounts[i + 1] ?? '0') || 0,
      }));
      await update.mutateAsync(list);
    } catch (e) {
      onError(getErrorMessage(e));
    }
  };

  return (
    <View>
      {isLoading ? (
        <LoadingView />
      ) : placeCount === 0 ? (
        <AppText variant="caption" center style={styles.empty}>
          {t('tournament.noPrizes')}
        </AppText>
      ) : (
        <>
          <AppText variant="caption" weight="semibold" style={styles.prizesInfo}>
            {placesInfo}
          </AppText>
          {Array.from({ length: placeCount }, (_, i) => {
            const place = i + 1;
            return (
              <AppTextField
                key={place}
                label={t('tournament.prizePlace', { place })}
                keyboardType="decimal-pad"
                value={amounts[place] ?? String(defaultByPlace.get(place) ?? '')}
                onChangeText={(v) => setAmounts((prev) => ({ ...prev, [place]: v }))}
              />
            );
          })}
          <AppButton
            title={t('tournament.savePrizes')}
            onPress={handleSave}
            loading={update.isPending}
            style={styles.saveBtn}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 4 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12, alignSelf: 'flex-start' },
  error: { marginTop: 12 },
  empty: { marginTop: 16 },
  currentLine: { marginBottom: 10 },
  rowCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  rowInfo: { flex: 1 },
  rowActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  assignRow: { flexDirection: 'row', gap: 8 },
  assignCol: { flex: 1 },
  saveBtn: { marginTop: 12 },
  modalPlayer: { marginBottom: 12 },
  prizesInfo: { marginBottom: 12 },
  deleteConfirm: { paddingVertical: 8 },
  deleteMsg: { marginBottom: 16 },
  deleteActions: { flexDirection: 'row', gap: 8 },
  deleteBtn: { flex: 1 },
});