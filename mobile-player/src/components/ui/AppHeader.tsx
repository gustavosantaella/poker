import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { spacing } from '@/theme/spacing';
import { AppText } from './AppText';

export function AppHeader({
  title,
  subtitle,
  showBack,
  right,
  onBack,
}: {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  right?: ReactNode;
  onBack?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      {showBack ? (
        <Pressable onPress={onBack} hitSlop={8} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
      ) : null}
      <View style={styles.titles}>
        <AppText variant="title" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  back: { marginLeft: -spacing.xs },
  titles: { flex: 1 },
  right: {},
});
