import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { uploadAvatar } from '@/api/auth';
import { API_URL } from '@/api/config';
import { AppButton } from '@/components/ui/AppButton';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppModal } from '@/components/ui/AppModal';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppText } from '@/components/ui/AppText';
import { AppTextField } from '@/components/ui/AppTextField';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useAuth } from '@/hooks/use-auth';
import {
  useMyTableReservations,
  useMyTournamentReservations,
  useRemoveTableReservation,
  useRemoveTournamentReservation,
} from '@/hooks/use-queries';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import { getErrorMessage } from '@/utils/error';

const SERVER_BASE = API_URL.replace(/\/api$/, '');
function buildAvatarUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${SERVER_BASE}${path}`;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const { user, updateProfile, logout } = useAuth();

  const [editOpen, setEditOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [alias, setAlias] = useState('');
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);      // local URI after picking
  const [photoChanged, setPhotoChanged] = useState(false);       // whether user changed the photo
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: myTables } = useMyTableReservations();
  const { data: myTournaments } = useMyTournamentReservations();
  const removeTableRes = useRemoveTableReservation();
  const removeTournamentRes = useRemoveTournamentReservation();
  const [removeTarget, setRemoveTarget] = useState<{ type: 'table' | 'tournament'; reservationId: number; name: string } | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const myReservationsRows = [
    ...(myTables ?? [])
      .filter((r) => r.status === 'pending')
      .map((r) => ({
        key: `t-${r.id}`,
        name: r.table?.name ?? `#${r.tableId}`,
        status: t('table.reserved'),
        reservationId: r.id,
        type: 'table' as const,
      })),
    ...(myTournaments ?? [])
      .filter((r) => r.status === 'pending')
      .map((r) => ({
      key: `m-${r.id}`,
      name: r.tournament?.name ?? `#${r.tournamentId}`,
      status: t('tournament.reserved'),
      reservationId: r.id,
      type: 'tournament' as const,
    })),
  ];

  const handleRemoveConfirm = async () => {
    if (!removeTarget) return;
    setRemoveError(null);
    try {
      if (removeTarget.type === 'table') {
        const res = (myTables ?? []).find((r) => r.id === removeTarget.reservationId);
        if (res) await removeTableRes.mutateAsync({ tableId: res.tableId, reservationId: res.id });
      } else {
        const res = (myTournaments ?? []).find((r) => r.id === removeTarget.reservationId);
        if (res) await removeTournamentRes.mutateAsync({ tournamentId: res.tournamentId, reservationId: res.id });
      }
      setRemoveTarget(null);
    } catch (e) {
      setRemoveError(getErrorMessage(e));
    }
  };

  const openEdit = () => {
    setAlias(user?.alias ?? '');
    setName(user?.name ?? '');
    setCountry(user?.country ?? '');
    setPhone(user?.phone ?? '');
    setPhoto(null);
    setPhotoChanged(false);
    setFormError(null);
    setEditOpen(true);
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setPhoto(result.assets[0].uri);
      setPhotoChanged(true);
    }
  };

  const handleSave = async () => {
    if (!alias.trim() || !name.trim()) {
      setFormError(t('profile.requiredHint'));
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      let photoUrl: string | null | undefined = undefined;
      if (photoChanged && photo) {
        // Upload the file and get back the server URL
        photoUrl = await uploadAvatar(photo);
      } else if (photoChanged && !photo) {
        // User removed the photo
        photoUrl = null;
      }
      await updateProfile({
        alias: alias.trim(),
        name: name.trim(),
        country: country.trim() || null,
        phone: phone.trim() || null,
        photoUrl,
      });
      setEditOpen(false);
      setPhotoChanged(false);
    } catch (e) {
      setFormError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const displayName = user?.alias ?? user?.name ?? '';

  return (
    <AppScreen>
      <AppHeader title={t('profile.title')} />

      <View style={styles.avatarWrap}>
        {user?.photoUrl ? (
          <Image source={{ uri: buildAvatarUrl(user?.photoUrl) }} style={[styles.avatar, { backgroundColor: colors.surfaceMuted }]} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.primaryMuted }]}>
            <Ionicons name="person" size={44} color={colors.primary} />
          </View>
        )}
        <AppText variant="title" center>
          {displayName}
        </AppText>
        <AppText variant="caption" center>
          @{user?.alias ?? user?.email}
        </AppText>
      </View>

      <View style={[styles.infoCard, { borderColor: colors.border }]}>
        <InfoRow icon="mail-outline" label={t('profile.email')} value={user?.email ?? ''} />
        <InfoRow icon="flag-outline" label={t('profile.country')} value={user?.country ?? '—'} />
        <InfoRow icon="call-outline" label={t('profile.phone')} value={user?.phone ?? '—'} />
      </View>

      <AppText variant="subtitle" style={styles.sectionTitle}>
        {t('profile.myReservations')}
      </AppText>
      <View style={[styles.reservationsCard, { borderColor: colors.border }]}>
        {myReservationsRows.length === 0 ? (
          <AppText variant="caption" center style={styles.emptyReservations}>
            {t('profile.noReservations')}
          </AppText>
        ) : (
          myReservationsRows.map((row) => (
            <View key={row.key} style={[styles.reservationRow, { borderBottomColor: colors.border }]}>
              <View style={styles.reservationInfo}>
                <AppText variant="body" weight="medium" numberOfLines={1}>
                  {row.name}
                </AppText>
                <AppText variant="caption">{row.status}</AppText>
              </View>
              <AppButton
                title=""
                size="sm"
                variant="ghost"
                icon="trash-outline"
                onPress={() => {
                  setRemoveError(null);
                  setRemoveTarget({ type: row.type, reservationId: row.reservationId, name: row.name });
                }}
              />
            </View>
          ))
        )}
      </View>

      <AppButton
        title={t('profile.edit')}
        icon="create-outline"
        variant="secondary"
        onPress={openEdit}
        fullWidth
        style={styles.editBtn}
      />
      <AppButton
        title={t('common.logout')}
        icon="log-out-outline"
        variant="danger"
        onPress={() => setConfirmLogout(true)}
        fullWidth
        style={styles.logoutBtn}
      />

      <AppModal
        visible={editOpen}
        title={t('profile.edit')}
        onClose={() => setEditOpen(false)}
        footer={<AppButton title={t('common.save')} onPress={handleSave} loading={saving} fullWidth />}
      >
        {editOpen ? (
          <View>
            <AppText variant="label" style={styles.photoLabel}>
              {t('profile.photo')}
            </AppText>
            <View style={styles.photoRow}>
              {photo ? (
                <Image source={{ uri: photo }} style={[styles.thumb, { backgroundColor: colors.surfaceMuted }]} />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: colors.primaryMuted }]}>
                  <Ionicons name="person" size={28} color={colors.primary} />
                </View>
              )}
              <View style={styles.photoActions}>
                <AppButton title={t('profile.changePhoto')} size="sm" variant="secondary" onPress={pickPhoto} />
                {photo ? (
                  <AppButton
                    title={t('profile.removePhoto')}
                    size="sm"
                    variant="ghost"
                    onPress={() => { setPhoto(null); setPhotoChanged(true); }}
                  />
                ) : null}
              </View>
            </View>

            <AppTextField label={t('profile.alias')} value={alias} onChangeText={setAlias} autoCapitalize="none" />
            <AppTextField label={t('profile.name')} value={name} onChangeText={setName} autoCapitalize="words" />
            <AppTextField label={t('profile.email')} value={user?.email ?? ''} editable={false} />
            <AppTextField label={t('profile.country')} value={country} onChangeText={setCountry} autoCapitalize="words" />
            <AppTextField label={t('profile.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

            {formError ? (
              <AppText variant="caption" color={colors.danger} style={styles.formError}>
                {formError}
              </AppText>
            ) : null}
          </View>
        ) : null}
      </AppModal>

      <ConfirmModal
        visible={removeTarget != null}
        title={t('profile.removeReservation')}
        message={t('profile.removeReservationConfirm', { name: removeTarget?.name ?? '' })}
        confirmLabel={t('profile.removeReservation')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={removeTableRes.isPending || removeTournamentRes.isPending}
        error={removeError}
        onConfirm={handleRemoveConfirm}
        onCancel={() => setRemoveTarget(null)}
      />

      <ConfirmModal
        visible={confirmLogout}
        title={t('common.logout')}
        message={t('profile.logoutConfirm')}
        confirmLabel={t('common.logout')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={handleLogout}
        onCancel={() => setConfirmLogout(false)}
      />
    </AppScreen>
  );
}


function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <AppText variant="label" style={styles.infoLabel}>
        {label}
      </AppText>
      <AppText variant="body" weight="medium" style={styles.infoValue} numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarWrap: { alignItems: 'center', gap: 4, marginBottom: 20 },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: 8 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  infoCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { width: 110 },
  infoValue: { flex: 1 },
  editBtn: { marginTop: 16 },
  logoutBtn: { marginTop: 8 },
  sectionTitle: { marginTop: 20, marginBottom: 8 },
  reservationsCard: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 16 },
  emptyReservations: { paddingVertical: 16 },
  reservationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  reservationInfo: { flex: 1, marginRight: 8 },
  photoLabel: { marginBottom: 8 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  thumb: { width: 64, height: 64, borderRadius: 32 },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  photoActions: { gap: 4, flex: 1 },
  formError: { marginTop: 4 },
});

