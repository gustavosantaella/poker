import { ScrollView, StyleSheet, View } from 'react-native';
import { AppCard } from '@/components/ui/AppCard';
import { AppModal } from '@/components/ui/AppModal';
import { AppText } from '@/components/ui/AppText';
import { ListItem } from '@/components/ui/ListItem';
import { LoadingView } from '@/components/ui/LoadingView';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ClubCashQuery } from '@/api/cash';
import { useClubCashPlayer } from '@/hooks/use-queries';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import { formatCurrency, formatDate } from '@/utils/format';
import { CashMovementRow, CashStatRow } from './ClubCashRows';

export interface ClubCashPlayerModalProps {
  clubId: number;
  userId: number;
  visible: boolean;
  query: ClubCashQuery;
  /** Divisa del club (los importes se muestran con ella). */
  currency?: string;
  onClose: () => void;
}

/**
 * Detalle de un jugador en la caja del club: cuánto dinero ha invertido en total,
 * en qué torneos y qué premios ha cobrado.
 */
export function ClubCashPlayerModal({
  clubId,
  userId,
  visible,
  query,
  currency = 'USD',
  onClose,
}: ClubCashPlayerModalProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { data: detail, isLoading } = useClubCashPlayer(clubId, visible ? userId : 0, query);

  const money = (value: number) => formatCurrency(value, currency);

  return (
    <AppModal visible={visible} title={t('club.cash.topInvestors')} onClose={onClose}>
      {isLoading || !detail ? (
        <LoadingView />
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <AppText variant="subtitle">{detail.player.name}</AppText>
          <AppText variant="caption" color={colors.textSecondary} style={styles.subtitle}>
            {`${detail.player.tournaments} ${t('club.cash.tournament').toLowerCase()} · ${t(
              'club.cash.movements',
            ).toLowerCase()}: ${detail.movements.length}`}
          </AppText>

          <AppCard>
            <CashStatRow label={t('club.cash.invested')} value={money(detail.player.invested)} />
            <CashStatRow label={t('club.cash.collected')} value={money(detail.player.paid)} tone="success" />
            <CashStatRow
              label={t('club.cash.pending')}
              value={money(detail.player.pending)}
              tone={detail.player.pending > 0 ? 'warning' : 'muted'}
            />
            <CashStatRow label={t('club.cash.prizesPaid')} value={money(detail.player.prizes)} tone="danger" />
            <CashStatRow
              label={t('club.cash.net')}
              value={money(detail.player.net)}
              tone={detail.player.net >= 0 ? 'success' : 'danger'}
            />
            <CashStatRow
              label={t('club.cash.entries')}
              value={`${detail.player.entries} / ${detail.player.reEntries} / ${detail.player.addOns}`}
            />
          </AppCard>

          <SectionHeader title={t('club.cash.byTournament')} />
          <AppCard padded={false}>
            {detail.byTournament.length === 0 ? (
              <AppText variant="caption" color={colors.textMuted} style={styles.empty}>
                {t('club.cash.noTournaments')}
              </AppText>
            ) : (
              detail.byTournament.map((row) => (
                <ListItem
                  key={row.tournamentId}
                  title={row.name}
                  subtitle={`${formatDate(row.startDate)} · ${t('club.cash.playerSubtitle', {
                    entries: row.entries,
                    reEntries: row.reEntries,
                    invested: money(row.invested),
                  })}`}
                  icon="trophy-outline"
                  right={
                    <View style={styles.right}>
                      <AppText variant="body" weight="semibold">
                        {money(row.invested)}
                      </AppText>
                      {row.prizes > 0 ? (
                        <AppText variant="caption" color={colors.success}>
                          {`+${money(row.prizes)}`}
                        </AppText>
                      ) : null}
                    </View>
                  }
                />
              ))
            )}
          </AppCard>

          <SectionHeader title={t('club.cash.movements')} />
          <AppCard padded={false}>
            {detail.movements.length === 0 ? (
              <AppText variant="caption" color={colors.textMuted} style={styles.empty}>
                {t('club.cash.noMovements')}
              </AppText>
            ) : (
              detail.movements.map((movement) => (
                <CashMovementRow key={movement.id} movement={movement} currency={currency} />
              ))
            )}
          </AppCard>
        </ScrollView>
      )}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 460 },
  subtitle: { marginBottom: 8 },
  empty: { padding: 16 },
  right: { alignItems: 'flex-end', gap: 2 },
});
