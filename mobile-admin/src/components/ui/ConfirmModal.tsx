import { useTheme } from '@/theme';
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
  onConfirm: () => void;
  onCancel: () => void;
}

/** Modal de confirmacion reutilizable (borrar, acciones destructivas, etc). */
export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
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
    </AppModal>
  );
}