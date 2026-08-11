import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppText } from '@/components/ui/AppText';
import { AppTextField } from '@/components/ui/AppTextField';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import { getErrorMessage } from '@/utils/error';

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { colors } = useTheme();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError(t('auth.emailRequired'));
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen>
      <View style={styles.hero}>
        <View style={[styles.logo, { borderColor: colors.primary, backgroundColor: colors.primaryMuted }]}>
          <View style={[styles.logoInner, { borderColor: colors.primary }]}>
            <AppText variant="h1" color={colors.primary}>
              ♠
            </AppText>
          </View>
        </View>
        <View style={styles.suitsRow}>
          {['♠', '♥', '♦', '♣'].map((suit, i) => (
            <AppText key={suit} variant="caption" color={i % 2 === 0 ? colors.textMuted : colors.danger} style={styles.suit}>
              {suit}
            </AppText>
          ))}
        </View>
        <AppText variant="title" center>
          {t('auth.welcome')}
        </AppText>
        <AppText variant="caption" center>
          {t('auth.subtitle')}
        </AppText>
      </View>

      <AppTextField
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <AppTextField
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
      />

      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.error}>
          {error}
        </AppText>
      ) : null}

      <AppButton title={t('auth.signIn')} onPress={handleLogin} loading={loading} fullWidth />

      <Pressable onPress={() => router.push('/register')} style={styles.link} hitSlop={8}>
        <AppText variant="body" color={colors.primary} center>
          {t('auth.noAccount')}
        </AppText>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 32 },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#E3B341',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  logoInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suitsRow: { flexDirection: 'row', gap: 16, marginBottom: 4 },
  suit: { fontSize: 18 },
  error: { marginBottom: 8 },
  link: { marginTop: 16 },
});
