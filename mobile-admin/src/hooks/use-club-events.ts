import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import EventSource from 'react-native-sse';
import { API_URL } from '@/api/config';
import { getStoredToken } from '@/api/client';

/**
 * Suscripción SSE al panel de un club (`/realtime/clubs/:id/events`).
 *
 * El backend emite `club:updated` cada vez que cambia algo del club (equipo,
 * permisos, invitaciones, torneos, mesas, configuración...). El evento solo lleva
 * la acción; aquí se invalidan las consultas afectadas para que el dashboard se
 * refresque en vivo sin sondeo periódico.
 */
export function useClubEvents(clubId?: number) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!clubId || clubId <= 0) return;
    let cancelled = false;
    let source: EventSource<string> | null = null;

    (async () => {
      const token = await getStoredToken();
      if (!token || cancelled) return;
      const url = `${API_URL}/realtime/clubs/${clubId}/events?token=${encodeURIComponent(token)}`;

      source = new EventSource<string>(url, { pollingInterval: 5000 });
      source.addEventListener('open', () => {
        // Conexión establecida; react-native-sse reconecta automáticamente.
      });
      source.addEventListener('club:updated', () => {
        void qc.invalidateQueries({ queryKey: ['clubs', clubId] });
        void qc.invalidateQueries({ queryKey: ['clubs', clubId, 'stats'] });
        void qc.invalidateQueries({ queryKey: ['clubs', clubId, 'members'] });
        void qc.invalidateQueries({ queryKey: ['clubs', clubId, 'collaborators'] });
        void qc.invalidateQueries({ queryKey: ['clubs', clubId, 'invitations'] });
        void qc.invalidateQueries({ queryKey: ['clubs', clubId, 'audit'] });
      });
      source.addEventListener('error', () => {
        // La librería reconecta automáticamente.
      });
    })();

    return () => {
      cancelled = true;
      source?.removeAllEventListeners();
      source?.close();
    };
  }, [clubId, qc]);
}
