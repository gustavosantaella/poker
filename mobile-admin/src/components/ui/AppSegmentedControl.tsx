import { Pressable, StyleSheet, View } from 'react-native';
import { Option } from '@/constants';
import { useTheme } from '@/theme';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { AppText } from './AppText';

export interface AppSegmentedControlProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  label?: string;
}

/** Control segmentado tipo pildora para elegir entre opciones cortas. */
export function AppSegmentedControl({
  value,
  options,
  onChange,
  label,
}: AppSegmentedControlProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      {label ? (
        <AppText variant="label" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <View style={[styles.container, { backgroundColor: colors.surfaceMuted }]}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.item,
                active && { backgroundColor: colors.surface },
                pressed && { opacity: 0.7 },
              ]}
            >
              <AppText
                variant="caption"
                color={active ? colors.textPrimary : colors.textSecondary}
                weight={active ? 'semibold' : 'regular'}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { marginBottom: spacing.xs, marginLeft: spacing.xxs },
  container: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: spacing.xxs,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: radius.sm,
  },
});