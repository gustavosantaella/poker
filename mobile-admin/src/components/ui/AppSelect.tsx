import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Option } from '@/constants';
import { translate } from '@/i18n';
import { useTheme } from '@/theme';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { AppModal } from './AppModal';
import { AppText } from './AppText';

export interface AppSelectProps {
  label?: string;
  placeholder?: string;
  value?: string | null;
  options: Option[];
  onSelect: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

/** Selector que abre un modal con las opciones (estilo de input). */
export function AppSelect({
  label,
  placeholder = translate('common.selectOption'),
  value,
  options,
  onSelect,
  error,
  disabled = false,
}: AppSelectProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.wrap}>
      {label ? (
        <AppText variant="label" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        style={[
          styles.field,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
            opacity: disabled ? 0.55 : 1,
          },
        ]}
      >
        <AppText
          variant="body"
          color={selected ? colors.textPrimary : colors.textMuted}
          numberOfLines={1}
        >
          {selected ? selected.label : placeholder}
        </AppText>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>
      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.message}>
          {error}
        </AppText>
      ) : null}

      <AppModal visible={open} title={label ?? placeholder} onClose={() => setOpen(false)}>
        <View style={styles.options}>
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  onSelect(option.value);
                  setOpen(false);
                }}
                style={({ pressed }) => [
                  styles.option,
                  { backgroundColor: pressed ? colors.surfaceMuted : 'transparent' },
                ]}
              >
                <AppText
                  variant="body"
                  weight={isSelected ? 'semibold' : 'regular'}
                  color={isSelected ? colors.primary : colors.textPrimary}
                >
                  {option.label}
                </AppText>
                {isSelected ? (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { marginBottom: spacing.xs, marginLeft: spacing.xxs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  message: { marginTop: spacing.xxs, marginLeft: spacing.xxs },
  options: { gap: spacing.xxs },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
  },
});