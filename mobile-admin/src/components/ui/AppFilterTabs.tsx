import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Option } from '@/constants';
import { useTheme } from '@/theme';
import { radius } from '@/theme/radius';
import { layout, spacing } from '@/theme/spacing';
import { formatNumber } from '@/utils/format';
import { AppText } from './AppText';

export interface AppFilterTab<T extends string = string> extends Option<T> {
  /** Contador opcional que se muestra a la derecha de la etiqueta. */
  count?: number;
}

export interface AppFilterTabsProps<T extends string = string> {
  value: T;
  options: AppFilterTab<T>[];
  onChange: (value: T) => void;
}

/**
 * Fila horizontal de filtros tipo pildora para listados.
 * Se desplaza lateralmente cuando las opciones no caben en pantalla.
 */
export function AppFilterTabs<T extends string>({ value, options, onChange }: AppFilterTabsProps<T>) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.item,
              {
                backgroundColor: active ? colors.primary : colors.surface,
                borderColor: active ? colors.primary : colors.border,
              },
              pressed && styles.pressed,
            ]}
          >
            <AppText
              variant="caption"
              weight={active ? 'semibold' : 'medium'}
              color={active ? colors.onPrimary : colors.textSecondary}
              numberOfLines={1}
            >
              {option.label}
            </AppText>
            {option.count != null ? (
              <View
                style={[
                  styles.count,
                  { backgroundColor: active ? colors.onPrimary : colors.surfaceMuted },
                ]}
              >
                <AppText
                  variant="caption"
                  weight="semibold"
                  color={active ? colors.primary : colors.textMuted}
                  style={styles.countText}
                >
                  {formatNumber(option.count)}
                </AppText>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { marginBottom: spacing.md, marginHorizontal: -layout.screenPadding },
  content: { gap: spacing.xs, paddingHorizontal: layout.screenPadding },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  pressed: { opacity: 0.7 },
  count: {
    minWidth: 20,
    alignItems: 'center',
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  countText: { fontSize: 11, lineHeight: 15 },
});
