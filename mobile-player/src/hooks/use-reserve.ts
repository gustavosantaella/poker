import { useState } from 'react';
import { getErrorMessage } from '@/utils/error';

export interface ReserveTarget {
  id: number;
  name: string;
}

/** Flujo reutilizable de reserva: confirmar, llamar al backend y marcar como reservado. */
export function useReserve(reserveFn: (target: ReserveTarget, userId: number) => Promise<unknown>) {
  const [target, setTarget] = useState<ReserveTarget | null>(null);
  const [reservedIds, setReservedIds] = useState<Set<number>>(new Set());
  const [modalError, setModalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const open = (item: ReserveTarget) => {
    setModalError(null);
    setTarget(item);
  };
  const close = () => setTarget(null);

  const confirm = async (userId: number) => {
    if (!target) return;
    setLoading(true);
    setModalError(null);
    try {
      await reserveFn(target, userId);
      setReservedIds((prev) => new Set(prev).add(target.id));
      setTarget(null);
    } catch (e) {
      setModalError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return {
    target,
    reservedIds,
    modalError,
    loading,
    open,
    close,
    confirm,
    isReserved: (id: number) => reservedIds.has(id),
  };
}
