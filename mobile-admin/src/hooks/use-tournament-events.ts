import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import EventSource from 'react-native-sse';
import { API_URL } from '@/api/config';
import { getStoredToken } from '@/api/client';

/**
 * Suscripción SSE al tiempo real de torneos:
 * - Sin `tournamentId`: eventos globales de cualquier torneo (listados).
 * - Con `tournamentId`: solo ese torneo + snapshot inicial (detalle).
 * Al recibir eventos actualiza el caché de TanStack Query y refresca las queries
 * afectadas (torneos, reservas, fichas, premios).
 */
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
          const data = JSON.parse(event.data ?? '{}');
          if (data?.id != null) {
            qc.setQueryData(['tournaments', data.id], data);
            void qc.invalidateQueries({ queryKey: ['tournaments'] });
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
