import { StyleSheet, Switch, View } from 'react-native';
import { useTheme } from '@/theme';
import { spacing } from '@/theme/spacing';
import { AppText } from './AppText';

export interface AppSwitchProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

/** Fila con interruptor (Switch) y etiqueta. */
export function AppSwitch({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
}: AppSwitchProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <AppText variant="body" weight="medium">
          {label}
        </AppText>
        {description ? (
          <AppText variant="caption">{description}</AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.surfaceMuted, true: colors.primary }}
        thumbColor={colors.surface}
        ios_backgroundColor={colors.surfaceMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  text: { flex: 1, marginRight: spacing.sm },
});