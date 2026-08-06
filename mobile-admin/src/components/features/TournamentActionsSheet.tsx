import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Tournament } from '@/api/types';
import { BlindStructurePreview } from '@/components/features/BlindStructurePreview';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppSelect } from '@/components/ui/AppSelect';
import { AppText } from '@/components/ui/AppText';
import { AppTextField } from '@/components/ui/AppTextField';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ListItem } from '@/components/ui/ListItem';
import { LoadingView } from '@/components/ui/LoadingView';
import {
  useAddTournamentChip,
  useChips,
  useCreateReservation,
  useDeleteTournament,
  usePauseTournament,
  usePlayers,
  usePrizes,
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
    section === 'main'
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
        {section === 'main' ? (
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
          <ReservationsView tournamentId={tournament.id} onError={setError} />
        ) : section === 'chips' ? (
          <ChipsView tournamentId={tournament.id} onError={setError} />
        ) : section === 'players' ? (
          <PlayersView tournamentId={tournament.id} />
        ) : (
          <PrizesView tournament={tournament} onError={setError} />
        )}

        {error ? (
          <AppText variant="caption" color={colors.danger} style={styles.error}>
            {error}
          </AppText>
        ) : null}
      </BottomSheet>

      <ConfirmModal
        visible={confirmDelete}
        title={t('tournament.deleteTournament')}
        message={t('tournament.deleteConfirm')}
        confirmLabel={t('common.delete')}
        destructive
        loading={remove.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
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

function ReservationsView({ tournamentId, onError }: { tournamentId: number; onError: (m: string) => void }) {
  const { t } = useI18n();
  const { data: reservations, isLoading } = useReservations(tournamentId);
  const { data: players } = usePlayers();
  const create = useCreateReservation(tournamentId);
  const update = useUpdateReservation(tournamentId);
  const remove = useRemoveReservation(tournamentId);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const playerOptions = (players ?? []).map((p) => ({ label: p.name, value: String(p.id) }));

  const statusLabel = (status: string) =>
    status === 'accepted'
      ? t('tournament.reservationAccepted')
      : status === 'rejected'
        ? t('tournament.reservationRejected')
        : t('tournament.reservationPending');

  const handleAdd = async () => {
    if (!selectedPlayer) return;
    try {
      await create.mutateAsync(Number(selectedPlayer));
      setSelectedPlayer(null);
    } catch (e) {
      onError(getErrorMessage(e));
    }
  };

  return (
    <View>
      <AppSelect
        label={t('tournament.selectPlayer')}
        placeholder={t('tournament.selectPlayer')}
        value={selectedPlayer}
        options={playerOptions}
        onSelect={setSelectedPlayer}
      />
      <AppButton title={t('tournament.addReservation')} size="sm" onPress={handleAdd} loading={create.isPending} />

      {isLoading ? (
        <LoadingView />
      ) : (reservations ?? []).length === 0 ? (
        <AppText variant="caption" center style={styles.empty}>
          {t('tournament.noReservations')}
        </AppText>
      ) : (
        (reservations ?? []).map((r) => (
          <AppCard key={r.id} style={styles.rowCard}>
            <View style={styles.rowInfo}>
              <AppText variant="body" weight="medium">
                {r.user?.name ?? `#${r.userId}`}
              </AppText>
              <AppText variant="caption">
                {r.user?.email ?? ''} • {statusLabel(r.status)}
              </AppText>
            </View>
            <View style={styles.rowActions}>
              {r.status !== 'accepted' ? (
                <AppButton
                  title={t('tournament.reservationAccept')}
                  size="sm"
                  variant="success"
                  onPress={() => update.mutateAsync({ id: r.id, status: 'accepted' })}
                />
              ) : null}
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
function PlayersView({ tournamentId }: { tournamentId: number }) {
  const { t } = useI18n();
  const { data: reservations, isLoading } = useReservations(tournamentId);
  const accepted = (reservations ?? []).filter((r) => r.status === 'accepted');
  return (
    <View>
      {isLoading ? (
        <LoadingView />
      ) : accepted.length === 0 ? (
        <AppText variant="caption" center style={styles.empty}>
          {t('tournament.noPlayers')}
        </AppText>
      ) : (
        accepted.map((r) => (
          <ListItem key={r.id} title={r.user?.name ?? `#${r.userId}`} subtitle={r.user?.email ?? ''} icon="person" />
        ))
      )}
    </View>
  );
}

/** Distribucion por defecto de premios a partir de la pre-config del formulario. */
function buildDefaultPrizes(tournament: Tournament): { place: number; amount: number }[] {
  const total = tournament.guaranteedPrize ?? 0;
  if (total <= 0) return [];
  let places = tournament.paidPlacesValue ?? 0;
  if (tournament.paidPlacesType === 'percent' && places > 0) {
    const players = tournament.maxPlayers ?? 45;
    places = Math.max(1, Math.round((players * places) / 100));
  }
  places = Math.min(places, 50);
  if (places <= 0) return [];
  if (places === 1) return [{ place: 1, amount: total }];
  const weights = Array.from({ length: places }, (_, i) => places - i);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const result: { place: number; amount: number }[] = [];
  let assigned = 0;
  weights.forEach((w, i) => {
    const place = i + 1;
    const amount = i === places - 1 ? total - assigned : Math.round((total * w) / weightSum);
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

  const source = prizes && prizes.length > 0 ? prizes : buildDefaultPrizes(tournament);

  useEffect(() => {
    if (!isLoading && Object.keys(amounts).length === 0) {
      const next: Record<string, string> = {};
      source.forEach((prize) => {
        next[prize.place] = String(prize.amount);
      });
      setAmounts(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, prizes]);

  const handleSave = async () => {
    try {
      const list = Object.keys(amounts)
        .map((place) => ({ place: Number(place), amount: Number(amounts[place] ?? "0") || 0 }))
        .sort((a, b) => a.place - b.place);
      await update.mutateAsync(list);
    } catch (e) {
      onError(getErrorMessage(e));
    }
  };

  return (
    <View>
      {isLoading ? (
        <LoadingView />
      ) : source.length === 0 ? (
        <AppText variant="caption" center style={styles.empty}>
          {t('tournament.noPrizes')}
        </AppText>
      ) : (
        source.map((prize) => (
          <AppTextField
            key={prize.place}
            label={t('tournament.prizePlace', { place: prize.place })}
            keyboardType="decimal-pad"
            value={amounts[prize.place] ?? String(prize.amount)}
            onChangeText={(v) => setAmounts((prev) => ({ ...prev, [prize.place]: v }))}
          />
        ))
      )}
      {source.length > 0 ? (
        <AppButton
          title={t('tournament.savePrizes')}
          onPress={handleSave}
          loading={update.isPending}
          style={styles.saveBtn}
        />
      ) : null}
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
  saveBtn: { marginTop: 12 },
});