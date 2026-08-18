import { ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { layout, spacing } from '@/theme/spacing';

export interface AppScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function AppScreen({
  children,
  scroll = true,
  padded = true,
  refreshing = false,
  onRefresh,
  contentContainerStyle,
}: AppScreenProps) {
  const { colors, isDark } = useTheme();

  const content = padded ? <View style={styles.padded}>{children}</View> : children;

  const screen = (
    <>
      {/* Resplandor dorado ambiental: atmósfera casino sin bloquear toques. */}
      <LinearGradient
        pointerEvents="none"
        colors={
          isDark
            ? ['rgba(227, 179, 65, 0.13)', 'rgba(227, 179, 65, 0.05)', 'rgba(227, 179, 65, 0)']
            : ['rgba(199, 154, 46, 0.16)', 'rgba(199, 154, 46, 0.05)', 'rgba(199, 154, 46, 0)']
        }
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.glow}
      />
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[{ paddingBottom: spacing.xxxl }, contentContainerStyle]}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            ) : undefined
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        <View style={[styles.flex, contentContainerStyle]}>{content}</View>
      )}
    </>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      {screen}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  padded: { padding: layout.screenPadding },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
});
