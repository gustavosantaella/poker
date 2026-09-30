import { StyleSheet, View } from 'react-native';
import { ClubCashMovement } from '@/api/types';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import { ListItem } from '@/components/ui/ListItem';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { cashMethodLabelKey, cashStatusLabelKey, cashStatusTone, cashTypeIcon, cashTypeLabelKey } from '@/utils/cash';

export interface CashStatRowProps {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'danger' | 'warning' | 'muted';
}

/** Fila etiqueta / importe para los resúmenes de caja. */
export function CashStatRow({ label, value, tone = 'default' }: CashStatRowProps) {
  const { colors } = useTheme();
  const tones = {
    default: colors.textPrimary,
    success: colors.success,
    danger: colors.danger,
    warning: colors.warning,
    muted: colors.textSecondary,
  } as const;

  return (
    <View style={styles.statRow}>
      <AppText variant="caption" color={colors.textSecondary}>
        {label}
      </AppText>
      <AppText variant="body" weight="semibold" color={tones[tone]}>
        {value}
      </AppText>
    </View>
  );
}

export interface CashMovementRowProps {
  movement: ClubCashMovement;
  currency?: string;
  /** Acción al pulsar (confirmar cobro, revertir...). */
  onPress?: () => void;
  /** Solo el administrador del club: eliminar el movimiento. */
  onDelete?: () => void;
  right?: React.ReactNode;
}

/** Fila de un movimiento de caja: tipo, jugador/torneo, importe y estado. */
export function CashMovementRow({ movement, currency, onPress, onDelete, right }: CashMovementRowProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const subject = movement.user?.name ?? movement.tournament?.name ?? null;
  const title = subject
    ? `${t(cashTypeLabelKey(movement.type))} · ${subject}`
    : t(cashTypeLabelKey(movement.type));
  const subtitle = [
    formatDateTime(movement.paidAt ?? movement.occurredAt),
    t(cashMethodLabelKey(movement.method)),
    movement.note,
  ]
    .filter(Boolean)
    .join(' · ');
  const incoming = movement.direction === 'in';

  return (
    <ListItem
      title={title}
      subtitle={subtitle}
      icon={cashTypeIcon(movement.type)}
      iconColor={incoming ? colors.success : colors.danger}
      onPress={onPress}
      right={
        right ?? (
          <View style={styles.movementRight}>
            <AppText variant="body" weight="semibold" color={incoming ? colors.success : colors.danger}>
              {`${incoming ? '+' : '-'}${formatCurrency(movement.amount, currency ?? movement.currency)}`}
            </AppText>
            {movement.status !== 'paid' ? (
              <AppBadge
                label={t(cashStatusLabelKey(movement.status))}
                tone={cashStatusTone(movement.status)}
              />
            ) : null}
            {onDelete ? (
              <AppButton
                title={t('club.cash.removeMovement')}
                size="sm"
                variant="ghost"
                icon="trash-outline"
                onPress={onDelete}
              />
            ) : null}
          </View>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    gap: 12,
  },
  movementRight: { alignItems: 'flex-end', gap: 4 },
});
