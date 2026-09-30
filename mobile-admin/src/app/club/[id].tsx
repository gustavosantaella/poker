import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { uploadImage } from '@/api/auth';
import { API_URL } from '@/api/config';
import { ClubAuditAction, ClubMember, ClubMemberRole } from '@/api/types';
import { StatCard } from '@/components/features/StatCard';
import { AppBadge } from '@/components/ui/AppBadge';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppModal } from '@/components/ui/AppModal';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppSegmentedControl } from '@/components/ui/AppSegmentedControl';
import { AppSelect } from '@/components/ui/AppSelect';
import { AppText } from '@/components/ui/AppText';
import { AppTextField } from '@/components/ui/AppTextField';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ListItem } from '@/components/ui/ListItem';
import { LoadingView } from '@/components/ui/LoadingView';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Option } from '@/constants';
import { useAuth } from '@/hooks/use-auth';
import { useClubEvents } from '@/hooks/use-club-events';
import {
  useClub,
  useClubAuditLog,
  useClubCollaborators,
  useClubInvitations,
  useClubStats,
  useCreateClubInvitation,
  useRemoveClubMember,
  useResendClubInvitation,
  useRevokeClubInvitation,
  useRotateClubCode,
  useTransferClubOwnership,
  useUpdateClub,
  useUpdateClubCollaborator,
} from '@/hooks/use-queries';
import { TranslationKey } from '@/i18n';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import { getErrorMessage } from '@/utils/error';

/** Permisos que se pueden asignar a un colaborador (el dueño siempre es admin). */
const COLLABORATOR_ROLES: ClubMemberRole[] = ['admin', 'operator', 'cashier'];

// API_URL termina en /api: se quita para construir la URL del servidor.
const SERVER_BASE = API_URL.replace(/\/api$/, '');

/** URL completa de la foto del club (el backend guarda rutas relativas o URLs de Blob). */
function buildImageUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${SERVER_BASE}${path}`;
}

/** Convierte el texto de un campo numérico en número (acepta la coma decimal). */
function toNumberOrNull(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Clave i18n con el nombre de un permiso dentro del club. */
function roleLabelKey(role: ClubMemberRole): TranslationKey {
  return `club.role.${role}` as TranslationKey;
}

/** Clave i18n del título de cada acción del historial del club. */
const AUDIT_ACTION_KEYS: Record<ClubAuditAction, TranslationKey> = {
  'club.updated': 'club.audit.club.updated',
  'club.code_rotated': 'club.audit.club.code_rotated',
  'club.ownership_transferred': 'club.audit.club.ownership_transferred',
  'collaborator.role_changed': 'club.audit.collaborator.role_changed',
  'collaborator.removed': 'club.audit.collaborator.removed',
  'member.status_changed': 'club.audit.member.status_changed',
  'invitation.created': 'club.audit.invitation.created',
  'invitation.resent': 'club.audit.invitation.resent',
  'invitation.revoked': 'club.audit.invitation.revoked',
  'invitation.accepted': 'club.audit.invitation.accepted',
  'invitation.expired': 'club.audit.invitation.expired',
};

/** Icono del historial según el tipo de acción. */
function auditIcon(action: ClubAuditAction): keyof typeof Ionicons.glyphMap {
  if (action.startsWith('invitation.')) return 'mail-outline';
  if (action.startsWith('collaborator.')) return 'shield-checkmark-outline';
  if (action === 'club.ownership_transferred') return 'swap-horizontal-outline';
  if (action === 'club.code_rotated') return 'key-outline';
  if (action === 'member.status_changed') return 'person-add-outline';
  return 'settings-outline';
}

/** Importe con separador de miles y hasta dos decimales. */
function formatAmount(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** Fecha y hora cortas para el historial de actividad. */
function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Fecha corta (día/mes) para la caducidad de una invitación. */
function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' });
}

/**
 * Dashboard único del club: métricas, colaboradores (invitaciones y permisos) y
 * configuración (nombre, foto, ubicación y redes sociales).
 */
export default function ClubDashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const clubId = Number(id);
  const { t } = useI18n();
  const { colors } = useTheme();

  const { data: club, isLoading } = useClub(clubId);
  const { data: stats, refetch: refetchStats } = useClubStats(clubId);
  // El dashboard se refresca solo cuando el equipo cambia algo (SSE del club).
  useClubEvents(clubId);
  /** Solo el admin del club (o el admin global) gestiona colaboradores y configuración. */
  const canManage = stats?.myRole === 'admin';
  const { user } = useAuth();
  /** Solo el dueño actual (o un admin global) puede traspasar la propiedad. */
  const isOwner = Boolean(club && user && (user.id === club.adminUserId || user.role === 'admin'));

  const { data: collaborators } = useClubCollaborators(canManage ? clubId : 0);
  const { data: invitations } = useClubInvitations(canManage ? clubId : 0);
  // El historial de actividad solo lo ve el equipo con permiso de administrador.
  const { data: auditLog } = useClubAuditLog(canManage ? clubId : 0, 30);
  const updateClub = useUpdateClub();
  const createInvitation = useCreateClubInvitation(clubId);
  const resendInvitation = useResendClubInvitation(clubId);
  const revokeInvitation = useRevokeClubInvitation(clubId);
  const updateCollaborator = useUpdateClubCollaborator(clubId);
  const removeMember = useRemoveClubMember(clubId);
  const rotateCode = useRotateClubCode(clubId);
  const transferOwnership = useTransferClubOwnership(clubId);

  const [tab, setTab] = useState('metrics');
  const [refreshing, setRefreshing] = useState(false);

  // ---- Invitaciones de colaboradores ----
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<ClubMemberRole>('operator');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<{
    email: string;
    role: ClubMemberRole;
    token: string;
    accepted: boolean;
  } | null>(null);

  // ---- Permisos de un colaborador ----
  const [memberEditing, setMemberEditing] = useState<ClubMember | null>(null);
  const [memberRole, setMemberRole] = useState<ClubMemberRole>('operator');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [confirmTransfer, setConfirmTransfer] = useState(false);

  // ---- Código de invitación del club ----
  const [confirmRotate, setConfirmRotate] = useState(false);

  // ---- Configuración del club ----
  const [seededId, setSeededId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [website, setWebsite] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [locating, setLocating] = useState(false);

  /** Rellena el formulario la primera vez que llega el club (sin pisar lo ya editado). */
  useEffect(() => {
    if (!club || seededId === club.id) return;
    setName(club.name);
    setAddress(club.address ?? '');
    setPhone(club.phone ?? '');
    setLatitude(club.latitude != null ? String(club.latitude) : '');
    setLongitude(club.longitude != null ? String(club.longitude) : '');
    setInstagram(club.instagram ?? '');
    setFacebook(club.facebook ?? '');
    setWhatsapp(club.whatsapp ?? '');
    setWebsite(club.website ?? '');
    setPhotoUrl(club.photoUrl ?? null);
    setSeededId(club.id);
  }, [club, seededId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchStats();
    } finally {
      setRefreshing(false);
    }
  };

  const roleOptions: Option[] = COLLABORATOR_ROLES.map((role) => ({
    label: t(roleLabelKey(role)),
    value: role,
  }));

  const tabs: Option[] = [
    { label: t('club.metrics'), value: 'metrics' },
    { label: t('club.team'), value: 'team' },
    { label: t('club.settings'), value: 'settings' },
    { label: t('club.activity'), value: 'activity' },
  ];

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  /** Rellena latitud/longitud con la ubicación actual del dispositivo (opcional). */
  const handleUseCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setFormError(t('club.locationDenied'));
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLatitude(position.coords.latitude.toFixed(7));
      setLongitude(position.coords.longitude.toFixed(7));
      setFormError(null);
    } catch {
      setFormError(t('club.locationError'));
    } finally {
      setLocating(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setFormError(t('club.nameRequired'));
      setSaved(false);
      return;
    }
    try {
      // La foto se sube aparte, borrando la anterior del club.
      let nextPhotoUrl = photoUrl;
      if (photoUri) {
        nextPhotoUrl = await uploadImage(photoUri, 'clubs', photoUrl);
      }
      await updateClub.mutateAsync({
        id: clubId,
        payload: {
          name: name.trim(),
          photoUrl: nextPhotoUrl,
          address: address.trim() || null,
          phone: phone.trim() || null,
          latitude: toNumberOrNull(latitude),
          longitude: toNumberOrNull(longitude),
          instagram: instagram.trim() || null,
          facebook: facebook.trim() || null,
          whatsapp: whatsapp.trim() || null,
          website: website.trim() || null,
        },
      });
      setPhotoUrl(nextPhotoUrl ?? null);
      setPhotoUri(null);
      setFormError(null);
      setSaved(true);
    } catch (error) {
      setFormError(getErrorMessage(error));
      setSaved(false);
    }
  };

  const handleOpenInvite = () => {
    setInviteEmail('');
    setInviteRole('operator');
    setInviteError(null);
    setInviteResult(null);
    setInviteOpen(true);
  };

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setInviteError(t('club.invalidEmail'));
      return;
    }
    try {
      const result = await createInvitation.mutateAsync({ email, role: inviteRole });
      setInviteError(null);
      setInviteResult({
        email: result.invitation.email,
        role: result.invitation.role,
        token: result.invitation.token,
        accepted: result.accepted,
      });
    } catch (error) {
      setInviteError(getErrorMessage(error));
    }
  };

  const handleShareInvite = async () => {
    if (!inviteResult) return;
    await Share.share({
      message: t('club.inviteShareMessage', {
        club: club?.name ?? '',
        role: t(roleLabelKey(inviteResult.role)),
        email: inviteResult.email,
      }),
    });
  };

  const handleSaveRole = async () => {
    if (!memberEditing) return;
    try {
      await updateCollaborator.mutateAsync({ memberId: memberEditing.id, role: memberRole });
      setMemberEditing(null);
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const handleRemoveMember = async () => {
    if (!memberEditing) return;
    try {
      await removeMember.mutateAsync(memberEditing.id);
      setConfirmRemove(false);
      setMemberEditing(null);
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  /** Regenera el código del club: el anterior deja de valer al instante. */
  const handleRotateCode = async () => {
    try {
      await rotateCode.mutateAsync();
      setConfirmRotate(false);
    } catch (error) {
      setFormError(getErrorMessage(error));
      setConfirmRotate(false);
    }
  };

  /** Traspasa la propiedad del club al colaborador seleccionado (el dueño pasa a operador). */
  const handleTransferOwnership = async () => {
    if (!memberEditing) return;
    try {
      await transferOwnership.mutateAsync(memberEditing.userId);
      setConfirmTransfer(false);
      setMemberEditing(null);
    } catch (error) {
      setFormError(getErrorMessage(error));
      setConfirmTransfer(false);
    }
  };

  if (isLoading) {
    return (
      <AppScreen>
        <LoadingView />
      </AppScreen>
    );
  }

  if (!club) {
    return (
      <AppScreen>
        <AppHeader title={t('club.notFound')} showBack />
      </AppScreen>
    );
  }

  return (
    <AppScreen refreshing={refreshing} onRefresh={handleRefresh}>
      <AppHeader title={club.name} subtitle={`#${club.code}`} showBack />

      {canManage ? (
        <AppSegmentedControl value={tab} options={tabs} onChange={setTab} />
      ) : (
        <AppText variant="caption" color={colors.textSecondary} style={styles.hint}>
          {t('club.onlyAdmins')}
        </AppText>
      )}

      {tab === 'metrics' || !canManage ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={230}
            decelerationRate="fast"
            contentContainerStyle={styles.statsRow}
          >
            <StatCard label={t('club.members')} value={stats?.members ?? 0} icon="people" tone="primary" />
            <StatCard label={t('club.collaborators')} value={stats?.collaborators ?? 0} icon="shield-checkmark" tone="info" />
            <StatCard label={t('club.activeTournaments')} value={stats?.activeTournaments ?? 0} icon="trophy" tone="warning" />
            <StatCard label={t('club.cashTables')} value={stats?.tables ?? 0} icon="grid" tone="success" />
          </ScrollView>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={230}
            decelerationRate="fast"
            contentContainerStyle={styles.statsRow}
          >
            <StatCard label={t('club.openTables')} value={stats?.openTables ?? 0} icon="pulse" tone="success" />
            <StatCard label={t('club.tournaments')} value={stats?.tournaments ?? 0} icon="calendar" tone="accent" />
            <StatCard label={t('club.pendingRequests')} value={stats?.pendingMembers ?? 0} icon="person-add" tone="muted" />
            <StatCard label={t('club.pendingInvitations')} value={stats?.pendingInvitations ?? 0} icon="mail" tone="info" />
            <StatCard
              label={t('club.upcomingTournaments')}
              value={stats?.upcomingTournaments ?? 0}
              icon="time-outline"
              tone="accent"
            />
            <StatCard
              label={t('club.expiredInvitations')}
              value={stats?.expiredInvitations ?? 0}
              icon="alert-circle-outline"
              tone="muted"
            />
          </ScrollView>

          <SectionHeader title={t('club.code')} />
          <AppCard padded={false}>
            <ListItem
              title={`#${club.code}`}
              subtitle={t('club.codeHint')}
              icon="key-outline"
              right={
                <AppButton
                  title={t('club.inviteShare')}
                  size="sm"
                  variant="secondary"
                  icon="share-outline"
                  onPress={() => void Share.share({ message: `#${club.code} · ${club.name}` })}
                />
              }
            />
            {canManage ? (
              <ListItem
                title={t('club.rotateCode')}
                subtitle={t('club.rotateCodeMessage')}
                icon="refresh-outline"
                onPress={() => setConfirmRotate(true)}
              />
            ) : null}
          </AppCard>

          {stats ? (
            <>
              <SectionHeader title={t('club.business')} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={230}
                decelerationRate="fast"
                contentContainerStyle={styles.statsRow}
              >
                <StatCard
                  label={t('club.revenue')}
                  value={formatAmount(stats.revenue)}
                  icon="cash-outline"
                  tone="success"
                />
                <StatCard
                  label={t('club.rake')}
                  value={formatAmount(stats.rake)}
                  icon="receipt-outline"
                  tone="warning"
                />
                <StatCard
                  label={t('club.prizePool')}
                  value={formatAmount(stats.prizePool)}
                  icon="trophy-outline"
                  tone="accent"
                />
                <StatCard
                  label={t('club.averageTicket')}
                  value={formatAmount(stats.averageTicket)}
                  icon="pricetag-outline"
                  tone="info"
                />
                <StatCard
                  label={t('club.averageOccupancy')}
                  value={`${stats.averageOccupancy}%`}
                  icon="people-outline"
                  tone="primary"
                />
              </ScrollView>
              <AppText variant="caption" color={colors.textSecondary} style={styles.hint}>
                {`${t('club.businessPeriod', { days: stats.periodDays })} · ${t('club.entriesSummary', {
                  entries: stats.totalEntries,
                  reEntries: stats.reEntries,
                  players: stats.totalPlayers,
                })}`}
              </AppText>
              <AppText variant="caption" color={colors.textSecondary} style={styles.hint}>
                {t('club.currencyNote')}
              </AppText>

              <SectionHeader title={t('club.topPlayers')} />
              <AppCard padded={false}>
                {stats.topPlayers.length === 0 ? (
                  <AppText variant="caption" color={colors.textSecondary} style={styles.empty}>
                    {t('club.topPlayersEmpty')}
                  </AppText>
                ) : (
                  stats.topPlayers.map((player, index) => (
                    <ListItem
                      key={player.userId}
                      title={`${index + 1}. ${player.name}`}
                      subtitle={t('club.topPlayerStats', {
                        tournaments: player.tournaments,
                        reEntries: player.reEntries,
                      })}
                      icon="person-outline"
                    />
                  ))
                )}
              </AppCard>
            </>
          ) : null}
        </>
      ) : null}

      {canManage && tab === 'team' ? (
        <>
          <AppButton title={t('club.invite')} icon="person-add" fullWidth onPress={handleOpenInvite} />

          <SectionHeader title={t('club.collaborators')} />
          <AppCard padded={false}>
            {(collaborators ?? []).length === 0 ? (
              <AppText variant="caption" color={colors.textSecondary} style={styles.empty}>
                {t('club.collaboratorsEmpty')}
              </AppText>
            ) : (
              (collaborators ?? []).map((member) => (
                <ListItem
                  key={member.id}
                  title={member.user?.name ?? `#${member.userId}`}
                  subtitle={member.user?.email ?? ''}
                  icon="person-circle-outline"
                  right={
                    <AppBadge
                      label={t(member.userId === club.adminUserId ? 'club.owner' : roleLabelKey(member.role))}
                      tone={member.role === 'admin' ? 'primary' : 'info'}
                    />
                  }
                  onPress={() => {
                    setMemberEditing(member);
                    setMemberRole(member.role);
                  }}
                />
              ))
            )}
          </AppCard>

          <SectionHeader title={t('club.pendingInvitations')} />
          <AppCard padded={false}>
            {(invitations ?? []).length === 0 ? (
              <AppText variant="caption" color={colors.textSecondary} style={styles.empty}>
                {t('club.invitationsEmpty')}
              </AppText>
            ) : (
              (invitations ?? []).map((invitation) => {
                const statusLabel =
                  invitation.status === 'expired'
                    ? t('club.invitationExpired')
                    : invitation.status === 'accepted'
                      ? t('club.invitationAccepted')
                      : invitation.status === 'revoked'
                        ? t('club.invitationRevoked')
                        : invitation.expiresAt
                          ? t('club.invitationExpiresOn', {
                              date: formatDate(invitation.expiresAt),
                            })
                          : null;
                const canResend =
                  invitation.status === 'pending' || invitation.status === 'expired';

                return (
                  <ListItem
                    key={invitation.id}
                    title={invitation.email}
                    subtitle={[t(roleLabelKey(invitation.role)), statusLabel]
                      .filter(Boolean)
                      .join(' · ')}
                    icon="mail-outline"
                    right={
                      canResend ? (
                        <View style={styles.invitationActions}>
                          <AppButton
                            title={t('club.invitationResend')}
                            size="sm"
                            variant="secondary"
                            loading={resendInvitation.isPending}
                            onPress={() => void resendInvitation.mutateAsync(invitation.id)}
                          />
                          {invitation.status === 'pending' ? (
                            <AppButton
                              title={t('club.invitationRevoke')}
                              size="sm"
                              variant="ghost"
                              loading={revokeInvitation.isPending}
                              onPress={() => void revokeInvitation.mutateAsync(invitation.id)}
                            />
                          ) : null}
                        </View>
                      ) : (
                        <AppBadge label={statusLabel ?? ''} tone="muted" />
                      )
                    }
                  />
                );
              })
            )}
          </AppCard>
        </>
      ) : null}

      {canManage && tab === 'settings' ? (
        <>
          <SectionHeader title={t('club.general')} />
          <AppCard>
            <View style={styles.photoContainer}>
              <Pressable
                onPress={handlePickPhoto}
                style={[styles.photoButton, { borderColor: colors.border }]}
              >
                {photoUri || photoUrl ? (
                  <Image source={{ uri: photoUri ?? buildImageUrl(photoUrl) }} style={styles.photoPreview} />
                ) : (
                  <AppText color={colors.primary}>{t('club.photo')}</AppText>
                )}
              </Pressable>
            </View>

            <AppTextField label={t('club.name')} value={name} onChangeText={setName} placeholder={club.name} />
            <AppTextField
              label={t('club.address')}
              value={address}
              onChangeText={setAddress}
              autoCapitalize="words"
            />
            <AppTextField label={t('club.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          </AppCard>

          <SectionHeader title={t('club.location')} />
          <AppCard>
            <AppTextField
              label={t('club.latitude')}
              value={latitude}
              onChangeText={setLatitude}
              keyboardType="numbers-and-punctuation"
              placeholder="-33.4489000"
            />
            <AppTextField
              label={t('club.longitude')}
              value={longitude}
              onChangeText={setLongitude}
              keyboardType="numbers-and-punctuation"
              placeholder="-70.6693000"
            />
            <AppButton
              title={t('club.useCurrentLocation')}
              icon="locate-outline"
              variant="secondary"
              loading={locating}
              fullWidth
              onPress={handleUseCurrentLocation}
            />
          </AppCard>

          <SectionHeader title={t('club.social')} />
          <AppCard>
            <AppTextField
              label={t('club.instagram')}
              value={instagram}
              onChangeText={setInstagram}
              autoCapitalize="none"
              placeholder="@miclub"
            />
            <AppTextField
              label={t('club.facebook')}
              value={facebook}
              onChangeText={setFacebook}
              autoCapitalize="none"
            />
            <AppTextField
              label={t('club.whatsapp')}
              value={whatsapp}
              onChangeText={setWhatsapp}
              keyboardType="phone-pad"
            />
            <AppTextField
              label={t('club.website')}
              value={website}
              onChangeText={setWebsite}
              autoCapitalize="none"
              keyboardType="url"
              placeholder="https://"
            />
          </AppCard>

          {formError ? (
            <AppText variant="caption" color={colors.danger} style={styles.hint}>
              {formError}
            </AppText>
          ) : null}
          {saved && !formError ? (
            <AppText variant="caption" color={colors.success} style={styles.hint}>
              {t('club.saved')}
            </AppText>
          ) : null}

          <AppButton
            title={t('club.save')}
            icon="save-outline"
            fullWidth
            loading={updateClub.isPending}
            onPress={handleSave}
          />
        </>
      ) : null}

      {canManage && tab === 'activity' ? (
        <>
          <SectionHeader title={t('club.activity')} />
          <AppText variant="caption" color={colors.textSecondary} style={styles.hint}>
            {t('club.activityHint')}
          </AppText>
          <AppCard padded={false}>
            {(auditLog ?? []).length === 0 ? (
              <AppText variant="caption" color={colors.textSecondary} style={styles.empty}>
                {t('club.activityEmpty')}
              </AppText>
            ) : (
              (auditLog ?? []).map((entry) => (
                <ListItem
                  key={entry.id}
                  title={t(AUDIT_ACTION_KEYS[entry.action])}
                  subtitle={entry.summary ?? entry.actorName ?? ''}
                  icon={auditIcon(entry.action)}
                  right={<AppBadge label={formatDateTime(entry.createdAt)} tone="muted" />}
                />
              ))
            )}
          </AppCard>
        </>
      ) : null}

      {/* Invitar a un colaborador: se asigna su permiso y se comparte el código */}
      <AppModal
        visible={inviteOpen}
        title={t('club.inviteTitle', { club: club.name })}
        onClose={() => setInviteOpen(false)}
      >
        {inviteResult ? (
          <View>
            <AppText variant="subtitle">{t('club.inviteCreated')}</AppText>
            <AppText variant="caption" style={styles.code}>
              {inviteResult.token}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary} style={styles.hint}>
              {inviteResult.accepted
                ? t('club.inviteAccepted')
                : t('club.inviteShareHint', { email: inviteResult.email })}
            </AppText>
            <AppButton
              title={t('club.inviteShare')}
              icon="share-outline"
              fullWidth
              onPress={handleShareInvite}
            />
            <AppButton
              title={t('common.close')}
              variant="ghost"
              fullWidth
              style={styles.modalAction}
              onPress={() => setInviteOpen(false)}
            />
          </View>
        ) : (
          <View>
            <AppTextField
              label={t('club.inviteEmail')}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder={t('club.inviteEmailPlaceholder')}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              error={inviteError ?? undefined}
            />
            <AppSelect
              label={t('club.inviteRole')}
              value={inviteRole}
              options={roleOptions}
              onSelect={(value) => setInviteRole(value as ClubMemberRole)}
            />
            <AppButton
              title={t('club.inviteSend')}
              icon="paper-plane-outline"
              fullWidth
              loading={createInvitation.isPending}
              onPress={handleInvite}
            />
          </View>
        )}
      </AppModal>

      {/* Permisos del colaborador seleccionado */}
      <AppModal
        visible={memberEditing != null}
        title={memberEditing?.user?.name ?? t('club.changeRole')}
        onClose={() => setMemberEditing(null)}
      >
        {memberEditing ? (
          <View>
            <AppText variant="caption" color={colors.textSecondary} style={styles.hint}>
              {memberEditing.user?.email}
            </AppText>
            <AppSelect
              label={t('club.inviteRole')}
              value={memberRole}
              options={roleOptions}
              onSelect={(value) => setMemberRole(value as ClubMemberRole)}
            />
            <AppButton
              title={t('common.saveChanges')}
              fullWidth
              loading={updateCollaborator.isPending}
              onPress={handleSaveRole}
            />
            {memberEditing.userId === club.adminUserId ? (
              <AppText variant="caption" color={colors.textSecondary} style={styles.hint}>
                {t('club.owner')}
              </AppText>
            ) : (
              <>
                {isOwner ? (
                  <AppButton
                    title={t('club.transferOwnership')}
                    variant="secondary"
                    icon="swap-horizontal-outline"
                    fullWidth
                    style={styles.modalAction}
                    onPress={() => setConfirmTransfer(true)}
                  />
                ) : null}
                <AppButton
                  title={t('club.removeCollaborator')}
                  variant="danger"
                  icon="trash-outline"
                  fullWidth
                  style={styles.modalAction}
                  onPress={() => setConfirmRemove(true)}
                />
              </>
            )}
          </View>
        ) : null}
      </AppModal>

      <ConfirmModal
        visible={confirmRemove}
        title={t('club.removeCollaboratorTitle')}
        message={t('club.removeCollaboratorMessage', {
          name: memberEditing?.user?.name ?? memberEditing?.user?.email ?? '',
        })}
        confirmLabel={t('club.removeCollaborator')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={removeMember.isPending}
        onConfirm={handleRemoveMember}
        onCancel={() => setConfirmRemove(false)}
      />

      {/* Regenerar el código del club: invalida el anterior */}
      <ConfirmModal
        visible={confirmRotate}
        title={t('club.rotateCodeTitle')}
        message={t('club.rotateCodeMessage')}
        confirmLabel={t('club.rotateCode')}
        cancelLabel={t('common.cancel')}
        loading={rotateCode.isPending}
        onConfirm={handleRotateCode}
        onCancel={() => setConfirmRotate(false)}
      />

      {/* Traspaso de propiedad: el nuevo dueño pasa a admin y el anterior a operador */}
      <ConfirmModal
        visible={confirmTransfer}
        title={t('club.transferOwnershipTitle')}
        message={t('club.transferOwnershipMessage', {
          name: memberEditing?.user?.name ?? memberEditing?.user?.email ?? '',
        })}
        confirmLabel={t('club.transferOwnership')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={transferOwnership.isPending}
        onConfirm={handleTransferOwnership}
        onCancel={() => setConfirmTransfer(false)}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  statsRow: { gap: 10, paddingRight: 8, marginBottom: 10 },
  hint: { marginBottom: 12 },
  empty: { padding: 16 },
  code: { letterSpacing: 1, marginVertical: 8 },
  modalAction: { marginTop: 8 },
  invitationActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  photoContainer: { alignItems: 'center', marginBottom: 20 },
  photoButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photoPreview: { width: '100%', height: '100%' },
});
