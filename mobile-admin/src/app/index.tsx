import { Redirect } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { LoadingView } from '@/components/ui/LoadingView';
import { useAuth } from '@/hooks/use-auth';

export default function IndexScreen() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <LoadingView />
      </View>
    );
  }

  // La app de admin es solo para administradores: un player autenticado es
  // redirigido al login (el backend además devuelve 403 en todas las escrituras).
  if (isAuthenticated && user && user.role !== 'player') {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center' },
});