import { useTheme } from '@/theme';
import { AppModal } from './AppModal';
import { AppButton } from './AppButton';
import { AppText } from './AppText';

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = false,
  loading = false,
  error,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
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
