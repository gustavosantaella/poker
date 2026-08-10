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

export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { colors } = useTheme();
  const { register } = useAuth();
  const [alias, setAlias] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    setError(null);
    if (!alias.trim()) {
      setError(t('auth.aliasRequired'));
      return;
    }
    if (!name.trim()) {
      setError(t('auth.nameRequired'));
      return;
    }
    if (!email.trim()) {
      setError(t('auth.emailRequired'));
      return;
    }
    if (password.length < 8) {
      setError(t('auth.passwordMin'));
      return;
    }
    if (password !== confirm) {
      setError(t('auth.passwordMatch'));
      return;
    }
    setLoading(true);
    try {
      await register({ name: name.trim(), email: email.trim(), password, alias: alias.trim(), role: 'player' });
      router.replace('/(tabs)');
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen>
      <AppText variant="title" center style={styles.title}>
        {t('auth.createAccount')}
      </AppText>

      <AppTextField label={t('auth.alias')} value={alias} onChangeText={setAlias} placeholder={t('auth.aliasPlaceholder')} autoCapitalize="none" />
      <AppTextField label={t('auth.name')} value={name} onChangeText={setName} autoCapitalize="words" />
      <AppTextField label={t('auth.email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <AppTextField label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry helper={t('auth.passwordMin')} />
      <AppTextField label={t('auth.confirmPassword')} value={confirm} onChangeText={setConfirm} secureTextEntry />

      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.error}>
          {error}
        </AppText>
      ) : null}

      <AppButton title={t('auth.createAccount')} onPress={handleRegister} loading={loading} fullWidth />

      <Pressable onPress={() => router.back()} style={styles.link} hitSlop={8}>
        <AppText variant="body" color={colors.primary} center>
          {t('auth.haveAccount')}
        </AppText>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: 24, marginBottom: 24 },
  error: { marginBottom: 8 },
  link: { marginTop: 16 },
});
