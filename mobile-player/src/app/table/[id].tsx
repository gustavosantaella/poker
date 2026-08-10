import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { createTableReservation } from '@/api/tables';
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
import { useTable, useTableReservations } from '@/hooks/use-queries';
import { useReserve } from '@/hooks/use-reserve';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import { formatCurrency } from '@/utils/format';

export default function TableDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tableId = Number(id);
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const { data: table, isLoading, isError } = useTable(tableId);
  const { data: reservations } = useTableReservations(tableId);
  const alreadyReserved = (reservations ?? []).some(
    (r) => r.userId === user?.id && r.status !== 'cancelled',
  );
  const reserve = useReserve((target, userId) => createTableReservation(target.id, userId));

  if (isLoading) {
    return (
      <AppScreen>
        <AppHeader title={t('table.mode')} showBack onBack={() => router.back()} />
        <LoadingView />
      </AppScreen>
    );
  }

  if (isError || !table) {
    return (
      <AppScreen>
        <AppHeader title={t('table.notFound')} showBack onBack={() => router.back()} />
        <EmptyState
          icon="grid-outline"
          title={t('table.notFound')}
          subtitle={t('table.notFoundDesc')}
          actionLabel={t('common.back')}
          onAction={() => router.back()}
        />
      </AppScreen>
    );
  }

  const reserved = alreadyReserved || reserve.isReserved(table.id);

  return (
    <AppScreen>
      <AppHeader
        title={table.name}
        subtitle={table.gameType?.name ?? t('table.noGameType')}
        showBack
        onBack={() => router.back()}
      />

      <View style={styles.badges}>
        <Badge label={table.mode === 'online' ? t('mode.online') : t('mode.live')} tone={table.mode === 'online' ? 'primary' : 'success'} />
        <Badge label={t(`status.${table.status}`)} tone={table.status === 'open' ? 'success' : 'neutral'} />
      </View>

      <AppCard>
        <DetailRow label={t('table.blinds')} value={`${table.smallBlind}/${table.bigBlind}`} />
        <DetailRow
          label={t('table.buyIn')}
          value={`${formatCurrency(table.minBuyIn)} – ${formatCurrency(table.maxBuyIn)}`}
        />
        <DetailRow label={t('table.seats')} value={String(table.seats)} />
        {table.notes ? <DetailRow label={t('common.optional')} value={table.notes} last /> : null}
      </AppCard>

      <AppButton
        title={reserved ? t('table.reserved') : t('table.reserve')}
        icon={reserved ? 'checkmark' : 'add'}
        variant={reserved ? 'success' : 'primary'}
        disabled={reserved}
        fullWidth
        style={styles.reserveBtn}
        onPress={() => reserve.open({ id: table.id, name: table.name })}
      />

      <ConfirmModal
        visible={reserve.target != null}
        title={t('table.reserveConfirmTitle')}
        message={t('table.reserveConfirm', { name: reserve.target?.name ?? '' })}
        confirmLabel={t('table.reserve')}
        cancelLabel={t('common.cancel')}
        loading={reserve.loading}
        error={reserve.modalError}
        onConfirm={() => user && reserve.confirm(user.id)}
        onCancel={reserve.close}
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
});
