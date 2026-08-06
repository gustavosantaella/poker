import { ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
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

/** Pantalla base: SafeArea + fondo del tema + scroll opcional con pull-to-refresh. */
export function AppScreen({
  children,
  scroll = true,
  padded = true,
  refreshing = false,
  onRefresh,
  contentContainerStyle,
}: AppScreenProps) {
  const { colors } = useTheme();

  const content = padded ? <View style={styles.padded}>{children}</View> : children;

  if (!scroll) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.flex, contentContainerStyle]}>{content}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  padded: { padding: layout.screenPadding },
});