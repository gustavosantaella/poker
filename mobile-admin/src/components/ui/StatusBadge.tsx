import { TableStatus, TournamentStatus } from '@/api/types';
import { TranslationKey } from '@/i18n';
import { useI18n } from '@/i18n/I18nProvider';
import { AppBadge, BadgeTone } from './AppBadge';

const TABLE_TONES: Record<TableStatus, BadgeTone> = {
  open: 'success',
  running: 'primary',
  paused: 'warning',
  closed: 'muted',
};

const TOURNAMENT_TONES: Record<TournamentStatus, BadgeTone> = {
  scheduled: 'warning',
  registering: 'success',
  running: 'primary',
  paused: 'warning',
  completed: 'muted',
  cancelled: 'danger',
};

export function TableStatusBadge({ status }: { status: TableStatus }) {
  const { t } = useI18n();
  return <AppBadge label={t(`status.${status}` as TranslationKey)} tone={TABLE_TONES[status]} />;
}

export function TournamentStatusBadge({ status }: { status: TournamentStatus }) {
  const { t } = useI18n();
  return <AppBadge label={t(`status.${status}` as TranslationKey)} tone={TOURNAMENT_TONES[status]} />;
}