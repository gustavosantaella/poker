import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { translate } from '@/i18n';
import { useTheme } from '@/theme';
import { spacing } from '@/theme/spacing';
import { AppText } from './AppText';

export function LoadingView({ label = translate('common.loading') }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? <AppText variant="caption" style={styles.label}>{label}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: spacing.xxl, alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: spacing.sm },
});