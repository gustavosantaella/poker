import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { spacing } from '@/theme/spacing';

export function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  divider: { height: 1, marginVertical: spacing.xs },
});