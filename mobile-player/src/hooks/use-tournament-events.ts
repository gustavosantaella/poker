import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import EventSource from 'react-native-sse';
import { API_URL } from '@/api/config';
import { getStoredToken } from '@/api/client';
import { Paginated, Tournament } from '@/api/types';

/**
 * Suscripción SSE al tiempo real de torneos:
 * - Sin `tournamentId`: eventos globales de cualquier torneo (listados).
 * - Con `tournamentId`: solo ese torneo + snapshot inicial (detalle).
 * Al recibir eventos actualiza el caché de TanStack Query EN EL SITIO (sin refetch
 * REST): así el listado se mantiene fresco por SSE sin golpear la API y sin caer
 * en throttling (429).
 */

/** Reemplaza/inserta el torneo en la caché del listado manteniendo el orden por fecha. */
function upsertTournamentInList(
  old: Paginated<Tournament>,
  data: Tournament,
): Paginated<Tournament> {
  const next = [data, ...old.items.filter((t) => t.id !== data.id)].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
  );
  // Si la página estaba completa, respetar el límite descartando el más antiguo.
  const wasComplete = old.items.length >= (old.total ?? 0);
  return {
    ...old,
    items: wasComplete ? next.slice(0, old.items.length) : next,
    total: wasComplete ? next.length : Math.max(old.total, next.length),
  };
}

export function useTournamentEvents(tournamentId?: number) {
  const qc = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    let source: EventSource<string> | null = null;

    (async () => {
      const token = await getStoredToken();
      if (!token || cancelled) return;
      const endpoint =
        tournamentId != null ? `/realtime/tournaments/${tournamentId}/events` : '/realtime/events';
      const url = `${API_URL}${endpoint}?token=${encodeURIComponent(token)}`;

      source = new EventSource<string>(url, { pollingInterval: 5000 });
      source.addEventListener('open', () => {
        // Conexión establecida; react-native-sse reconecta automáticamente.
      });
      source.addEventListener('tournament:updated', (event) => {
        try {
          const data = JSON.parse(event.data ?? '{}') as Tournament;
          if (data?.id != null) {
            // Detalle: actualiza la entrada [id] directamente (sin refetch).
            qc.setQueryData(['tournaments', data.id], data);
            // Listado: reemplaza/inserta el item en caché, sin refetch REST.
            qc.setQueryData<Paginated<Tournament>>(['tournaments'], (old) =>
              old ? upsertTournamentInList(old, data) : old,
            );
          }
        } catch {
          // Payload no JSON: se ignora.
        }
      });
      source.addEventListener('reservation:updated', () => {
        void qc.invalidateQueries({ queryKey: ['tournament-reservations'] });
        void qc.invalidateQueries({ queryKey: ['my-tournament-reservations'] });
      });
      source.addEventListener('reservation:removed', () => {
        void qc.invalidateQueries({ queryKey: ['tournament-reservations'] });
        void qc.invalidateQueries({ queryKey: ['my-tournament-reservations'] });
      });
      source.addEventListener('tournament:chips', () => {
        void qc.invalidateQueries({ queryKey: ['tournament-chips'] });
      });
      source.addEventListener('tournament:prizes', () => {
        void qc.invalidateQueries({ queryKey: ['tournament-prizes'] });
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
  }, [tournamentId, qc]);
}
