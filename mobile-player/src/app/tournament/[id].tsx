import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BlindLevelItem, BlindBreakItem, TournamentChip } from '@/api/types';
import { createTournamentReservation } from '@/api/tournaments';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { BlindStructurePreview } from '@/components/features/BlindStructurePreview';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingView } from '@/components/ui/LoadingView';
import { useAuth } from '@/hooks/use-auth';
import { useDeleteTournamentReservation, useTournament, useTournamentChips, useTournamentPrizes, useTournamentReservations } from '@/hooks/use-queries';
import { useReserve } from '@/hooks/use-reserve';
import { useTournamentCountdown } from '@/hooks/use-tournament-countdown';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import { spacing } from '@/theme/spacing';
import { getErrorMessage } from '@/utils/error';
import { summarizeStructure } from '@/utils/blind-structure';
import { formatChips, formatCurrency, formatDateTime, formatDuration, formatNumber } from '@/utils/format';
import { ReservationState } from '@/utils/reservation';

type Tab = 'info' | 'structure' | 'prizes' | 'chips';

export default function TournamentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tournamentId = Number(id);
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const { data: tournament, isLoading, isError } = useTournament(tournamentId);
  const { data: reservations } = useTournamentReservations(tournamentId);
  const { data: prizes } = useTournamentPrizes(tournamentId);
  const { data: tournamentChips } = useTournamentChips(tournamentId);

  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const deleteReservation = useDeleteTournamentReservation(tournamentId);
  const countdown = useTournamentCountdown(tournament);

  const current = countdown.currentItem;
  const myReservation = (reservations ?? []).find((r) => r.userId === user?.id);
  const alreadyReserved = myReservation !== undefined;
  const isPlaying = myReservation?.status === 'accepted';

  const reserve = useReserve((target, userId) => createTournamentReservation(target.id, userId));

  const state: ReservationState =
    alreadyReserved
      ? isPlaying
        ? 'playing'
        : 'reserved'
      : reserve.reservedIds.has(tournamentId)
        ? 'reserved'
        : null;

  if (isLoading) {
    return (
      <AppScreen>
        <AppHeader title={t('tournaments.title')} showBack onBack={() => router.back()} />
        <LoadingView />
      </AppScreen>
    );
  }

  if (isError || !tournament) {
    return (
      <AppScreen>
        <AppHeader title={t('tournament.notFound')} showBack onBack={() => router.back()} />
        <EmptyState
          icon="trophy-outline"
          title={t('tournament.notFound')}
          subtitle={t('tournament.notFoundDesc')}
          actionLabel={t('common.back')}
          onAction={() => router.back()}
        />
      </AppScreen>
    );
  }

  const online = tournament.mode === 'online';
  const reEntryLabel = tournament.reEntryEnabled
    ? tournament.maxReEntries === 0
      ? t('tournament.unlimited')
      : `× ${tournament.maxReEntries ?? 0}`
    : '—';
  const addOnLabel = tournament.addOnEnabled
    ? `${formatCurrency(tournament.addOnAmount ?? 0)} (+${formatNumber(tournament.addOnStack ?? 0)})`
    : '—';  const tabs: { key: Tab; label: string }[] = [
    { key: 'info', label: t('tournament.info') },
    { key: 'structure', label: t('tournament.structure') },
    { key: 'prizes', label: t('tournament.prizes') },
    { key: 'chips', label: t('tournament.chips') },
  ];

  const items = tournament.blindStructure ?? [];
  const currentIndex = countdown.currentIndex;
  const nextLevel: BlindLevelItem | null =
    currentIndex != null
      ? ((items.slice(currentIndex + 1).find((i) => i.type === 'level') ?? null) as BlindLevelItem | null)
      : null;
  const nextBreak: BlindBreakItem | null =
    currentIndex != null
      ? ((items.slice(currentIndex + 1).find((i) => i.type === 'break') ?? null) as BlindBreakItem | null)
      : null;
  const breakPos = nextBreak ? items.indexOf(nextBreak) : -1;
  let minutesUntilBreak = 0;
  if (nextBreak && currentIndex != null && breakPos >= 0) {
    if (current && current.type === 'level') {
      minutesUntilBreak +=
        tournament.status === 'running' && countdown.remainingSec > 0
          ? countdown.remainingSec / 60
          : current.durationMin;
    }
    for (let i = currentIndex + 1; i < breakPos; i++) {
      minutesUntilBreak += items[i].durationMin ?? 0;
    }
  }
  minutesUntilBreak = Math.round(minutesUntilBreak);

  return (
    <AppScreen>
      <AppHeader
        title={tournament.name}
        subtitle={formatDateTime(tournament.startDate)}
        showBack
        onBack={() => router.back()}
      />

      <View style={styles.badges}>
        <Badge label={online ? t('mode.online') : t('mode.live')} tone={online ? 'primary' : 'success'} />
        <Badge label={t(`status.${tournament.status}`)} tone={tournament.status === 'registering' ? 'primary' : 'neutral'} />
        {state ? (
          <Badge
            label={state === 'playing' ? t('tournament.playing') : t('tournament.reserved')}
            tone={state === 'playing' ? 'success' : 'warning'}
          />
        ) : null}
      </View>

      {state === 'playing' ? (
        <AppButton title={t('tournament.playing')} icon="checkmark-circle-outline" variant="success" disabled fullWidth style={styles.reserveBtn} />
      ) : myReservation ? (
        <AppButton
          title={t('tournament.cancelReserve')}
          icon="trash-outline"
          variant="danger"
          disabled={deleteReservation.isPending}
          fullWidth
          style={styles.reserveBtn}
          onPress={() => setCancelModalVisible(true)}
        />
      ) : state === 'reserved' ? (
        <AppButton title={t('tournament.reserved')} icon="checkmark" variant="success" disabled fullWidth style={styles.reserveBtn} />
      ) : (
        <AppButton
          title={t('tournament.reserve')}
          icon="add"
          variant="primary"
          fullWidth
          style={styles.reserveBtn}
          onPress={() => reserve.open({ id: tournament.id, name: tournament.name })}
        />
      )}

      <View style={styles.tabs}>
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tab, active && { backgroundColor: colors.primaryMuted }]}
            >
              <AppText variant="body" weight={active ? 'semibold' : 'regular'} color={active ? colors.primary : colors.textSecondary}>
                {tab.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {activeTab === 'info' ? (
        <AppCard>
          <DetailRow label={t('tournament.buyIn')} value={`${formatCurrency(tournament.buyIn)}${tournament.fee > 0 ? ` + ${formatCurrency(tournament.fee)}` : ''}`} />
          <DetailRow label={t('tournament.stack')} value={formatNumber(tournament.startingStack)} />
          <DetailRow
            label={t('tournament.players')}
            value={tournament.maxPlayers == null ? t('tournament.unlimited') : `${tournament.playersCount ?? 0} / ${formatNumber(tournament.maxPlayers)}`}
          />
          {tournament.guaranteedPrize != null ? (
            <DetailRow label={t('tournament.guaranteed')} value={formatCurrency(tournament.guaranteedPrize)} />
          ) : null}
          {tournament.paidPlacesValue != null ? (
            <DetailRow label={t('tournament.paidPlaces')} value={formatNumber(tournament.paidPlacesValue)} />
          ) : null}
          <DetailRow label={t('tournament.reEntry')} value={reEntryLabel} />
          <DetailRow label={t('tournament.addOn')} value={addOnLabel} last />
        </AppCard>
      ) : activeTab === 'structure' ? (
        <>
          {current ? (
            <View style={[styles.timerCard, { backgroundColor: current.type === 'break' ? colors.warningMuted : colors.primaryMuted }]}>
              {tournament.status === 'running' ? (
                <View
                style={[
                  styles.timerBadge,
                  { backgroundColor: current.type === 'break' ? colors.warning : colors.primary },
                ]}
              >
                <AppText variant="caption" weight="semibold" color={colors.onPrimary}>
                  {current.type === 'break'
                    ? t('tournament.currentBreak')
                    : t('tournament.levelShort', { level: current.level })}
                </AppText>
              </View>
              ) : null}
              <AppText
                variant={tournament.status === 'running' ? 'h1' : 'title'}
                color={current.type === 'break' ? colors.warning : colors.primary}
                center
              >
                {tournament.status === 'running'
                  ? countdown.time
                  : current.type === 'break'
                    ? t('tournament.currentBreak')
                    : t('tournament.currentLevel', { level: current.level })}
              </AppText>
              {current.type === 'level' ? (
                <AppText variant="body" weight="semibold" color={colors.primary} center>
                  {formatChips(current.smallBlind)}/{formatChips(current.bigBlind)}
                  {current.ante > 0 ? ` • ${t('tournament.ante')} ${formatChips(current.ante)}` : ''}
                </AppText>
              ) : (
                <AppText variant="body" weight="semibold" color={colors.warning} center>
                  {t('structure.minutes', { minutes: current.durationMin })}
                </AppText>
              )}
              {nextLevel ? (
                <View style={styles.nextRow}>
                  <Ionicons name="arrow-forward-circle-outline" size={18} color={colors.primary} />
                  <AppText variant="caption" color={colors.textSecondary}>{t('tournament.nextLevel')}</AppText>
                  <AppText variant="body" weight="semibold">
                    L{nextLevel.level} {formatChips(nextLevel.smallBlind)}/{formatChips(nextLevel.bigBlind)}
                  </AppText>
                </View>
              ) : null}
              {nextBreak ? (
                <View style={styles.nextRow}>
                  <Ionicons name="cafe-outline" size={18} color={colors.warning} />
                  <AppText variant="caption" color={colors.textSecondary}>{t('tournament.nextBreak')}</AppText>
                  <AppText variant="body" weight="semibold">
                    {t('structure.afterLevel', { level: nextBreak.afterLevel })} • ≈{formatDuration(minutesUntilBreak)}
                  </AppText>
                </View>
              ) : null}
            </View>
          ) : null}
          <AppCard>
            {tournament.blindStructure && tournament.blindStructure.length > 0 ? (
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
            ) : (
              <AppText variant="caption" color={colors.textSecondary}>
                {t('structure.hint')}
              </AppText>
            )}
          </AppCard>
        </>
      ) : activeTab === 'chips' ? (
        <ChipsSection chips={tournamentChips ?? []} />
      ) : (
        <PrizesSection prizes={prizes ?? []} />
      )}

      <ConfirmModal
        visible={reserve.target != null}
        title={t('tournament.reserveConfirmTitle')}
        message={t('tournament.reserveConfirm', { name: reserve.target?.name ?? '' })}
        confirmLabel={t('tournament.reserve')}
        cancelLabel={t('common.cancel')}
        loading={reserve.loading}
        error={reserve.modalError}
        onConfirm={() => user && reserve.confirm(user.id)}
        onCancel={reserve.close}
      />

      <ConfirmModal
        visible={cancelModalVisible}
        title={t('tournament.cancelReserveConfirmTitle')}
        message={t('tournament.cancelReserveConfirm', { name: tournament.name })}
        confirmLabel={t('common.confirm')}
        cancelLabel={t('common.cancel')}
        loading={deleteReservation.isPending}
        error={deleteReservation.error ? getErrorMessage(deleteReservation.error) : null}
        onConfirm={async () => {
          if (myReservation) {
            try {
              await deleteReservation.mutateAsync(myReservation.id);
              setCancelModalVisible(false);
            } catch {
              // error handled by mutation state
            }
          }
        }}
        onCancel={() => setCancelModalVisible(false)}
      />
    </AppScreen>
  );
}
function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.detailRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <AppText variant="label">{label}</AppText>
      <AppText variant="body" weight="semibold">{value}</AppText>
    </View>
  );
}

function ChipsSection({ chips }: { chips: TournamentChip[] }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  if (chips.length === 0) {
    return (
      <AppCard>
        <AppText variant="caption" center style={styles.emptyText}>
          {t('tournament.noChips')}
        </AppText>
      </AppCard>
    );
  }
  const sorted = [...chips].sort((a, b) => (a.chip?.value ?? 0) - (b.chip?.value ?? 0));
  return (
    <AppCard padded={false}>
      {sorted.map((tc, i) => (
        <View
          key={tc.id}
          style={[
            styles.chipRow,
            i < sorted.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
          ]}
        >
          <View style={[styles.chipSwatch, { backgroundColor: tc.chip?.hexColor ?? colors.surfaceMuted }]} />
          <View style={styles.chipInfo}>
            <AppText variant="body" weight="semibold">
              {formatChips(tc.chip?.value ?? 0)}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {tc.chip?.color ?? t('tournament.value')}
            </AppText>
          </View>
          <AppText variant="caption" color={colors.textMuted} style={styles.chipDiscard}>
            {tc.discardLevel != null
              ? t('tournament.discardAt', { level: tc.discardLevel })
              : t('tournament.discardNone')}
          </AppText>
        </View>
      ))}
    </AppCard>
  );
}

function PrizesSection({ prizes }: { prizes: { place: number; amount: number }[] }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  if (prizes.length === 0) {
    return (
      <AppCard>
        <AppText variant="caption" center style={styles.emptyText}>
          {t('tournament.noPrizes')}
        </AppText>
      </AppCard>
    );
  }
  return (
    <AppCard padded={false}>
      {prizes.map((p, i) => (
        <View
          key={p.place}
          style={[
            styles.prizeRow,
            i < prizes.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
          ]}
        >
          <View style={[styles.placeBadge, { backgroundColor: i === 0 ? colors.warningMuted : colors.surfaceMuted }]}>
            <Ionicons name={i === 0 ? 'trophy' : 'medal-outline'} size={16} color={i === 0 ? colors.warning : colors.textMuted} />
            <AppText variant="body" weight="semibold" color={i === 0 ? colors.warning : colors.textSecondary}>
              {i + 1}º
            </AppText>
          </View>
          <AppText variant="body" weight="semibold">{formatCurrency(p.amount)}</AppText>
        </View>
      ))}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  reserveBtn: { marginBottom: 12 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  timerCard: { borderRadius: 16, padding: 16, paddingTop: 28, gap: 6, marginBottom: 12 },
  timerBadge: {
    position: 'absolute',
    top: 10,
    left: 12,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  emptyText: { paddingVertical: spacing.md },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  chipSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  chipInfo: { flex: 1 },
  chipDiscard: { flexShrink: 1, textAlign: 'right' },
  prizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  placeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
});
