import { useTheme } from '@/theme';
import { translate } from '@/i18n';
import { AppButton } from './AppButton';
import { AppModal } from './AppModal';
import { AppText } from './AppText';

export interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Modal de confirmacion reutilizable (borrar, acciones destructivas, etc). */
export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = translate('common.confirm'),
  cancelLabel = translate('common.cancel'),
  destructive = false,
  loading = false,
  error = null,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { colors } = useTheme();

  return (
    <AppModal
      visible={visible}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <AppButton
            title={cancelLabel}
            variant="secondary"
            style={{ flex: 1 }}
            onPress={onCancel}
            disabled={loading}
          />
          <AppButton
            title={confirmLabel}
            variant={destructive ? 'danger' : 'primary'}
            style={{ flex: 1 }}
            onPress={onConfirm}
            loading={loading}
          />
        </>
      }
    >
      <AppText variant="body" color={colors.textSecondary}>
        {message}
      </AppText>
      {error ? (
        <AppText variant="caption" color={colors.danger} style={{ marginTop: 8 }}>
          {error}
        </AppText>
      ) : null}
    </AppModal>
  );
}