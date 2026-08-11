import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAdminSidebar } from '@/hooks/use-sidebar';
import { useTheme } from '@/theme';
import { spacing } from '@/theme/spacing';
import { AppText } from './AppText';

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  showMenu?: boolean;
  right?: ReactNode;
  onBack?: () => void;
}

/** Encabezado de pantalla con botón de menú lateral, retroceso y acciones a la derecha. */
export function AppHeader({ title, subtitle, showBack = false, showMenu = false, right, onBack }: AppHeaderProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const sidebar = useAdminSidebar();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.left}>
        {showMenu ? (
          <Pressable onPress={() => sidebar.open()} hitSlop={8} style={styles.backBtn}>
            <Ionicons name="menu" size={24} color={colors.textPrimary} />
          </Pressable>
        ) : showBack ? (
          <Pressable onPress={handleBack} hitSlop={8} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
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
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 52,
  },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  titles: { flex: 1 },
  right: { marginLeft: spacing.sm },
});