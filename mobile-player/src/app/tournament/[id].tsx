import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { createTournamentReservation } from '@/api/tournaments';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingView } from '@/components/ui/LoadingView';
import { useAuth } from '@/hooks/use-auth';
import { useTournament, useTournamentReservations, useDeleteTournamentReservation } from '@/hooks/use-queries';
import { useReserve } from '@/hooks/use-reserve';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import { formatCurrency, formatDateTime, formatNumber } from '@/utils/format';
import { getErrorMessage } from '@/utils/error';
import { BlindStructurePreview } from '@/components/features/BlindStructurePreview';
import { summarizeStructure } from '@/utils/blind-structure';
import { spacing } from '@/theme/spacing';
import { useTournamentCountdown } from '@/hooks/use-tournament-countdown';

export default function TournamentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tournamentId = Number(id);
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const { data: tournament, isLoading, isError } = useTournament(tournamentId);
  const { data: reservations } = useTournamentReservations(tournamentId);

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const deleteReservation = useDeleteTournamentReservation(tournamentId);
  const countdown = useTournamentCountdown(tournament);

  const current = countdown.currentItem;
  const currentLabel = current
    ? current.type === 'break'
      ? t('tournament.breakShort')
      : t('tournament.levelShort', { level: current.level })
    : null;

  const myReservation = (reservations ?? []).find((r) => r.userId === user?.id);
  const alreadyReserved = myReservation !== undefined;
  const isPlaying = myReservation?.status === 'accepted';

  const reserve = useReserve((target, userId) => createTournamentReservation(target.id, userId));

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

  const reserved = alreadyReserved || reserve.isReserved(tournament.id);

  return (
    <AppScreen>
      <AppHeader
        title={tournament.name}
        subtitle={formatDateTime(tournament.startDate)}
        showBack
        onBack={() => router.back()}
      />

      <View style={styles.badges}>
        <Badge label={tournament.mode === 'online' ? t('mode.online') : t('mode.live')} tone={tournament.mode === 'online' ? 'primary' : 'success'} />
        <Badge label={t(`status.${tournament.status}`)} tone={tournament.status === 'registering' ? 'primary' : 'neutral'} />
      </View>

      <AppCard>
        <DetailRow
          label={t('tournament.buyIn')}
          value={`${formatCurrency(tournament.buyIn)}${tournament.fee > 0 ? ` + ${formatCurrency(tournament.fee)}` : ''}`}
        />
        <DetailRow label={t('tournament.stack')} value={formatNumber(tournament.startingStack)} />
        <DetailRow
          label={t('tournament.players')}
          value={
            tournament.maxPlayers == null
              ? t('tournament.unlimited')
              : `${tournament.playersCount ?? 0} / ${formatNumber(tournament.maxPlayers)}`
          }
        />
        <DetailRow
          label={t('tournament.reEntry')}
          value={tournament.reEntryEnabled ? t('common.confirm') : '—'}
        />
        <DetailRow
          label={t('tournament.addOn')}
          value={tournament.addOnEnabled ? t('common.confirm') : '—'}
        />
        {tournament.guaranteedPrize != null ? (
          <DetailRow label={t('tournament.guaranteed')} value={formatCurrency(tournament.guaranteedPrize)} last />
        ) : (
          <DetailRow label={t('tournament.startDate')} value={formatDateTime(tournament.startDate)} last />
        )}
      </AppCard>

      {reserved ? (
        isPlaying ? (
          <AppButton
            title={t('tournament.playing')}
            icon="checkmark-circle-outline"
            variant="success"
            disabled={true}
            fullWidth
            style={styles.reserveBtn}
          />
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
        ) : (
          <AppButton
            title={t('tournament.reserved')}
            icon="checkmark"
            variant="success"
            disabled={true}
            fullWidth
            style={styles.reserveBtn}
          />
        )
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

      {tournament.blindStructure && tournament.blindStructure.length > 0 ? (
        <AppCard style={styles.structureCard}>
          <AppText variant="subtitle" style={styles.cardTitle}>
            {t('structure.title')}
          </AppText>
          {currentLabel && tournament.status === 'running' ? (
            <AppText variant="body" weight="semibold" color={colors.primary} style={styles.currentLine}>
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
              tournament.addOnEnabled && tournament.addOnUntilLevel != null
                ? tournament.addOnUntilLevel
                : null
            }
            reEntryUnlimited={tournament.reEntryEnabled && tournament.maxReEntries === 0}
            currentIndex={tournament.currentLevel}
          />
        </AppCard>
      ) : null}

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
            } catch (e) {
              // error is handled by mutation state
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
      <AppText variant="body" weight="semibold">
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  reserveBtn: { marginTop: 16 },
  structureCard: { marginTop: spacing.md },
  cardTitle: { marginBottom: spacing.sm },
  currentLine: { marginBottom: spacing.sm },
});

