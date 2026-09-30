import { useEffect, useMemo, useState } from 'react';
import { ClubCashMethod, ClubCashMovementType } from '@/api/types';
import { AppButton } from '@/components/ui/AppButton';
import { AppModal } from '@/components/ui/AppModal';
import { AppSelect } from '@/components/ui/AppSelect';
import { AppText } from '@/components/ui/AppText';
import { AppTextField } from '@/components/ui/AppTextField';
import { Option } from '@/constants';
import {
  useClubCashTournament,
  useClubCashTournaments,
  useClubMembers,
  useCreateClubCashMovement,
} from '@/hooks/use-queries';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import {
  CASH_MANUAL_TYPES,
  CASH_METHOD_VALUES,
  CASH_PLAYER_TYPES,
  cashMethodLabelKey,
  cashTypeLabelKey,
  localDayKey,
} from '@/utils/cash';
import { getErrorMessage } from '@/utils/error';

export interface ClubCashMovementModalProps {
  clubId: number;
  visible: boolean;
  onClose: () => void;
  /** Torneo preseleccionado (al registrar desde el detalle de un torneo). */
  defaultTournamentId?: number | null;
  /** Aviso para mostrar en la pantalla al guardar. */
  onSaved?: (message: string) => void;
}

/**
 * Registro manual de un movimiento de caja: gastos, ingresos, retiradas,
 * ajustes, add-ons, entradas y premios del club.
 */
export function ClubCashMovementModal({
  clubId,
  visible,
  onClose,
  defaultTournamentId,
  onSaved,
}: ClubCashMovementModalProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const activeClubId = visible ? clubId : 0;

  const [type, setType] = useState<ClubCashMovementType>('deposit');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<ClubCashMethod>('cash');
  const [tournamentId, setTournamentId] = useState<number | null>(defaultTournamentId ?? null);
  const [userId, setUserId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createMovement = useCreateClubCashMovement(clubId);
  const { data: tournaments } = useClubCashTournaments(activeClubId, {
    from: '2000-01-01',
    to: localDayKey(new Date()),
  });
  const { data: members } = useClubMembers(activeClubId);
  const { data: tournamentDetail } = useClubCashTournament(activeClubId, tournamentId ?? 0);

  // Cada vez que se abre, el formulario arranca limpio.
  useEffect(() => {
    if (!visible) return;
    setType('deposit');
    setAmount('');
    setMethod('cash');
    setTournamentId(defaultTournamentId ?? null);
    setUserId(null);
    setNote('');
    setError(null);
  }, [visible, defaultTournamentId]);

  const typeOptions: Option[] = useMemo(
    () => CASH_MANUAL_TYPES.map((value) => ({ value, label: t(cashTypeLabelKey(value)) })),
    [t],
  );
  const methodOptions: Option[] = useMemo(
    () => CASH_METHOD_VALUES.map((value) => ({ value, label: t(cashMethodLabelKey(value)) })),
    [t],
  );
  const tournamentOptions: Option[] = useMemo(
    () => (tournaments ?? []).map((item) => ({ value: String(item.tournamentId), label: item.name })),
    [tournaments],
  );
  const playerOptions: Option[] = useMemo(() => {
    const options = new Map<number, string>();
    for (const member of members ?? []) {
      if (member.status === 'accepted' && member.user) {
        options.set(member.userId, member.user.name ?? member.user.email);
      }
    }
    for (const player of tournamentDetail?.players ?? []) {
      if (!options.has(player.userId)) options.set(player.userId, player.name);
    }
    return [...options.entries()].map(([value, label]) => ({ value: String(value), label }));
  }, [members, tournamentDetail]);

  const needsPlayer = CASH_PLAYER_TYPES.includes(type);

  const handleSave = async () => {
    const parsedAmount = Number(amount.trim().replace(',', '.'));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError(t('club.cash.amountRequired'));
      return;
    }
    if (needsPlayer && (!tournamentId || !userId)) {
      setError(t('club.cash.playerRequired'));
      return;
    }
    try {
      await createMovement.mutateAsync({
        type,
        amount: parsedAmount,
        method,
        status: 'paid',
        direction: type === 'adjustment' ? 'in' : undefined,
        tournamentId: needsPlayer ? (tournamentId ?? undefined) : undefined,
        userId: needsPlayer ? (userId ?? undefined) : undefined,
        note: note.trim() || undefined,
      });
      onSaved?.(t('club.cash.movementSaved'));
      onClose();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    }
  };

  return (
    <AppModal
      visible={visible}
      title={t('club.cash.addMovement')}
      onClose={onClose}
      footer={
        <>
          <AppButton
            title={t('common.cancel')}
            variant="secondary"
            style={{ flex: 1 }}
            onPress={onClose}
            disabled={createMovement.isPending}
          />
          <AppButton
            title={t('club.cash.saveMovement')}
            style={{ flex: 1 }}
            loading={createMovement.isPending}
            onPress={() => void handleSave()}
          />
        </>
      }
    >
      <AppSelect
        label={t('club.cash.movementType')}
        value={type}
        options={typeOptions}
        onSelect={(value) => setType(value as ClubCashMovementType)}
      />
      <AppTextField
        label={t('club.cash.amount')}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="0.00"
      />
      <AppSelect
        label={t('club.cash.method')}
        value={method}
        options={methodOptions}
        onSelect={(value) => setMethod(value as ClubCashMethod)}
      />
      {needsPlayer ? (
        <>
          <AppSelect
            label={t('club.cash.tournament')}
            value={tournamentId ? String(tournamentId) : undefined}
            options={tournamentOptions}
            onSelect={(value) => {
              setTournamentId(Number(value));
              setUserId(null);
            }}
          />
          <AppSelect
            label={t('club.cash.player')}
            value={userId ? String(userId) : undefined}
            options={playerOptions}
            onSelect={(value) => setUserId(Number(value))}
          />
        </>
      ) : null}
      <AppTextField
        label={t('club.cash.note')}
        value={note}
        onChangeText={setNote}
        placeholder={t('club.cash.notePlaceholder')}
      />
      {error ? (
        <AppText variant="caption" color={colors.danger} style={{ marginTop: 4 }}>
          {error}
        </AppText>
      ) : null}
    </AppModal>
  );
}

