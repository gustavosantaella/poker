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
  menu,
  right,
  onBack,
  onMenuPress,
}: {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  menu?: boolean;
  right?: ReactNode;
  onBack?: () => void;
  onMenuPress?: () => void;
}) {
  const { colors } = useTheme();
  const left = menu ? (
    <Pressable onPress={onMenuPress} hitSlop={8} style={styles.leftBtn}>
      <Ionicons name="menu" size={24} color={colors.primary} />
    </Pressable>
  ) : showBack ? (
    <Pressable onPress={onBack} hitSlop={8} style={styles.leftBtn}>
      <Ionicons name="chevron-back" size={24} color={colors.primary} />
    </Pressable>
  ) : null;
  return (
    <View style={styles.row}>
      {left}
      <View style={styles.titles}>
        <AppText variant="title" color={colors.primary} numberOfLines={1} style={styles.title}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
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
  leftBtn: { marginLeft: -spacing.xs, paddingRight: spacing.xs },
  titles: { flex: 1 },
  right: {},
  title: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
