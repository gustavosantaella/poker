import { Injectable } from '@nestjs/common';

export interface RealtimeEvent {
  type: string;
  data: unknown;
}

export type RealtimeListener = (event: RealtimeEvent) => void;

/**
 * Pub/sub en memoria para eventos en tiempo real (SSE).
 * `emit(tournamentId, type, data)` notifica a los suscriptores globales y a los
 * del torneo concreto; `emitClub(clubId, ...)` a los del panel de un club.
 */
@Injectable()
export class RealtimeService {
  private readonly globalListeners = new Set<RealtimeListener>();
  private readonly tournamentListeners = new Map<number, Set<RealtimeListener>>();
  private readonly clubListeners = new Map<number, Set<RealtimeListener>>();

  subscribeGlobal(listener: RealtimeListener): () => void {
    this.globalListeners.add(listener);
    return () => {
      this.globalListeners.delete(listener);
    };
  }

  /** Suscripción a los eventos de un club (dashboard en vivo). */
  subscribeClub(clubId: number, listener: RealtimeListener): () => void {
    let listeners = this.clubListeners.get(clubId);
    if (!listeners) {
      listeners = new Set();
      this.clubListeners.set(clubId, listeners);
    }
    listeners.add(listener);
    return () => {
      listeners?.delete(listener);
      if (listeners && listeners.size === 0) {
        this.clubListeners.delete(clubId);
      }
    };
  }

  /**
   * Avisa a los paneles abiertos del club de que algo cambió.
   * El evento lleva solo la acción (sin datos sensibles): la app refresca por API.
   */
  emitClub(clubId: number, type: string, data: unknown): void {
    const event: RealtimeEvent = { type, data };
    for (const listener of this.clubListeners.get(clubId) ?? []) {
      listener(event);
    }
  }

  subscribe(tournamentId: number, listener: RealtimeListener): () => void {
    let listeners = this.tournamentListeners.get(tournamentId);
    if (!listeners) {
      listeners = new Set();
      this.tournamentListeners.set(tournamentId, listeners);
    }
    listeners.add(listener);
    return () => {
      listeners?.delete(listener);
      if (listeners && listeners.size === 0) {
        this.tournamentListeners.delete(tournamentId);
      }
    };
  }

  emit(tournamentId: number, type: string, data: unknown): void {
    const event: RealtimeEvent = { type, data };
    for (const listener of this.globalListeners) {
      listener(event);
    }
    for (const listener of this.tournamentListeners.get(tournamentId) ?? []) {
      listener(event);
    }
  }
}
