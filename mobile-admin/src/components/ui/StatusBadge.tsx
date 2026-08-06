import { TableStatus, TournamentStatus } from '@/api/types';
import { labelFor, TABLE_STATUS_OPTIONS, TOURNAMENT_STATUS_OPTIONS } from '@/constants';
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
  return <AppBadge label={labelFor(TABLE_STATUS_OPTIONS, status)} tone={TABLE_TONES[status]} />;
}

export function TournamentStatusBadge({ status }: { status: TournamentStatus }) {
  return (
    <AppBadge label={labelFor(TOURNAMENT_STATUS_OPTIONS, status)} tone={TOURNAMENT_TONES[status]} />
  );
}