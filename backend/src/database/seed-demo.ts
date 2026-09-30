/**
 * Seeder de DEMOSTRACIÓN: deja el club lleno de datos "listos para ver"
 * (jugadores asociados a torneos, torneos en todos los estados, reservas en
 * mesa y movimientos de caja).
 *
 * Dos modos de siembra (`SEED_MODE`):
 *
 * - `db` (por defecto): escribe DIRECTO en la base de datos con TypeORM, igual
 *   que `seed.ts`. No hace falta el backend en marcha, no choca con el límite de
 *   5 peticiones/min de `/auth` y termina en segundos. Escribe exactamente lo
 *   mismo que produciría la API: contadores denormalizados del torneo, mesas y
 *   asientos asignados, `blindStructure`, premios por puesto y libro de caja con
 *   `sourceKey`/comisión congelada (idempotente por clave de origen).
 * - `api`: usa la API real (respeta también la auditoría del club y emite SSE).
 *   Requiere `npm run start:dev`; es más lento porque /auth está limitado a
 *   5 peticiones por minuto y por IP.
 *
 * En ambos modos cada torneo queda con **los 12 jugadores del roster asignados**,
 * con estados propios de su fase (aceptados y sentados en mesa/asiento, pendientes,
 * rechazados, levantados y eliminados) y las mesas necesarias para los aceptados.
 *
 * Uso:
 *   npm run seed:demo                       → siembra directa en la BD (recomendado)
 *   $env:SEED_MODE="api"; npm run seed:demo → siembra a través de la API (backend arriba)
 *
 * Variables de entorno (todas opcionales):
 *   SEED_MODE            `db` (por defecto) o `api`
 *   SEED_API_URL         URL de la API             (por defecto http://localhost:3000/api)
 *   SEED_ADMIN_EMAIL     Admin del club            (por defecto admin@pokelap.com)
 *   SEED_ADMIN_PASSWORD  Contraseña del admin      (por defecto Admin123!)
 *   SEED_PLAYER_PASSWORD Contraseña de los jugadores (por defecto Player123!)
 *   SEED_CLUB_NAME       Club a poblar             (por defecto: el primero del admin)
 *   SEED_TOKENS=1        Imprime los JWT de las cuentas demo al terminar (solo `api`)
 *
 * Es idempotente: cada torneo se busca por nombre y cada jugador por email, así
 * que se puede ejecutar varias veces sin duplicar torneos, reservas ni cobros.
 */
import * as bcrypt from "bcryptjs";
import { DataSource, In, Repository } from "typeorm";
import { DEFAULT_CURRENCY } from "../common/constants/currencies";
import {
  CLUB_CASH_TYPE_DIRECTION,
  CLUB_CASH_VOID_NOTE,
  ClubCashDirection,
  ClubCashMovement,
  ClubCashMovementStatus,
  ClubCashMovementType,
  ClubCashPaymentMethod,
} from "../modules/cash/entities/club-cash-movement.entity";
import { Club } from "../modules/clubs/entities/club.entity";
import {
  ClubMember,
  ClubMemberRole,
  ClubMemberStatus,
} from "../modules/clubs/entities/club-member.entity";
import { GameType } from "../modules/game-types/entities/game-type.entity";
import { buildBlindStructure } from "../modules/tournaments/blind-structure.builder";
import { TournamentPrize } from "../modules/tournaments/entities/tournament-prize.entity";
import {
  ReservationStatus,
  TournamentReservation,
} from "../modules/tournaments/entities/tournament-reservation.entity";
import {
  Tournament,
  TournamentMode,
  TournamentStatus,
} from "../modules/tournaments/entities/tournament.entity";
import { User, UserRole } from "../modules/users/entities/user.entity";
import typeormConfig from "./typeorm.config";

// ---------------- Configuración ----------------

const API_URL = (
  process.env.SEED_API_URL ?? "http://localhost:3000/api"
).replace(/\/+$/, "");
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@pokelap.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";
const PLAYER_PASSWORD = process.env.SEED_PLAYER_PASSWORD ?? "Player123!";
const CLUB_NAME = (process.env.SEED_CLUB_NAME ?? "").trim();
const PRINT_TOKENS = process.env.SEED_TOKENS === "1";
/** Reintentos ante `429 Too Many Requests` (el login está limitado a 5/minuto por IP). */
const MAX_THROTTLE_RETRIES = 15;
/** Ventana del throttler de `/auth/*`: 5 peticiones por minuto e IP (`@Throttle`). */
const AUTH_WINDOW_MS = 60_000;
const AUTH_PER_WINDOW = 5;
/** Separación mínima entre llamadas de autenticación (60s / 5 = 12s, con un extra de margen). */
const AUTH_GAP_MS = Math.ceil(60_000 / 5) + 1_000;
let lastAuthAt = 0;

/**
 * Ritmo de las llamadas a `/auth/*`. Este script entra con el admin y con una docena de
 * jugadores, y el backend solo admite 5 peticiones por minuto e IP: se deja pasar una
 * llamada cada 13 s para no encadenar `429 Too Many Requests`.
 */
async function paceAuth(): Promise<void> {
  const waitMs = lastAuthAt + AUTH_GAP_MS - Date.now();
  if (waitMs > 0) {
    info(
      `esperando ${Math.ceil(waitMs / 1000)}s para no superar el límite de /auth (5/min)…`,
    );
    await sleep(waitMs);
  }
  lastAuthAt = Date.now();
}

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
type ReservationState =
  "pending" | "accepted" | "rejected" | "stood_up" | "eliminated";

class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly method: string,
    readonly path: string,
    message: string,
  ) {
    super(`${method} ${path} → ${status} ${message}`);
    this.name = "ApiError";
  }
}

/** `setTimeout` en promesa (para esperar cuando la API limita peticiones). */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Llama a la API y devuelve el contenido de `data` (el backend envuelve todo en `{ data }`).
 *
 * `/auth/login` y `/auth/register` están limitados a 5 peticiones por minuto e IP
 * (`@Throttle`), y este script inicia sesión con una docena de jugadores: cuando la API
 * responde 429 se espera lo que pida `Retry-After` y se reintenta la misma llamada.
 */
async function api<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    if (response.status === 429 && attempt < MAX_THROTTLE_RETRIES) {
      const retryAfter = Number(response.headers.get("retry-after") ?? 0);
      const waitMs = retryAfter > 0 ? retryAfter * 1000 : 15_000;
      warn(
        `${method} ${path} → 429 limitado por la API, esperando ${Math.round(waitMs / 1000)}s…`,
      );
      await sleep(waitMs);
      continue;
    }
    const text = await response.text();
    let payload: { data?: T; message?: string | string[] } = {};
    if (text) {
      try {
        payload = JSON.parse(text) as { data?: T; message?: string | string[] };
      } catch {
        payload = {};
      }
    }
    if (!response.ok) {
      const message = Array.isArray(payload.message)
        ? payload.message.join(" · ")
        : (payload.message ?? response.statusText);
      throw new ApiError(response.status, method, path, String(message));
    }
    return payload.data as T;
  }
}

// ---------------- Tipos de las respuestas que usamos ----------------

interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface Session {
  token: string;
  user: AuthUser;
}

interface ClubDto {
  id: number;
  code: string;
  name: string;
  adminUserId: number;
}

interface MemberDto {
  id: number;
  clubId: number;
  userId: number;
  status: string;
  role: string;
}

interface PaginatedDto<T> {
  items: T[];
  total: number;
}

interface GameTypeDto {
  id: number;
  name: string;
}

interface TournamentDto {
  id: number;
  name: string;
  status: TournamentStatus;
  startDate: string | null;
  buyIn: number | string;
  fee: number | string;
  currentPlayers: number;
  reservedPlayers: number;
  currentReEntries: number;
  /** Mesas configuradas (se usa en el resumen de la siembra). */
  tableCount?: number | null;
}

interface ReservationDto {
  id: number;
  userId: number;
  status: ReservationState;
  reEntries: number;
  tableNumber: number | null;
  seatNumber: number | null;
}

interface MovementDto {
  id: number;
  type: ClubCashMovementType;
  status: string;
  amount: number | string;
  userId: number | null;
  tournamentId: number | null;
  note: string | null;
}

interface CashSummaryDto {
  currency: string;
  collected: number;
  paidOut: number;
  net: number;
  pendingIn: number;
  pendingOut: number;
  balance: number;
  commission: number;
  prizePot: number;
  entries: number;
  reEntries: number;
  addOns: number;
  pendingCount: number;
  paidCount: number;
}

interface RosterEntry {
  user: AuthUser;
  token: string;
  memberId: number | null;
}

// ---------------- Utilidades ----------------

const info = (message: string): void => console.log(`Seed-demo: ${message}`);
const ok = (message: string): void => console.log(`Seed-demo:   ✓ ${message}`);
const warn = (message: string): void =>
  console.log(`Seed-demo:   ! ${message}`);
/** Mensaje corto de un error cualquiera (para los avisos de la siembra vía API). */
const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Fecha `días` a partir de hoy a la hora indicada. */
function daysFromNow(days: number, hour: number, minute = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

/** Fecha `minutos` atrás respecto a ahora (para torneos en curso). */
function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60_000);
}

/** Fecha `YYYY-MM-DD` en hora local (formato que espera el módulo de caja). */
function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Día en el que el dinero entra o sale de la caja: el día del torneo y, si el
 * torneo todavía no ha empezado, hoy. Cobrar una pre-inscripción con fecha
 * futura dejaría el dinero fuera de la caja del día (mismo criterio que
 * `CashService`), así que el seed nunca anota movimientos en el futuro.
 */
function cashDay(startDate: Date, reference: Date = new Date()): Date {
  const day = new Date(startDate.getTime());
  return day.getTime() > reference.getTime()
    ? new Date(reference.getTime())
    : day;
}

/** Reparto descendente de un bolo entre los puestos pagados (el último ajusta el total). */
function splitPrize(
  total: number,
  places: number,
): { place: number; amount: number }[] {
  if (total <= 0 || places <= 0) return [];
  if (places === 1) return [{ place: 1, amount: total }];
  const weights = Array.from({ length: places }, (_, index) => places - index);
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  const rows: { place: number; amount: number }[] = [];
  let assigned = 0;
  weights.forEach((weight, index) => {
    const amount =
      index === places - 1
        ? total - assigned
        : Math.round((total * weight) / weightSum);
    rows.push({ place: index + 1, amount });
    assigned += amount;
  });
  return rows;
}

// ---------------- Cuentas demo ----------------

/** Jugadores del club: los 10 sembrados por `seed.ts` + 2 nuevos para mesas grandes. */
const ROSTER: { email: string; name: string }[] = [
  { email: "player1@pokelap.com", name: "Carlos Méndez" },
  { email: "player2@pokelap.com", name: "Lucía Fernández" },
  { email: "player3@pokelap.com", name: "Diego Álvarez" },
  { email: "player4@pokelap.com", name: "Sofía Rojas" },
  { email: "player5@pokelap.com", name: "Mateo Torres" },
  { email: "player6@pokelap.com", name: "Valentina Cruz" },
  { email: "player7@pokelap.com", name: "Andrés Silva" },
  { email: "player8@pokelap.com", name: "Camila Ortega" },
  { email: "player9@pokelap.com", name: "Jorge Paredes" },
  { email: "player10@pokelap.com", name: "Isabella Medina" },
  { email: "player11@pokelap.com", name: "Ricardo Bermúdez" },
  { email: "player12@pokelap.com", name: "Valeria Suárez" },
];

async function login(email: string, password: string): Promise<Session | null> {
  try {
    await paceAuth();
    const result = await api<{ user: AuthUser; accessToken: string }>(
      "POST",
      "/auth/login",
      {
        email,
        password,
      },
    );
    return { user: result.user, token: result.accessToken };
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 401 || error.status === 400)
    )
      return null;
    throw error;
  }
}

/** Inicia sesión y, si la cuenta no existe, la registra (rol player) con la contraseña demo. */
async function ensurePlayerSession(
  email: string,
  name: string,
): Promise<Session | null> {
  const existing = await login(email, PLAYER_PASSWORD);
  if (existing) return existing;
  try {
    await paceAuth();
    const created = await api<{ user: AuthUser; accessToken: string }>(
      "POST",
      "/auth/register",
      {
        email,
        name,
        password: PLAYER_PASSWORD,
      },
    );
    return { user: created.user, token: created.accessToken };
  } catch (error) {
    if (error instanceof ApiError) {
      warn(
        `no se pudo entrar ni registrar a ${email} (${error.message}); se omite del club`,
      );
      return null;
    }
    throw error;
  }
}

/** Asegura que el jugador sea miembro aceptado del club y devuelve su membresía. */
async function ensureMembership(
  club: ClubDto,
  session: Session,
  adminToken: string,
  membersByUser: Map<number, MemberDto>,
): Promise<MemberDto | null> {
  let member = membersByUser.get(session.user.id);
  if (!member) {
    try {
      await api<{ membership: MemberDto }>(
        "POST",
        "/clubs/join",
        { code: club.code },
        session.token,
      );
    } catch (error) {
      if (!(error instanceof ApiError) || !/already/i.test(error.message))
        throw error;
    }
    const members = await api<MemberDto[]>(
      "GET",
      `/clubs/${club.id}/members`,
      undefined,
      adminToken,
    );
    membersByUser.clear();
    members.forEach((row) => membersByUser.set(row.userId, row));
    member = membersByUser.get(session.user.id);
  }
  if (!member) return null;
  if (member.status !== "accepted") {
    const updated = await api<MemberDto>(
      "PATCH",
      `/clubs/${club.id}/members/${member.id}`,
      { status: "accepted" },
      adminToken,
    );
    membersByUser.set(session.user.id, updated);
    return updated;
  }
  return member;
}

// ---------------- Torneos demo ----------------

interface ReservationPlan {
  /** Índice dentro de `ROSTER`. */
  index: number;
  state: ReservationState;
  /** Entra, se levanta y vuelve a entrar (queda activo con una re-entrada). */
  rebuy?: boolean;
}

interface PayoutPlan {
  index: number;
  place: number;
  amount: number;
}

interface TournamentSpec {
  name: string;
  startDate: Date;
  /** Estado con el que queda el torneo al terminar la siembra. */
  status: TournamentStatus;
  mode?: TournamentMode;
  buyIn: number;
  fee: number;
  startingStack: number;
  maxPlayers: number;
  tableCount?: number;
  reEntry?: { maxReEntries: number; untilLevel: number };
  lateRegistrationUntilLevel?: number;
  addOn?: { amount: number; stack: number; untilLevel: number };
  guaranteedPrize?: number;
  paidPlaces: { type: "percent" | "fixed"; value: number };
  levelDurationMin: number;
  breakEveryLevels: number;
  /** Nivel al que queda el reloj (torneos en curso o pausados). */
  liveLevel?: number;
  reservations: ReservationPlan[];
  /** Bolo repartido en `tournament_prizes` (total explícito, en la moneda del torneo). */
  prizeTotal?: number;
  prizePlaces?: number;
  /** Premios ya pagados (movimientos de caja de tipo `prize`). */
  payouts?: PayoutPlan[];
}

const TOURNAMENTS: TournamentSpec[] = [
  {
    name: "Liga Semanal · Fecha 1",
    startDate: daysFromNow(4, 19),
    status: TournamentStatus.REGISTERING,
    buyIn: 30,
    fee: 3,
    startingStack: 15000,
    maxPlayers: 27,
    reEntry: { maxReEntries: 1, untilLevel: 6 },
    lateRegistrationUntilLevel: 6,
    addOn: { amount: 20, stack: 20000, untilLevel: 6 },
    guaranteedPrize: 500,
    paidPlaces: { type: "fixed", value: 3 },
    levelDurationMin: 15,
    breakEveryLevels: 4,
    prizeTotal: 500,
    prizePlaces: 3,
    // 12 jugadores: 6 confirmados (mesa 1), 5 esperando aprobación y 1 rechazado.
    reservations: [
      { index: 0, state: "accepted" },
      { index: 1, state: "accepted" },
      { index: 2, state: "accepted" },
      { index: 3, state: "accepted" },
      { index: 4, state: "accepted" },
      { index: 5, state: "accepted" },
      { index: 6, state: "pending" },
      { index: 7, state: "pending" },
      { index: 8, state: "pending" },
      { index: 9, state: "pending" },
      { index: 10, state: "pending" },
      { index: 11, state: "rejected" },
    ],
  },
  {
    name: "Satélite Gran Final",
    startDate: daysFromNow(2, 20),
    status: TournamentStatus.SCHEDULED,
    buyIn: 50,
    fee: 5,
    startingStack: 10000,
    maxPlayers: 18,
    // 9 aceptados = mesa 1 llena; la mesa 2 se abre si entran más jugadores.
    tableCount: 2,
    lateRegistrationUntilLevel: 4,
    paidPlaces: { type: "fixed", value: 2 },
    levelDurationMin: 12,
    breakEveryLevels: 3,
    guaranteedPrize: 400,
    prizeTotal: 400,
    prizePlaces: 2,
    // 12 jugadores: 9 confirmados y 3 esperando aprobación.
    reservations: [
      { index: 0, state: "accepted" },
      { index: 1, state: "accepted" },
      { index: 2, state: "accepted" },
      { index: 3, state: "accepted" },
      { index: 4, state: "accepted" },
      { index: 5, state: "accepted" },
      { index: 6, state: "accepted" },
      { index: 7, state: "accepted" },
      { index: 8, state: "accepted" },
      { index: 9, state: "pending" },
      { index: 10, state: "pending" },
      { index: 11, state: "pending" },
    ],
  },
  {
    name: "Torneo del Miércoles",
    startDate: minutesAgo(55),
    status: TournamentStatus.RUNNING,
    buyIn: 20,
    fee: 3,
    startingStack: 15000,
    maxPlayers: 18,
    tableCount: 2,
    reEntry: { maxReEntries: 2, untilLevel: 8 },
    lateRegistrationUntilLevel: 6,
    addOn: { amount: 20, stack: 20000, untilLevel: 8 },
    paidPlaces: { type: "fixed", value: 3 },
    levelDurationMin: 15,
    breakEveryLevels: 4,
    liveLevel: 5,
    prizeTotal: 200,
    prizePlaces: 3,
    reservations: [
      { index: 0, state: "accepted" },
      { index: 1, state: "accepted" },
      { index: 2, state: "accepted" },
      { index: 3, state: "accepted" },
      { index: 4, state: "accepted" },
      { index: 5, state: "accepted" },
      { index: 6, state: "accepted", rebuy: true },
      { index: 7, state: "accepted" },
      { index: 8, state: "stood_up" },
      { index: 9, state: "eliminated" },
      { index: 10, state: "pending" },
      { index: 11, state: "rejected" },
    ],
  },
  {
    name: "Deep Stack Nocturno",
    startDate: minutesAgo(95),
    status: TournamentStatus.PAUSED,
    buyIn: 100,
    fee: 10,
    startingStack: 40000,
    maxPlayers: 18,
    // 9 aceptados (mesa 1 llena) + levantado y eliminados; 2ª mesa si hace falta.
    tableCount: 2,
    reEntry: { maxReEntries: 1, untilLevel: 5 },
    lateRegistrationUntilLevel: 5,
    paidPlaces: { type: "percent", value: 40 },
    levelDurationMin: 20,
    breakEveryLevels: 3,
    liveLevel: 3,
    prizeTotal: 700,
    prizePlaces: 3,
    // 12 jugadores: 9 en juego, 1 levantado y 2 eliminados.
    reservations: [
      { index: 0, state: "accepted" },
      { index: 1, state: "accepted" },
      { index: 2, state: "accepted" },
      { index: 3, state: "accepted" },
      { index: 4, state: "accepted" },
      { index: 5, state: "accepted" },
      { index: 6, state: "accepted" },
      { index: 7, state: "accepted" },
      { index: 10, state: "accepted" },
      { index: 9, state: "stood_up" },
      { index: 8, state: "eliminated" },
      { index: 11, state: "eliminated" },
    ],
  },
  {
    name: "Endurance Clásico (finalizado)",
    startDate: daysFromNow(-1, 19),
    status: TournamentStatus.COMPLETED,
    buyIn: 75,
    fee: 8,
    startingStack: 20000,
    maxPlayers: 27,
    // 10 jugadores aceptados (9 asientos por mesa) → necesita 2 mesas.
    tableCount: 2,
    reEntry: { maxReEntries: 1, untilLevel: 6 },
    paidPlaces: { type: "fixed", value: 5 },
    levelDurationMin: 15,
    breakEveryLevels: 4,
    prizeTotal: 900,
    prizePlaces: 5,
    reservations: [
      { index: 0, state: "accepted" },
      { index: 1, state: "accepted" },
      { index: 2, state: "accepted" },
      { index: 3, state: "accepted" },
      { index: 4, state: "accepted" },
      { index: 5, state: "accepted" },
      { index: 6, state: "accepted" },
      { index: 7, state: "accepted" },
      { index: 10, state: "accepted" },
      { index: 11, state: "accepted" },
      { index: 8, state: "eliminated" },
      { index: 9, state: "stood_up" },
    ],
    payouts: [
      { index: 2, place: 1, amount: 360 },
      { index: 3, place: 2, amount: 225 },
      { index: 0, place: 3, amount: 135 },
      { index: 1, place: 4, amount: 105 },
      { index: 4, place: 5, amount: 75 },
    ],
  },
  {
    name: "Copa Cancelada",
    startDate: daysFromNow(6, 18),
    status: TournamentStatus.CANCELLED,
    buyIn: 40,
    fee: 4,
    startingStack: 12000,
    maxPlayers: 18,
    paidPlaces: { type: "fixed", value: 2 },
    levelDurationMin: 12,
    breakEveryLevels: 4,
    // 12 jugadores: 3 confirmados antes de cancelarse, 8 sin aprobar y 1 rechazado.
    reservations: [
      { index: 0, state: "accepted" },
      { index: 1, state: "accepted" },
      { index: 2, state: "accepted" },
      { index: 3, state: "pending" },
      { index: 4, state: "pending" },
      { index: 5, state: "pending" },
      { index: 6, state: "pending" },
      { index: 7, state: "pending" },
      { index: 8, state: "pending" },
      { index: 9, state: "pending" },
      { index: 10, state: "pending" },
      { index: 11, state: "rejected" },
    ],
  },
];

/** Payload de creación a partir del spec (el estado inicial siempre es "en inscripción"). */
function buildTournamentPayload(
  spec: TournamentSpec,
  clubId: number,
  gameTypeId: number,
) {
  return {
    name: spec.name,
    gameTypeId,
    clubId,
    startDate: spec.startDate.toISOString(),
    // Se crea en "registering" para poder inscribir jugadores; el estado final se aplica después.
    status: TournamentStatus.REGISTERING,
    mode: spec.mode ?? TournamentMode.LIVE,
    buyIn: spec.buyIn,
    fee: spec.fee,
    startingStack: spec.startingStack,
    maxPlayers: spec.maxPlayers,
    tableCount: spec.tableCount ?? 1,
    registrationOpen: true,
    reEntryEnabled: Boolean(spec.reEntry),
    maxReEntries: spec.reEntry?.maxReEntries,
    reEntryUntilLevel: spec.reEntry?.untilLevel,
    lateRegistrationEnabled: Boolean(spec.lateRegistrationUntilLevel),
    lateRegistrationUntilLevel: spec.lateRegistrationUntilLevel,
    addOnEnabled: Boolean(spec.addOn),
    addOnAmount: spec.addOn?.amount,
    addOnStack: spec.addOn?.stack,
    addOnUntilLevel: spec.addOn?.untilLevel,
    guaranteedPrize: spec.guaranteedPrize,
    paidPlacesType: spec.paidPlaces.type,
    paidPlacesValue: spec.paidPlaces.value,
    blindConfig: blindParamsFor(spec),
  };
}

// ---------------- Siembra de un torneo ----------------

interface SeedContext {
  club: ClubDto;
  admin: Session;
  roster: RosterEntry[];
  gameTypeId: number;
  tournaments: TournamentDto[];
}

/**
 * Vía API: sincroniza los jugadores de un torneo que ya existía con el plan del spec
 * (inscribe a los que falten, ajusta estados, mesas re-entradas y refresca los cupos).
 * Es idempotente: repetir la siembra deja el torneo igual.
 */
async function syncReservationsApi(
  spec: TournamentSpec,
  tournament: TournamentDto,
  ctx: SeedContext,
): Promise<TournamentDto> {
  const token = ctx.admin.token;
  const path = `/tournaments/${tournament.id}`;

  try {
    await api<TournamentDto>(
      "PATCH",
      path,
      {
        maxPlayers: spec.maxPlayers,
        tableCount: spec.tableCount ?? 1,
        registrationOpen:
          spec.status !== TournamentStatus.COMPLETED &&
          spec.status !== TournamentStatus.CANCELLED,
      },
      token,
    );
  } catch (error) {
    warn(
      `"${spec.name}": no se pudieron refrescar los cupos (${describeError(error)})`,
    );
  }

  const current = await api<ReservationDto[]>(
    "GET",
    `${path}/reservations`,
    undefined,
    token,
  );
  const byUser = new Map(current.map((row) => [row.userId, row]));
  let created = 0;
  let updated = 0;

  for (const plan of spec.reservations) {
    const entry = ctx.roster[plan.index];
    if (!entry) continue;
    let reservation = byUser.get(entry.user.id);

    if (!reservation) {
      try {
        reservation = await api<ReservationDto>(
          "POST",
          `${path}/reservations`,
          { userId: entry.user.id },
          token,
        );
        created += 1;
      } catch (error) {
        warn(
          `"${spec.name}": no se pudo inscribir a ${entry.user.name} (${describeError(error)})`,
        );
        continue;
      }
    }

    const reservationPath = `${path}/reservations/${reservation.id}`;
    const target = plan.rebuy ? "accepted" : plan.state;
    if (reservation.status !== target) {
      await api<ReservationDto>(
        "PATCH",
        reservationPath,
        { status: target },
        token,
      );
      updated += 1;
    }

    if (plan.rebuy && (reservation.reEntries ?? 0) < 1) {
      // El rebuy solo está disponible desde "levantado" o "eliminado".
      if (reservation.status === "accepted") {
        await api<ReservationDto>(
          "POST",
          `${reservationPath}/stand-up`,
          {},
          token,
        );
      } else if (
        reservation.status !== "stood_up" &&
        reservation.status !== "eliminated"
      ) {
        await api<ReservationDto>(
          "PATCH",
          reservationPath,
          { status: "stood_up" },
          token,
        );
      }
      await api<ReservationDto>("POST", `${reservationPath}/rebuy`, {}, token);
      updated += 1;
    }
  }

  const final = await api<TournamentDto>("GET", path, undefined, token);
  ok(
    `"${spec.name}": ${final.reservedPlayers} jugadores asignados (${final.currentPlayers} en juego · ` +
      `${final.tableCount} mesa/s) · ${created} nuevos, ${updated} ajustados`,
  );
  return final;
}

/**
 * Crea el torneo y reproduce su ciclo de vida con las reservas del spec:
 * inscripciones → aceptar/asignar asientos → rebuys → estado en vivo.
 * Si ya existe un torneo con el mismo nombre, solo sincroniza sus jugadores (idempotente).
 */
async function seedTournament(
  spec: TournamentSpec,
  ctx: SeedContext,
): Promise<TournamentDto> {
  const existing = ctx.tournaments.find(
    (tournament) => tournament.name === spec.name,
  );
  if (existing) {
    ok(
      `torneo "${spec.name}" ya existe (#${existing.id}, ${existing.status}) → se sincronizan los jugadores`,
    );
    return syncReservationsApi(spec, existing, ctx);
  }

  const players = spec.reservations
    .map((plan) => ({ plan, entry: ctx.roster[plan.index] }))
    .filter((row): row is { plan: ReservationPlan; entry: RosterEntry } =>
      Boolean(row.entry),
    );

  const tournament = await api<TournamentDto>(
    "POST",
    "/tournaments",
    buildTournamentPayload(spec, ctx.club.id, ctx.gameTypeId),
    ctx.admin.token,
  );
  info(`torneo "${spec.name}" creado (#${tournament.id})`);

  const reservations: ReservationDto[] = [];
  for (const { entry } of players) {
    reservations.push(
      await api<ReservationDto>(
        "POST",
        `/tournaments/${tournament.id}/reservations`,
        { userId: entry.user.id },
        ctx.admin.token,
      ),
    );
  }

  for (let index = 0; index < players.length; index += 1) {
    const { plan } = players[index];
    const reservation = reservations[index];
    const path = `/tournaments/${tournament.id}/reservations/${reservation.id}`;
    if (plan.state === "accepted" || plan.rebuy) {
      await api<ReservationDto>(
        "PATCH",
        path,
        { status: "accepted" },
        ctx.admin.token,
      );
    }
    if (plan.state !== "accepted" && !plan.rebuy) {
      await api<ReservationDto>(
        "PATCH",
        path,
        { status: plan.state },
        ctx.admin.token,
      );
    }
    if (plan.rebuy) {
      // Rebuy solo disponible desde "levantado" o "eliminado".
      await api<ReservationDto>(
        "POST",
        `${path}/stand-up`,
        {},
        ctx.admin.token,
      );
      await api<ReservationDto>("POST", `${path}/rebuy`, {}, ctx.admin.token);
    }
  }

  if (spec.prizeTotal && spec.prizePlaces) {
    await api<unknown>(
      "PUT",
      `/tournaments/${tournament.id}/prizes`,
      { prizes: splitPrize(spec.prizeTotal, spec.prizePlaces) },
      ctx.admin.token,
    );
  }

  // Estado en vivo: el reloj solo avanza desde el motor real de la API.
  if (
    spec.status === TournamentStatus.RUNNING ||
    spec.status === TournamentStatus.PAUSED
  ) {
    await api<TournamentDto>(
      "POST",
      `/tournaments/${tournament.id}/start`,
      {},
      ctx.admin.token,
    );
    for (let level = 0; level < (spec.liveLevel ?? 0); level += 1) {
      await api<TournamentDto>(
        "POST",
        `/tournaments/${tournament.id}/next-level`,
        {},
        ctx.admin.token,
      );
    }
    if (spec.status === TournamentStatus.PAUSED) {
      await api<TournamentDto>(
        "POST",
        `/tournaments/${tournament.id}/pause`,
        {},
        ctx.admin.token,
      );
    }
  } else if (spec.status !== TournamentStatus.REGISTERING) {
    await api<TournamentDto>(
      "PATCH",
      `/tournaments/${tournament.id}`,
      { status: spec.status, registrationOpen: false },
      ctx.admin.token,
    );
  }

  const final = await api<TournamentDto>(
    "GET",
    `/tournaments/${tournament.id}`,
    undefined,
    ctx.admin.token,
  );
  ok(
    `"${spec.name}" → ${final.status} · ${final.currentPlayers} en juego · ` +
      `${final.reservedPlayers} reservas · ${final.currentReEntries} re-entradas`,
  );
  return final;
}

// ---------------- Caja (Recaudado) ----------------

/** Movimientos manuales que se registran siempre (gastos, ingresos, retiradas y ajustes). */
const MANUAL_MOVEMENTS: {
  type: ClubCashMovementType;
  amount: number;
  note: string;
  daysAgo: number;
  method: "cash" | "card" | "transfer" | "other";
  direction?: "in" | "out";
}[] = [
  {
    type: ClubCashMovementType.DEPOSIT,
    amount: 300,
    note: "Ingreso: fondo de caja",
    daysAgo: 5,
    method: "transfer",
  },
  {
    type: ClubCashMovementType.EXPENSE,
    amount: 120,
    note: "Gasto: alquiler de la sala (semanal)",
    daysAgo: 3,
    method: "cash",
  },
  {
    type: ClubCashMovementType.WITHDRAWAL,
    amount: 250,
    note: "Retirada: traslado a caja fuerte",
    daysAgo: 2,
    method: "cash",
  },
  {
    type: ClubCashMovementType.EXPENSE,
    amount: 45.5,
    note: "Gasto: barra, hielo y bebidas",
    daysAgo: 1,
    method: "cash",
  },
  {
    type: ClubCashMovementType.ADJUSTMENT,
    amount: 12.5,
    note: "Ajuste: cuadre de caja del turno anterior",
    daysAgo: 0,
    method: "cash",
    direction: "in",
  },
];

async function seedCash(ctx: SeedContext): Promise<void> {
  const clubId = ctx.club.id;
  const token = ctx.admin.token;

  // 1) Reconciliar las reservas del club con el libro de caja (idempotente).
  const sync = await api<{
    tournaments: number;
    created: number;
    updated: number;
    total: number;
  }>("POST", `/clubs/${clubId}/cash/sync`, {}, token);
  ok(
    `caja sincronizada: ${sync.tournaments} torneos · ${sync.created} movimientos nuevos · ` +
      `${sync.updated} actualizados · ${sync.total.toFixed(2)} en inscripciones`,
  );

  // 2) La sincronización ya deja cobradas las inscripciones y re-entradas nuevas.
  //    Los cobros que quedaron pendientes con la regla anterior (o devueltos a mano)
  //    se cobran aquí para que la demo no arranque con dinero "por cobrar".
  const pendingPage = await api<PaginatedDto<MovementDto>>(
    "GET",
    `/clubs/${clubId}/cash/movements?status=pending&limit=100`,
    undefined,
    token,
  );
  const toCollect = pendingPage.items.filter(
    (movement) =>
      movement.type === ClubCashMovementType.ENTRY ||
      movement.type === ClubCashMovementType.RE_ENTRY,
  );
  const methods = ["cash", "card", "transfer"] as const;
  for (let bucket = 0; bucket < methods.length; bucket += 1) {
    const ids = toCollect
      .filter((_, index) => index % methods.length === bucket)
      .map((m) => m.id);
    if (ids.length === 0) continue;
    const result = await api<{ updated: number; amount: number }>(
      "POST",
      `/clubs/${clubId}/cash/settle`,
      { status: "paid", movementIds: ids, method: methods[bucket] },
      token,
    );
    ok(
      `${result.updated} cobros confirmados (${methods[bucket]}) por ${result.amount.toFixed(2)}`,
    );
  }

  // 3) Premios pagados de los torneos finalizados (un movimiento por puesto).
  for (const spec of TOURNAMENTS) {
    if (!spec.payouts?.length) continue;
    const tournament = ctx.tournaments.find((row) => row.name === spec.name);
    if (!tournament) continue;
    const payouts = spec.payouts.flatMap((payout) => {
      const entry = ctx.roster[payout.index];
      return entry
        ? [
            {
              userId: entry.user.id,
              place: payout.place,
              amount: payout.amount,
              method: "cash",
            },
          ]
        : [];
    });
    if (payouts.length === 0) continue;
    await api<unknown>(
      "POST",
      `/clubs/${clubId}/cash/tournaments/${tournament.id}/payouts`,
      { payouts },
      token,
    );
    const total = payouts.reduce((sum, payout) => sum + payout.amount, 0);
    ok(
      `premios de "${spec.name}": ${payouts.length} puestos por ${total.toFixed(2)}`,
    );
  }

  // 4) Movimientos manuales (no se duplican: se buscan por nota).
  const existing = await api<PaginatedDto<MovementDto>>(
    "GET",
    `/clubs/${clubId}/cash/movements?limit=100`,
    undefined,
    token,
  );
  const knownNotes = new Set(existing.items.map((movement) => movement.note));
  for (const movement of MANUAL_MOVEMENTS) {
    if (knownNotes.has(movement.note)) continue;
    await api<MovementDto>(
      "POST",
      `/clubs/${clubId}/cash/movements`,
      {
        type: movement.type,
        amount: movement.amount,
        method: movement.method,
        direction: movement.direction,
        note: movement.note,
        occurredAt: dayKey(daysFromNow(-movement.daysAgo, 12)),
      },
      token,
    );
    ok(`movimiento de caja: ${movement.note} (${movement.amount.toFixed(2)})`);
  }

  // 5) Add-ons cobrados en el torneo en curso.
  for (const addOn of ADD_ONS) {
    const tournament = ctx.tournaments.find(
      (row) => row.name === addOn.tournament,
    );
    const entry = ctx.roster[addOn.index];
    if (!tournament || !entry) continue;
    const note = `Add-on nivel ${addOn.level} · ${entry.user.name}`;
    if (knownNotes.has(note)) continue;
    await api<MovementDto>(
      "POST",
      `/clubs/${clubId}/cash/movements`,
      {
        type: ClubCashMovementType.ADD_ON,
        amount: addOn.amount,
        method: "cash",
        tournamentId: tournament.id,
        userId: entry.user.id,
        note,
      },
      token,
    );
    ok(
      `add-on de ${entry.user.name} en "${tournament.name}" (${addOn.amount.toFixed(2)})`,
    );
  }

  const summary = await api<CashSummaryDto>(
    "GET",
    `/clubs/${clubId}/cash/summary`,
    undefined,
    token,
  );
  info(
    `resumen de caja (${summary.currency}): cobrado ${summary.collected.toFixed(2)} · ` +
      `pagado ${summary.paidOut.toFixed(2)} · neto ${summary.net.toFixed(2)} · ` +
      `pendiente de cobro ${summary.pendingIn.toFixed(2)} · pendiente de pago ` +
      `${summary.pendingOut.toFixed(2)} (${summary.pendingCount} movimientos) · ` +
      `saldo ${summary.balance.toFixed(2)} · comisión ${summary.commission.toFixed(2)} · ` +
      `bolo ${summary.prizePot.toFixed(2)}`,
  );
}

/** Add-ons cobrados en el torneo en curso (jugadores del roster que siguen en juego). */
const ADD_ONS: {
  tournament: string;
  index: number;
  amount: number;
  level: number;
}[] = [
  { tournament: "Torneo del Miércoles", index: 3, amount: 20, level: 4 },
  { tournament: "Torneo del Miércoles", index: 5, amount: 20, level: 4 },
];

// ---------------- Pasos de preparación ----------------

/**
 * La caja deriva la fecha de cada cobro de la fecha de inicio del torneo: un torneo
 * del club sin `startDate` rompe `POST /cash/sync` (columna `occurred_at` NOT NULL).
 * Los torneos creados por versiones antiguas pueden tenerla vacía, así que se repara.
 */
async function repairMissingStartDates(ctx: SeedContext): Promise<void> {
  for (const tournament of ctx.tournaments) {
    if (tournament.startDate) continue;
    const startDate =
      tournament.status === TournamentStatus.COMPLETED ||
      tournament.status === TournamentStatus.PAUSED
        ? daysFromNow(-1, 19)
        : tournament.status === TournamentStatus.RUNNING
          ? minutesAgo(60)
          : daysFromNow(3, 19);
    await api<TournamentDto>(
      "PATCH",
      `/tournaments/${tournament.id}`,
      { startDate: startDate.toISOString() },
      ctx.admin.token,
    );
    tournament.startDate = startDate.toISOString();
    warn(
      `el torneo #${tournament.id} "${tournament.name}" no tenía fecha de inicio → ${startDate.toLocaleString()}`,
    );
  }
}

/** Permisos del equipo del club para las cuentas demo (índice dentro de `ROSTER`). */
const ROLE_PLAN: { index: number; role: "operator" | "cashier" }[] = [
  { index: 0, role: "operator" },
  { index: 1, role: "cashier" },
  { index: 2, role: "cashier" },
];

async function resolveClub(admin: Session): Promise<ClubDto> {
  const clubs = await api<PaginatedDto<ClubDto>>(
    "GET",
    "/clubs?limit=100",
    undefined,
    admin.token,
  );
  const club = CLUB_NAME
    ? clubs.items.find(
        (row) => row.name.toLowerCase() === CLUB_NAME.toLowerCase(),
      )
    : clubs.items[0];
  if (!club) {
    throw new Error(
      CLUB_NAME
        ? `el admin ${admin.user.email} no tiene un club llamado "${CLUB_NAME}"`
        : `el admin ${admin.user.email} no tiene clubes: crea uno en la app o define SEED_CLUB_NAME`,
    );
  }
  if (club.adminUserId !== admin.user.id) {
    warn(
      `el dueño del club es el usuario #${club.adminUserId}; usa su cuenta para sembrar el equipo`,
    );
  }
  return club;
}

async function resolveGameType(admin: Session): Promise<number> {
  const page = await api<PaginatedDto<GameTypeDto>>(
    "GET",
    "/game-types?limit=100",
    undefined,
    admin.token,
  );
  const gameType =
    page.items.find((row) => row.name === "Texas Hold'em") ??
    page.items[0] ??
    null;
  if (!gameType)
    throw new Error(
      "no hay tipos de juego cargados: ejecuta primero `npm run seed`",
    );
  return gameType.id;
}

/** Inicia sesión como cada jugador del roster (crea la cuenta si falta) y lo hace miembro del club. */
async function prepareRoster(
  club: ClubDto,
  admin: Session,
): Promise<RosterEntry[]> {
  const roster: RosterEntry[] = [];
  for (const player of ROSTER) {
    const session = await ensurePlayerSession(player.email, player.name);
    if (session)
      roster.push({ user: session.user, token: session.token, memberId: null });
  }
  ok(`${roster.length}/${ROSTER.length} jugadores con sesión iniciada`);

  const membersByUser = new Map<number, MemberDto>();
  const members = await api<MemberDto[]>(
    "GET",
    `/clubs/${club.id}/members`,
    undefined,
    admin.token,
  );
  members.forEach((member) => membersByUser.set(member.userId, member));

  let attached = 0;
  for (const entry of roster) {
    const member = await ensureMembership(
      club,
      { user: entry.user, token: entry.token },
      admin.token,
      membersByUser,
    );
    if (!member || member.status !== "accepted") {
      warn(`${entry.user.email} no quedó como miembro aceptado del club`);
      continue;
    }
    entry.memberId = member.id;
    attached += 1;
  }
  ok(`${attached} jugadores aceptados en "${club.name}"`);

  for (const plan of ROLE_PLAN) {
    const entry = roster[plan.index];
    if (!entry?.memberId) continue;
    if (membersByUser.get(entry.user.id)?.role === plan.role) continue;
    await api<MemberDto>(
      "PATCH",
      `/clubs/${club.id}/collaborators/${entry.memberId}`,
      { role: plan.role },
      admin.token,
    );
    ok(`${entry.user.name} es ${plan.role} del club`);
  }

  return roster;
}

// ---------------- Siembra directa en la base de datos (por defecto) ----------------

/**
 * Modo de siembra:
 * - `db` (por defecto): escribe en la base de datos con TypeORM, como `seed.ts`.
 * - `api`: usa la API real (necesita el backend arriba).
 */
const SEED_MODE = (process.env.SEED_MODE ?? "db").trim().toLowerCase();

/** Asientos por mesa (igual que `TournamentsService.SEATS_PER_TABLE`). */
const SEATS_PER_TABLE = 9;

/** Tope de mesas por torneo (el mismo que valida el servicio). */
const MAX_TABLES = 50;

/** Estados de reserva que cuentan como "jugó el torneo" (los mismos que usa la caja). */
const ENTERED_STATES: ReservationStatus[] = [
  ReservationStatus.ACCEPTED,
  ReservationStatus.STOOD_UP,
  ReservationStatus.ELIMINATED,
];

/** Formas de pago repartidas entre los cobros ya confirmados (para que la caja no sea monótona). */
const PAID_METHODS: ClubCashPaymentMethod[] = [
  ClubCashPaymentMethod.CASH,
  ClubCashPaymentMethod.CARD,
  ClubCashPaymentMethod.TRANSFER,
];

/** El nivel sembrado acaba de empezar: así el reloj en vivo no salta de nivel al abrir la app. */
const LEVEL_ELAPSED_MS = 2 * 60_000;

/** Repositorios que usan los pasos de siembra directa. */
interface DbRepos {
  users: Repository<User>;
  clubs: Repository<Club>;
  members: Repository<ClubMember>;
  gameTypes: Repository<GameType>;
  tournaments: Repository<Tournament>;
  reservations: Repository<TournamentReservation>;
  prizes: Repository<TournamentPrize>;
  movements: Repository<ClubCashMovement>;
}

/** Contexto de la siembra directa ya resuelto (club, admin, roster y torneos). */
interface DbContext {
  club: Club;
  admin: User;
  gameType: GameType | null;
  roster: { user: User; member: ClubMember }[];
  tournaments: { spec: TournamentSpec; tournament: Tournament }[];
}

/** Movimiento de caja que genera una reserva (inscripción o re-entrada). */
interface CashMovementPlanItem {
  sourceKey: string;
  type: ClubCashMovementType;
  userId: number;
  reservationId: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Parámetros de la escalera de ciegas a partir del spec (los mismos que envía la API). */
function blindParamsFor(spec: TournamentSpec) {
  return {
    startingStack: spec.startingStack,
    levelDurationMin: spec.levelDurationMin,
    growth: "normal" as const,
    anteMode: "bb_ante" as const,
    breakEveryLevels: spec.breakEveryLevels,
    breakDurationMin: 10,
    maxPlayers: spec.maxPlayers,
    addOnEnabled: Boolean(spec.addOn),
    addOnStack: spec.addOn?.stack,
    reEntryEnabled: Boolean(spec.reEntry),
    maxReEntries: spec.reEntry?.maxReEntries,
  };
}

/** Specs con reloj corriendo (running/paused): llevan startedAt, nivel y arranque del nivel. */
function isLiveSpec(spec: TournamentSpec): boolean {
  return (
    spec.status === TournamentStatus.RUNNING ||
    spec.status === TournamentStatus.PAUSED
  );
}

/** Primer asiento libre (mesa 1..tableCount, asiento 1..9); null si el torneo está lleno. */
function nextFreeSeat(
  occupied: Set<string>,
  tableCount: number,
): { tableNumber: number; seatNumber: number } | null {
  const tables = Math.max(1, Math.min(tableCount || 1, MAX_TABLES));
  for (let tableNumber = 1; tableNumber <= tables; tableNumber += 1) {
    for (let seatNumber = 1; seatNumber <= SEATS_PER_TABLE; seatNumber += 1) {
      if (!occupied.has(`${tableNumber}-${seatNumber}`))
        return { tableNumber, seatNumber };
    }
  }
  return null;
}

/** Club a poblar: por nombre (SEED_CLUB_NAME) o el primero de la base. */
async function resolveClubRow(repos: DbRepos, admin: User): Promise<Club> {
  const club = CLUB_NAME
    ? await repos.clubs
        .createQueryBuilder("c")
        .where("LOWER(c.name) = LOWER(:name)", { name: CLUB_NAME })
        .getOne()
    : await repos.clubs.findOne({ where: {}, order: { id: "ASC" } });
  if (!club) {
    throw new Error(
      CLUB_NAME
        ? `no existe un club llamado "${CLUB_NAME}"`
        : 'no hay clubes en la base: crea uno en la app o ejecuta "npm run seed"',
    );
  }
  if (club.adminUserId !== admin.id) {
    warn(
      `el dueño del club es el usuario #${club.adminUserId}; entra con esa cuenta para verlo completo`,
    );
  }
  return club;
}

/** Tipo de juego de los torneos demo (Texas Hold'em si existe). */
async function resolveGameTypeRow(repos: DbRepos): Promise<GameType | null> {
  const all = await repos.gameTypes.find({ order: { id: "ASC" } });
  const gameType =
    all.find((row) => row.name === "Texas Hold'em") ?? all[0] ?? null;
  if (!gameType) {
    warn(
      'no hay tipos de juego cargados: los torneos quedan sin tipo (ejecuta "npm run seed")',
    );
  }
  return gameType;
}

/** Crea (si falta) cada cuenta del roster y la deja como miembro aceptado del club. */
async function prepareRosterRows(
  repos: DbRepos,
  club: Club,
): Promise<{ user: User; member: ClubMember }[]> {
  const rows: { user: User; member: ClubMember }[] = [];
  const existingMembers = await repos.members.find({
    where: { clubId: club.id },
  });
  const membersByUser = new Map(
    existingMembers.map((member) => [member.userId, member]),
  );
  let created = 0;

  for (const player of ROSTER) {
    let user = await repos.users.findOne({ where: { email: player.email } });
    if (!user) {
      user = await repos.users.save(
        repos.users.create({
          email: player.email,
          name: player.name,
          password: await bcrypt.hash(PLAYER_PASSWORD, 10),
          role: UserRole.PLAYER,
          isActive: true,
        }),
      );
      created += 1;
    }
    let member = membersByUser.get(user.id);
    if (!member) {
      member = await repos.members.save(
        repos.members.create({
          clubId: club.id,
          userId: user.id,
          status: ClubMemberStatus.ACCEPTED,
          role: ClubMemberRole.MEMBER,
        }),
      );
      membersByUser.set(user.id, member);
    } else if (member.status !== ClubMemberStatus.ACCEPTED) {
      member.status = ClubMemberStatus.ACCEPTED;
      member = await repos.members.save(member);
    }
    rows.push({ user, member });
  }
  if (created > 0)
    ok(`${created} cuentas de jugador creadas (contraseña ${PLAYER_PASSWORD})`);

  // Equipo del club: operador y cajeros demo.
  for (const plan of ROLE_PLAN) {
    const row = rows[plan.index];
    if (!row || row.member.role === plan.role) continue;
    row.member.role = plan.role as ClubMemberRole;
    await repos.members.save(row.member);
    ok(`${row.user.name} es ${plan.role} del club`);
  }
  return rows;
}

/** Recalcula los contadores denormalizados del torneo desde sus reservas (igual que el servicio). */
async function refreshCountersRow(
  repos: DbRepos,
  tournamentId: number,
): Promise<void> {
  const [reservedPlayers, currentPlayers, reEntryRow] = await Promise.all([
    repos.reservations.count({ where: { tournamentId } }),
    repos.reservations.count({
      where: { tournamentId, status: ReservationStatus.ACCEPTED },
    }),
    repos.reservations
      .createQueryBuilder("r")
      .select("COALESCE(SUM(r.reEntries), 0)", "total")
      .where("r.tournament_id = :id", { id: tournamentId })
      .getRawOne<{ total: string }>(),
  ]);
  await repos.tournaments.update(tournamentId, {
    reservedPlayers,
    currentPlayers,
    currentReEntries: Number(reEntryRow?.total ?? 0),
  });
}

/**
 * Jugadores del torneo: sincroniza las reservas con el plan del spec.
 *
 * - Crea la reserva del jugador que falte (aceptado con mesa/asiento libre, o en
 *   el estado del plan sin mesa).
 * - Ajusta el estado de las existentes y suelta/ocupa mesa y asiento en consecuencia.
 * - Da la re-entrada (`reEntries`) de los planes con `rebuy`.
 * - Borra reservas que no estén en el plan, salvo que la caja las referencie.
 *
 * Es idempotente: repetir la siembra deja el torneo exactamente igual.
 */
async function syncReservationsRow(
  spec: TournamentSpec,
  repos: DbRepos,
  roster: { user: User; member: ClubMember }[],
  tournament: Tournament,
): Promise<void> {
  const tableCount = spec.tableCount ?? 1;
  const existing = await repos.reservations.find({
    where: { tournamentId: tournament.id },
  });
  const byUser = new Map(existing.map((row) => [row.userId, row]));
  const occupied = new Set(
    existing
      .filter((row) => row.tableNumber != null && row.seatNumber != null)
      .map((row) => `${row.tableNumber}-${row.seatNumber}`),
  );

  const takeSeat = (): { tableNumber: number; seatNumber: number } | null => {
    const seat = nextFreeSeat(occupied, tableCount);
    if (seat) occupied.add(`${seat.tableNumber}-${seat.seatNumber}`);
    return seat;
  };
  const releaseSeat = (row: TournamentReservation): void => {
    if (row.tableNumber != null && row.seatNumber != null) {
      occupied.delete(`${row.tableNumber}-${row.seatNumber}`);
    }
    row.tableNumber = null;
    row.seatNumber = null;
  };

  const plannedUserIds = new Set<number>();
  let created = 0;
  let updated = 0;

  for (const plan of spec.reservations) {
    const entry = roster[plan.index];
    if (!entry) continue;
    plannedUserIds.add(entry.user.id);

    const status = plan.state as ReservationStatus;
    const accepted = status === ReservationStatus.ACCEPTED;
    const row = byUser.get(entry.user.id);

    if (!row) {
      const seat = accepted ? takeSeat() : null;
      if (accepted && !seat) {
        warn(
          `"${spec.name}": sin asientos libres, ${entry.user.name} queda sin mesa asignada`,
        );
      }
      await repos.reservations.save(
        repos.reservations.create({
          tournamentId: tournament.id,
          userId: entry.user.id,
          status,
          stack: accepted ? spec.startingStack : null,
          reEntries: accepted && plan.rebuy ? 1 : 0,
          tableNumber: seat?.tableNumber ?? null,
          seatNumber: seat?.seatNumber ?? null,
        }),
      );
      created += 1;
      continue;
    }

    let dirty = false;
    if (row.status === ReservationStatus.ACCEPTED && !accepted) {
      releaseSeat(row);
      dirty = true;
    }
    if (row.status !== status) {
      row.status = status;
      dirty = true;
    }
    if (accepted) {
      if (row.stack == null) {
        row.stack = spec.startingStack;
        dirty = true;
      }
      if (row.tableNumber == null || row.seatNumber == null) {
        const seat = takeSeat();
        if (seat) {
          row.tableNumber = seat.tableNumber;
          row.seatNumber = seat.seatNumber;
          dirty = true;
        } else {
          warn(
            `"${spec.name}": sin asientos libres, ${entry.user.name} queda sin mesa asignada`,
          );
        }
      }
      if (plan.rebuy && (row.reEntries ?? 0) < 1) {
        row.reEntries = 1;
        dirty = true;
      }
    }
    if (dirty) {
      await repos.reservations.save(row);
      updated += 1;
    }
  }

  let removed = 0;
  for (const row of existing) {
    if (plannedUserIds.has(row.userId)) continue;
    const referenced = await repos.movements.count({
      where: { reservationId: row.id },
    });
    if (referenced > 0) {
      warn(
        `"${spec.name}": reserva #${row.id} fuera del plan pero con ${referenced} movimiento/s de caja → se conserva`,
      );
      continue;
    }
    await repos.reservations.delete(row.id);
    removed += 1;
  }

  const total = await repos.reservations.count({
    where: { tournamentId: tournament.id },
  });
  const accepted = await repos.reservations.count({
    where: { tournamentId: tournament.id, status: ReservationStatus.ACCEPTED },
  });
  ok(
    `"${spec.name}": ${total} jugadores asignados (${accepted} en juego · ${tableCount} mesa/s) · ` +
      `${created} nuevos, ${updated} ajustados, ${removed} retirados`,
  );
}

/** Configuración estática del torneo (se refresca en cada corrida). */
function tournamentConfigRow(spec: TournamentSpec) {
  return {
    buyIn: spec.buyIn,
    fee: spec.fee,
    startingStack: spec.startingStack,
    maxPlayers: spec.maxPlayers,
    tableCount: spec.tableCount ?? 1,
    // Un torneo terminado o cancelado ya no admite inscripciones.
    registrationOpen:
      spec.status !== TournamentStatus.COMPLETED &&
      spec.status !== TournamentStatus.CANCELLED,
    reEntryEnabled: Boolean(spec.reEntry),
    maxReEntries: spec.reEntry?.maxReEntries ?? null,
    reEntryUntilLevel: spec.reEntry?.untilLevel ?? null,
    lateRegistrationEnabled: spec.lateRegistrationUntilLevel != null,
    lateRegistrationUntilLevel: spec.lateRegistrationUntilLevel ?? null,
    addOnEnabled: Boolean(spec.addOn),
    addOnAmount: spec.addOn?.amount ?? null,
    addOnStack: spec.addOn?.stack ?? null,
    addOnUntilLevel: spec.addOn?.untilLevel ?? null,
    guaranteedPrize: spec.guaranteedPrize ?? null,
    paidPlacesType: spec.paidPlaces.type,
    paidPlacesValue: spec.paidPlaces.value,
    blindConfig: blindParamsFor(spec),
  };
}

/** Crea (o refresca) un torneo demo con sus reservas en mesa y sus premios por puesto. */
async function seedTournamentRow(
  spec: TournamentSpec,
  repos: DbRepos,
  ctx: Pick<DbContext, "club" | "admin" | "gameType" | "roster">,
): Promise<Tournament> {
  const { club, admin, gameType, roster } = ctx;
  const live = isLiveSpec(spec);
  let tournament = await repos.tournaments.findOne({
    where: { name: spec.name, clubId: club.id },
  });

  if (!tournament) {
    const structure = buildBlindStructure(blindParamsFor(spec));
    tournament = await repos.tournaments.save(
      repos.tournaments.create({
        name: spec.name,
        gameTypeId: gameType?.id ?? null,
        clubId: club.id,
        createdByUserId: admin.id,
        startDate: spec.startDate,
        status: spec.status,
        mode: spec.mode ?? TournamentMode.LIVE,
        ...tournamentConfigRow(spec),
        blindStructure: structure.items,
        startedAt: live ? spec.startDate : null,
        currentLevel: live ? (spec.liveLevel ?? 0) : null,
        levelStartedAt: live ? new Date(Date.now() - LEVEL_ELAPSED_MS) : null,
      }),
    );
    ok(`torneo "${spec.name}" creado (${spec.status})`);
  } else {
    // Re-siembra: el torneo demo vuelve a su configuración del spec (cupos, mesas,
    // límites y estado) y, si está en vivo, se refresca el reloj justo al empezar
    // el nivel para que el countdown siga corriendo.
    await repos.tournaments.update(tournament.id, {
      ...tournamentConfigRow(spec),
      status: spec.status,
      ...(live
        ? {
            startedAt: tournament.startedAt ?? spec.startDate,
            currentLevel: spec.liveLevel ?? 0,
            levelStartedAt: new Date(Date.now() - LEVEL_ELAPSED_MS),
          }
        : {}),
    });
  }

  // Jugadores del torneo: crea las reservas que falten y ajusta estado/mesa/asiento.
  await syncReservationsRow(spec, repos, roster, tournament);
  await refreshCountersRow(repos, tournament.id);

  // Bolo repartido por puesto (`tournament_prizes`).
  const prizeCount = await repos.prizes.count({
    where: { tournamentId: tournament.id },
  });
  if (prizeCount === 0 && spec.prizeTotal && spec.prizePlaces) {
    const rows = splitPrize(spec.prizeTotal, spec.prizePlaces).map((prize) =>
      repos.prizes.create({
        tournamentId: tournament.id,
        place: prize.place,
        amount: prize.amount,
      }),
    );
    await repos.prizes.save(rows);
    ok(`"${spec.name}": ${rows.length} puestos pagados (${spec.prizeTotal})`);
  }

  return (await repos.tournaments.findOne({
    where: { id: tournament.id },
  })) as Tournament;
}

/**
 * Libro de caja equivalente a `POST /clubs/:id/cash/sync`: una inscripción por
 * jugador aceptado (con el precio del torneo: `buyIn` + `fee`) y una re-entrada por
 * rebuy, **ambas ya cobradas** —el dinero de una entrada se cobra al registrar al
 * jugador—, más los premios pagados, los movimientos manuales y los add-ons. Todo
 * idempotente por `sourceKey`/nota.
 *
 * Se reconcilia en los dos sentidos: si falta el cobro de una reserva que juega se
 * crea, y si un cobro generado se quedó sin reserva que lo respalde (jugador
 * rechazado o devuelto a pendiente, rebuy retirado) se borra o se anula.
 */
async function seedCashRows(repos: DbRepos, ctx: DbContext): Promise<void> {
  const { club, admin, roster, tournaments: seeded } = ctx;
  const clubId = club.id;

  // Primer pase: movimientos que genera cada torneo (una inscripción por jugador
  // y una re-entrada por rebuy).
  const plans: { tournament: Tournament; desired: CashMovementPlanItem[] }[] =
    [];
  for (const { tournament } of seeded) {
    const rows = await repos.reservations.find({
      where: { tournamentId: tournament.id, status: In(ENTERED_STATES) },
      order: { id: "ASC" },
    });
    const desired: CashMovementPlanItem[] = [];
    rows.forEach((reservation) => {
      desired.push({
        sourceKey: `entry:reservation:${reservation.id}`,
        type: ClubCashMovementType.ENTRY,
        userId: reservation.userId,
        reservationId: reservation.id,
      });
      for (let index = 1; index <= (reservation.reEntries ?? 0); index += 1) {
        desired.push({
          sourceKey: `re_entry:reservation:${reservation.id}:${index}`,
          type: ClubCashMovementType.RE_ENTRY,
          userId: reservation.userId,
          reservationId: reservation.id,
        });
      }
    });

    plans.push({ tournament, desired });
  }

  let created = 0;
  let collected = 0;
  let revived = 0;
  let paidIndex = 0;

  for (const { tournament, desired } of plans) {
    const entryAmount = round2(
      Number(tournament.buyIn ?? 0) + Number(tournament.fee ?? 0),
    );
    const feeAmount = round2(Number(tournament.fee ?? 0));
    const currency = tournament.currency ?? DEFAULT_CURRENCY;

    const cashDayForTournament = cashDay(tournament.startDate);

    for (const item of desired) {
      const existing = await repos.movements.findOne({
        where: { sourceKey: item.sourceKey },
      });
      if (existing) {
        // Lo ya cobrado no se reescribe (el dinero que entró no se toca) salvo dos
        // correcciones de demostración: la fecha —versiones anteriores anotaban las
        // pre-inscripciones en la fecha (futura) del torneo y quedaban fuera de
        // caja— y el estado: la inscripción de un jugador se cobra al registrarlo,
        // así que ningún cobro generado puede quedarse "por cobrar".
        const needsRedate =
          new Date(existing.occurredAt).getTime() !==
          cashDayForTournament.getTime();
        if (existing.status === ClubCashMovementStatus.VOID) {
          // El cobro se anuló cuando la reserva dejó de jugar: si la reserva vuelve
          // al torneo, el cobro vuelve a existir (cobrado, como uno nuevo).
          existing.status = ClubCashMovementStatus.PAID;
          existing.paidAt = new Date();
          existing.settledByUserId = admin.id;
          existing.amount = entryAmount;
          existing.feeAmount = feeAmount;
          existing.currency = currency;
          existing.occurredAt = cashDayForTournament;
          if (existing.note === CLUB_CASH_VOID_NOTE) existing.note = null;
          await repos.movements.save(existing);
          revived += 1;
          continue;
        }
        if (existing.status === ClubCashMovementStatus.PENDING) {
          // Cobro que quedó pendiente con la regla anterior: la inscripción ya se
          // cobró al registrar al jugador.
          existing.status = ClubCashMovementStatus.PAID;
          existing.paidAt = new Date();
          existing.settledByUserId = admin.id;
          existing.amount = entryAmount;
          existing.feeAmount = feeAmount;
          existing.currency = currency;
          existing.occurredAt = cashDayForTournament;
          await repos.movements.save(existing);
          collected += 1;
          continue;
        }
        if (needsRedate) {
          existing.occurredAt = cashDayForTournament;
          await repos.movements.save(existing);
        }
        continue;
      }

      await repos.movements.save(
        repos.movements.create({
          clubId,
          tournamentId: tournament.id,
          userId: item.userId,
          reservationId: item.reservationId,
          type: item.type,
          direction: ClubCashDirection.IN,
          status: ClubCashMovementStatus.PAID,
          method: PAID_METHODS[paidIndex++ % PAID_METHODS.length],
          amount: entryAmount,
          feeAmount,
          currency,
          occurredAt: cashDayForTournament,
          paidAt: new Date(),
          createdByUserId: admin.id,
          settledByUserId: admin.id,
          sourceKey: item.sourceKey,
        }),
      );
      created += 1;
    }
  }
  if (created > 0) {
    ok(`${created} inscripciones/re-entradas en la caja (cobradas)`);
  }
  if (collected > 0) {
    ok(`${collected} inscripciones que seguían "por cobrar" quedaron cobradas`);
  }
  if (revived > 0) {
    ok(`${revived} cobros anulados revividos (su reserva vuelve a jugar)`);
  }

  // Segundo pase: ningún cobro generado puede quedarse sin la reserva que lo
  // respalda (jugador rechazado o devuelto a pendiente, rebuy retirado). Los que
  // sobran se borran si seguían pendientes y se anulan si ya se habían cobrado,
  // igual que hace `CashService.sync`. El dinero ya cobrado nunca se reescribe.
  const desiredKeys = new Set(
    plans.flatMap((plan) => plan.desired.map((item) => item.sourceKey)),
  );
  const generated = await repos.movements.find({
    where: {
      clubId,
      tournamentId: In(plans.map((plan) => plan.tournament.id)),
      type: In([ClubCashMovementType.ENTRY, ClubCashMovementType.RE_ENTRY]),
    },
  });
  let removed = 0;
  let voided = 0;
  for (const movement of generated) {
    if (!movement.sourceKey || desiredKeys.has(movement.sourceKey)) continue;
    if (movement.status === ClubCashMovementStatus.VOID) continue;
    if (movement.status === ClubCashMovementStatus.PENDING) {
      await repos.movements.delete(movement.id);
      removed += 1;
      continue;
    }
    movement.status = ClubCashMovementStatus.VOID;
    movement.note = movement.note ?? "Anulado: la entrada dejó de existir";
    await repos.movements.save(movement);
    voided += 1;
  }
  if (removed > 0 || voided > 0) {
    warn(
      `${removed} cobros pendientes retirados y ${voided} cobros anulados (su reserva ya no juega)`,
    );
  }

  // Premios ya pagados (un movimiento por puesto, clave `prize:tournament:*`).
  let payouts = 0;
  for (const { spec, tournament } of seeded) {
    if (!spec.payouts?.length) continue;
    for (const payout of spec.payouts) {
      const entry = roster[payout.index];
      if (!entry) continue;
      const sourceKey = `prize:tournament:${tournament.id}:place:${payout.place}`;
      const existing = await repos.movements.findOne({ where: { sourceKey } });
      if (existing) continue;
      const now = new Date();
      await repos.movements.save(
        repos.movements.create({
          clubId,
          tournamentId: tournament.id,
          userId: entry.user.id,
          type: ClubCashMovementType.PRIZE,
          direction: ClubCashDirection.OUT,
          status: ClubCashMovementStatus.PAID,
          method: ClubCashPaymentMethod.CASH,
          amount: payout.amount,
          feeAmount: null,
          currency: tournament.currency ?? DEFAULT_CURRENCY,
          place: payout.place,
          note: `Premio ${payout.place}º puesto · ${entry.user.name}`,
          occurredAt: now,
          paidAt: now,
          createdByUserId: admin.id,
          settledByUserId: admin.id,
          sourceKey,
        }),
      );
      payouts += 1;
    }
  }
  if (payouts > 0) ok(`${payouts} premios pagados registrados en la caja`);

  // Movimientos manuales (gastos, ingresos, retiradas y ajustes): no se duplican por nota.
  const knownNotes = new Set(
    (await repos.movements.find({ where: { clubId }, select: ["id", "note"] }))
      .map((movement) => movement.note)
      .filter((note): note is string => Boolean(note)),
  );
  let manual = 0;
  for (const movement of MANUAL_MOVEMENTS) {
    if (knownNotes.has(movement.note)) continue;
    const occurredAt = daysFromNow(-movement.daysAgo, 12);
    await repos.movements.save(
      repos.movements.create({
        clubId,
        type: movement.type,
        direction: movement.direction
          ? (movement.direction as ClubCashDirection)
          : CLUB_CASH_TYPE_DIRECTION[movement.type],
        status: ClubCashMovementStatus.PAID,
        method: movement.method as ClubCashPaymentMethod,
        amount: movement.amount,
        feeAmount: 0,
        currency: DEFAULT_CURRENCY,
        note: movement.note,
        occurredAt,
        paidAt: occurredAt,
        createdByUserId: admin.id,
        settledByUserId: admin.id,
        sourceKey: null,
      }),
    );
    knownNotes.add(movement.note);
    manual += 1;
  }
  if (manual > 0)
    ok(
      `${manual} movimientos manuales (gastos, ingresos, retiradas y ajustes)`,
    );

  // Add-ons cobrados en el torneo en curso.
  let addOns = 0;
  for (const addOn of ADD_ONS) {
    const target = seeded.find(
      (row) => row.tournament.name === addOn.tournament,
    );
    const entry = roster[addOn.index];
    if (!target || !entry) continue;
    const note = `Add-on nivel ${addOn.level} · ${entry.user.name}`;
    if (knownNotes.has(note)) continue;
    const occurredAt = cashDay(target.tournament.startDate);
    await repos.movements.save(
      repos.movements.create({
        clubId,
        tournamentId: target.tournament.id,
        userId: entry.user.id,
        type: ClubCashMovementType.ADD_ON,
        direction: ClubCashDirection.IN,
        status: ClubCashMovementStatus.PAID,
        method: ClubCashPaymentMethod.CASH,
        amount: addOn.amount,
        feeAmount: 0,
        currency: target.tournament.currency ?? DEFAULT_CURRENCY,
        note,
        occurredAt,
        paidAt: occurredAt,
        createdByUserId: admin.id,
        settledByUserId: admin.id,
        sourceKey: null,
      }),
    );
    knownNotes.add(note);
    addOns += 1;
  }
  if (addOns > 0) ok(`${addOns} add-ons cobrados`);

  // Contador denormalizado de add-ons (lo muestra el detalle del torneo).
  for (const { tournament } of seeded) {
    const count = await repos.movements.count({
      where: { tournamentId: tournament.id, type: ClubCashMovementType.ADD_ON },
    });
    if (count !== tournament.currentAddOns) {
      await repos.tournaments.update(tournament.id, { currentAddOns: count });
    }
  }
}

/** Resumen de caja (mismas magnitudes que `GET /clubs/:id/cash/summary`). */
async function cashSummaryRows(repos: DbRepos, clubId: number) {
  const movements = await repos.movements.find({ where: { clubId } });
  let collected = 0;
  let paidOut = 0;
  let pendingIn = 0;
  let pendingOut = 0;
  let pendingCount = 0;
  let commission = 0;
  let prizePot = 0;

  for (const movement of movements) {
    const amount = Number(movement.amount ?? 0);
    const fee = Number(movement.feeAmount ?? 0);
    if (movement.status === ClubCashMovementStatus.PAID) {
      if (movement.direction === ClubCashDirection.IN) {
        collected += amount;
        if (
          movement.type === ClubCashMovementType.ENTRY ||
          movement.type === ClubCashMovementType.RE_ENTRY
        ) {
          commission += fee;
          prizePot += amount - fee;
        } else if (movement.type === ClubCashMovementType.ADD_ON) {
          // El add-on va entero al bolo (no tiene comisión), igual que en la API.
          prizePot += amount;
        }
      } else {
        paidOut += amount;
      }
    } else if (movement.status === ClubCashMovementStatus.PENDING) {
      pendingCount += 1;
      if (movement.direction === ClubCashDirection.IN) pendingIn += amount;
      else pendingOut += amount;
    }
  }

  return {
    currency: movements[0]?.currency ?? DEFAULT_CURRENCY,
    collected: round2(collected),
    paidOut: round2(paidOut),
    net: round2(collected - paidOut),
    pendingIn: round2(pendingIn),
    pendingOut: round2(pendingOut),
    pendingCount,
    balance: round2(collected - paidOut),
    commission: round2(commission),
    prizePot: round2(prizePot),
  };
}

/** Siembra directa en la base de datos (SEED_MODE=db, por defecto). */
async function runWithDatabase(): Promise<void> {
  info("modo: base de datos (SEED_MODE=db) · sin API ni límite de /auth");
  const dataSource: DataSource = await typeormConfig.initialize();
  try {
    const repos: DbRepos = {
      users: dataSource.getRepository(User),
      clubs: dataSource.getRepository(Club),
      members: dataSource.getRepository(ClubMember),
      gameTypes: dataSource.getRepository(GameType),
      tournaments: dataSource.getRepository(Tournament),
      reservations: dataSource.getRepository(TournamentReservation),
      prizes: dataSource.getRepository(TournamentPrize),
      movements: dataSource.getRepository(ClubCashMovement),
    };

    const admin = await repos.users.findOne({ where: { email: ADMIN_EMAIL } });
    if (!admin) {
      throw new Error(
        `no existe el usuario ${ADMIN_EMAIL}: ejecuta "npm run seed" o usa SEED_MODE=api con el backend arriba`,
      );
    }
    ok(`admin: ${admin.name} <${admin.email}>`);

    const club = await resolveClubRow(repos, admin);
    ok(`club: ${club.name} (#${club.id}, código ${club.code})`);

    const gameType = await resolveGameTypeRow(repos);
    const roster = await prepareRosterRows(repos, club);
    ok(
      `${roster.length}/${ROSTER.length} jugadores con cuenta y membresía en el club`,
    );

    info("sembrando torneos…");
    const ctx: DbContext = { club, admin, gameType, roster, tournaments: [] };
    for (const spec of TOURNAMENTS) {
      const tournament = await seedTournamentRow(spec, repos, ctx);
      ctx.tournaments.push({ spec, tournament });
    }

    info("sembrando caja (Recaudado)…");
    await seedCashRows(repos, ctx);
    const summary = await cashSummaryRows(repos, club.id);

    // ---------------- Resumen ----------------
    const clubTournaments = await repos.tournaments.find({
      where: { clubId: club.id },
    });
    const byStatus = new Map<string, number>();
    clubTournaments.forEach((tournament) => {
      byStatus.set(
        tournament.status,
        (byStatus.get(tournament.status) ?? 0) + 1,
      );
    });
    const reservations = clubTournaments.reduce(
      (sum, row) => sum + row.reservedPlayers,
      0,
    );
    const playersInPlay = clubTournaments.reduce(
      (sum, row) => sum + row.currentPlayers,
      0,
    );

    info("----------------------------------------------------------");
    info(
      `club "${club.name}" · código ${club.code} · ${roster.length} jugadores`,
    );
    info(
      `torneos: ${clubTournaments.length} (${[...byStatus.entries()]
        .map(([status, count]) => `${status} ${count}`)
        .join(" · ")})`,
    );
    info(
      `reservas: ${reservations} · jugadores en juego ahora: ${playersInPlay}`,
    );
    info(
      `resumen de caja (${summary.currency}): cobrado ${summary.collected.toFixed(2)} · ` +
        `pagado ${summary.paidOut.toFixed(2)} · neto ${summary.net.toFixed(2)} · ` +
        `pendiente de cobro ${summary.pendingIn.toFixed(2)} · pendiente de pago ` +
        `${summary.pendingOut.toFixed(2)} (${summary.pendingCount} movimientos) · ` +
        `saldo ${summary.balance.toFixed(2)} · comisión ${summary.commission.toFixed(2)} · ` +
        `bolo ${summary.prizePot.toFixed(2)}`,
    );
    info("cuentas demo (contraseña entre paréntesis):");
    info(`  admin    ${admin.email}  (${ADMIN_PASSWORD})`);
    info(
      `  operador ${ROSTER[ROLE_PLAN[0].index].email}  (${PLAYER_PASSWORD})`,
    );
    info(
      `  cajero   ${ROSTER[ROLE_PLAN[1].index].email}  (${PLAYER_PASSWORD})`,
    );
    info(
      `  jugador  ${ROSTER[ROLE_PLAN[2].index].email}  (${PLAYER_PASSWORD})`,
    );
    info(
      "listo: abre la app y entra al club para ver las pestañas de torneos y Recaudado",
    );
  } finally {
    if (dataSource.isInitialized) await dataSource.destroy();
  }
}

// ---------------- Punto de entrada ----------------

/** Siembra a través de la API real (SEED_MODE=api). */
async function runWithApi(): Promise<void> {
  info(`API: ${API_URL}`);
  const admin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  if (!admin) {
    throw new Error(
      `no se pudo iniciar sesión como ${ADMIN_EMAIL}. ¿Está el backend en marcha ` +
        `(${API_URL}) y la contraseña es correcta (SEED_ADMIN_PASSWORD)?`,
    );
  }
  ok(`admin: ${admin.user.name} <${admin.user.email}>`);

  const club = await resolveClub(admin);
  ok(`club: ${club.name} (#${club.id}, código ${club.code})`);

  const gameTypeId = await resolveGameType(admin);
  const roster = await prepareRoster(club, admin);

  const page = await api<PaginatedDto<TournamentDto>>(
    "GET",
    `/tournaments?clubId=${club.id}&limit=100`,
    undefined,
    admin.token,
  );
  const ctx: SeedContext = {
    club,
    admin,
    roster,
    gameTypeId,
    tournaments: page.items,
  };
  await repairMissingStartDates(ctx);

  info("sembrando torneos…");
  for (const spec of TOURNAMENTS) {
    const tournament = await seedTournament(spec, ctx);
    const index = ctx.tournaments.findIndex((row) => row.id === tournament.id);
    if (index === -1) ctx.tournaments.push(tournament);
    else ctx.tournaments[index] = tournament;
  }

  info("sembrando caja (Recaudado)…");
  await seedCash(ctx);

  // ---------------- Resumen ----------------
  const byStatus = new Map<string, number>();
  ctx.tournaments.forEach((tournament) => {
    byStatus.set(tournament.status, (byStatus.get(tournament.status) ?? 0) + 1);
  });
  const playersInPlay = ctx.tournaments.reduce(
    (sum, row) => sum + row.currentPlayers,
    0,
  );
  const reservations = ctx.tournaments.reduce(
    (sum, row) => sum + row.reservedPlayers,
    0,
  );

  info("----------------------------------------------------------");
  info(
    `club "${club.name}" · código ${club.code} · ${roster.length} jugadores`,
  );
  info(
    `torneos: ${ctx.tournaments.length} (${[...byStatus.entries()]
      .map(([status, count]) => `${status} ${count}`)
      .join(" · ")})`,
  );
  info(
    `reservas: ${reservations} · jugadores en juego ahora: ${playersInPlay}`,
  );
  info("cuentas demo (contraseña entre paréntesis):");
  info(`  admin    ${admin.user.email}  (${ADMIN_PASSWORD})`);
  info(`  operador ${ROSTER[ROLE_PLAN[0].index].email}  (${PLAYER_PASSWORD})`);
  info(`  cajero   ${ROSTER[ROLE_PLAN[1].index].email}  (${PLAYER_PASSWORD})`);
  info(`  jugador  ${ROSTER[ROLE_PLAN[2].index].email}  (${PLAYER_PASSWORD})`);
  if (PRINT_TOKENS) {
    info(`token admin: ${admin.token}`);
    roster.forEach((entry) =>
      info(`token ${entry.user.email}: ${entry.token}`),
    );
  }
  info(
    "listo: abre la app y entra al club para ver las pestañas de torneos y Recaudado",
  );
}

/**
 * Entrada del seeder: `db` (por defecto) escribe directo en la base de datos;
 * `api` usa la API real (requiere el backend en marcha).
 */
async function main(): Promise<void> {
  if (SEED_MODE === "api") {
    await runWithApi();
    return;
  }
  if (SEED_MODE !== "db") {
    throw new Error(
      `SEED_MODE="${SEED_MODE}" no es válido: usa "db" (por defecto) o "api"`,
    );
  }
  await runWithDatabase();
}

void main().catch((error: unknown) => {
  console.error(
    "Seed-demo failed:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
