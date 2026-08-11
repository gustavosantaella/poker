import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppModal } from '@/components/ui/AppModal';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppSelect } from '@/components/ui/AppSelect';
import { AppText } from '@/components/ui/AppText';
import { AppTextField } from '@/components/ui/AppTextField';
import { LoadingView } from '@/components/ui/LoadingView';
import { useClubs, useCreateUser, useDealers } from '@/hooks/use-queries';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import { getErrorMessage } from '@/utils/error';
import { Redirect } from 'expo-router';

/** Colaboradores: usuarios del club con rol dealer (solo lectura para ellos). */
export default function CollaboratorsScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: dealersData, isLoading } = useDealers();
  const { data: clubsData } = useClubs();
  const create = useCreateUser();

  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [clubId, setClubId] = useState<string | null>(null);

  if (authLoading) return <LoadingView />;
  if (!isAuthenticated) return <Redirect href="/login" />;

  const dealers = dealersData?.items ?? [];
  const clubNameById = new Map((clubsData?.items ?? []).map((c) => [c.id, c.name]));
  const clubOptions = (clubsData?.items ?? []).map((c) => ({ label: c.name, value: String(c.id) }));

  const handleCreate = async () => {
    setError(null);
    if (!name.trim() || !email.trim() || !password) {
      setError(t('collaborators.required'));
      return;
    }
    try {
      await create.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        password,
        role: 'dealer',
        clubId: clubId ? Number(clubId) : undefined,
      });
      setOpen(false);
      setName('');
      setEmail('');
      setPassword('');
      setClubId(null);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  return (
    <AppScreen>
      <AppHeader title={t('settings.collaborators')} showMenu />
      <AppButton
        title={t('collaborators.create')}
        icon="add"
        onPress={() => {
          setError(null);
          setOpen(true);
        }}
        fullWidth
        style={styles.addBtn}
      />
      {isLoading ? (
        <LoadingView />
      ) : (
        <AppCard padded={false}>
          {dealers.length === 0 ? (
            <AppText variant="caption" style={styles.empty}>
              {t('collaborators.empty')}
            </AppText>
          ) : (
            dealers.map((dealer) => (
              <View key={dealer.id} style={styles.row}>
                <View style={styles.info}>
                  <AppText variant="body" weight="medium" numberOfLines={1}>
                    {dealer.name}
                  </AppText>
                  <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
                    {dealer.email} • {clubNameById.get(dealer.clubId ?? -1) ?? t('collaborators.noClub')}
                  </AppText>
                </View>
              </View>
            ))
          )}
        </AppCard>
      )}

      <AppModal visible={open} title={t('collaborators.create')} onClose={() => setOpen(false)}>
        <AppTextField label={t('settings.name')} value={name} onChangeText={setName} autoCapitalize="words" />
        <AppTextField
          label={t('settings.email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <AppTextField label={t('collaborators.password')} value={password} onChangeText={setPassword} secureTextEntry />
        <AppSelect label={t('settings.clubs')} value={clubId} options={clubOptions} onSelect={setClubId} />
        {error ? (
          <AppText variant="caption" color={colors.danger} style={styles.error}>
            {error}
          </AppText>
        ) : null}
        <AppButton title={t('collaborators.create')} onPress={handleCreate} loading={create.isPending} fullWidth />
      </AppModal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  addBtn: { marginBottom: 12 },
  empty: { padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12 },
  info: { flex: 1 },
  error: { marginBottom: 12 },
});
