import { Ionicons } from '@expo/vector-icons';
import { ClubCashMethod, ClubCashMovementType, ClubCashStatus } from '@/api/types';
import { BadgeTone } from '@/components/ui/AppBadge';
import { TranslationKey } from '@/i18n';

/** Periodos rápidos del módulo de recaudación. */
export type ClubCashPeriod = 'today' | 'week' | 'month' | 'all';

/** Filtro `from`/`to` (YYYY-MM-DD local) que corresponde a cada periodo. */
export function cashPeriodQuery(period: ClubCashPeriod): { from?: string; to: string } {
  const to = localDayKey(new Date());
  if (period === 'all') return { from: '2000-01-01', to };
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  if (period === 'week') from.setDate(from.getDate() - 6);
  if (period === 'month') from.setDate(from.getDate() - 29);
  return { from: localDayKey(from), to };
}

/** Fecha local en formato `YYYY-MM-DD` (evita el desfase de `toISOString`). */
export function localDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Clave i18n del nombre de un tipo de movimiento. */
export function cashTypeLabelKey(type: ClubCashMovementType): TranslationKey {
  return `club.cash.type.${type}` as TranslationKey;
}

/** Clave i18n del nombre de una forma de pago. */
export function cashMethodLabelKey(method: ClubCashMethod): TranslationKey {
  return `club.cash.method.${method}` as TranslationKey;
}

/** Clave i18n del estado de cobro. */
export function cashStatusLabelKey(status: ClubCashStatus): TranslationKey {
  return `club.cash.status.${status}` as TranslationKey;
}

/** Color del distintivo según el estado de cobro. */
export function cashStatusTone(status: ClubCashStatus): BadgeTone {
  if (status === 'paid') return 'success';
  if (status === 'pending') return 'warning';
  return 'muted';
}

/** Icono del movimiento según su tipo. */
export function cashTypeIcon(type: ClubCashMovementType): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'entry':
      return 'log-in-outline';
    case 're_entry':
      return 'refresh-outline';
    case 'add_on':
      return 'add-circle-outline';
    case 'prize':
      return 'trophy-outline';
    case 'expense':
      return 'cart-outline';
    case 'withdrawal':
      return 'arrow-up-circle-outline';
    case 'deposit':
      return 'arrow-down-circle-outline';
    default:
      return 'swap-horizontal-outline';
  }
}

/** Formas de pago ofrecidas en los formularios. */
export const CASH_METHOD_VALUES: ClubCashMethod[] = ['cash', 'card', 'transfer', 'other'];

/** Tipos de movimiento que se pueden registrar a mano. */
export const CASH_MANUAL_TYPES: ClubCashMovementType[] = [
  'deposit',
  'expense',
  'withdrawal',
  'add_on',
  'entry',
  're_entry',
  'prize',
  'adjustment',
];

/** Tipos que obligan a indicar torneo y jugador. */
export const CASH_PLAYER_TYPES: ClubCashMovementType[] = ['entry', 're_entry', 'add_on', 'prize'];
