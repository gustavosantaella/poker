import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { TableStatus, TournamentStatus } from '@/api/types';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { AppText } from '@/components/ui/AppText';
import { Badge, BadgeTone } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingView } from '@/components/ui/LoadingView';
import { useTables, useTournaments } from '@/hooks/use-queries';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import { spacing } from '@/theme/spacing';
import { formatChips } from '@/utils/format';
import {
  CalendarDay,
  dateKey,
  formatDayLabel,
  formatEventTime,
  formatMonthLabel,
  getMonthGrid,
  getWeekdayLabels,
  startOfToday,
} from '@/utils/calendar';

type CalendarEvent =
  | { kind: 'tournament'; id: number; name: string; date: Date; status: TournamentStatus; buyIn: number }
  | { kind: 'table'; id: number; name: string; status: TableStatus; blinds: string };

const LOCALE: Record<string, string> = { en: 'en-US', es: 'es-ES' };

function eventTone(status: string): BadgeTone {
  if (status === 'running' || status === 'open') return 'success';
  if (status === 'registering' || status === 'paused') return 'warning';
  if (status === 'cancelled') return 'danger';
  return 'neutral';
}

export default function CalendarScreen() {
  const router = useRouter();
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const locale = LOCALE[language] ?? 'en-US';
  const weekStartsOn: 0 | 1 = language === 'es' ? 1 : 0;

  const {
    data: tournamentsData,
    isLoading: tournamentsLoading,
    isRefetching: tournamentsRefetching,
    refetch: refetchTournaments,
  } = useTournaments();
  const {
    data: tablesData,
    isLoading: tablesLoading,
    isRefetching: tablesRefetching,
    refetch: refetchTables,
  } = useTables();

  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedKey, setSelectedKey] = useState<string>(() => dateKey(startOfToday()));

  // Agrupa eventos por día: torneos por su fecha de inicio y mesas abiertas hoy.
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    const todayKey = dateKey(startOfToday());
    for (const trn of tournamentsData?.items ?? []) {
      if (trn.status === 'cancelled') continue;
      const date = new Date(trn.startDate);
      if (Number.isNaN(date.getTime())) continue;
      const key = dateKey(date);
      const arr = map.get(key) ?? [];
      arr.push({
        kind: 'tournament',
        id: trn.id,
        name: trn.name,
        date,
        status: trn.status,
        buyIn: trn.buyIn,
      });
      map.set(key, arr);
    }
    for (const table of tablesData?.items ?? []) {
      if (table.status !== 'open' && table.status !== 'running') continue;
      const arr = map.get(todayKey) ?? [];
      arr.push({
        kind: 'table',
        id: table.id,
        name: table.name,
        status: table.status,
        blinds: `${formatChips(table.smallBlind)}/${formatChips(table.bigBlind)}`,
      });
      map.set(todayKey, arr);
    }
    return map;
  }, [tournamentsData, tablesData]);

  const grid = useMemo(
    () => getMonthGrid(cursor.year, cursor.month, weekStartsOn),
    [cursor.year, cursor.month, weekStartsOn],
  );
  const weeks = useMemo(() => {
    const rows: CalendarDay[][] = [];
    for (let i = 0; i < grid.length; i += 7) rows.push(grid.slice(i, i + 7));
    return rows;
  }, [grid]);
  const weekdays = useMemo(() => getWeekdayLabels(locale, weekStartsOn), [locale, weekStartsOn]);
  const monthLabel = formatMonthLabel(cursor.year, cursor.month, locale);

  const selectedDate = useMemo(() => {
    const cell = grid.find((d) => d.key === selectedKey);
    return cell?.date ?? startOfToday();
  }, [grid, selectedKey]);

  const selectedEvents = useMemo(() => {
    const arr = [...(eventsByDay.get(selectedKey) ?? [])];
    arr.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'table' ? 1 : -1;
      if (a.kind === 'tournament' && b.kind === 'tournament') return a.date.getTime() - b.date.getTime();
      return a.name.localeCompare(b.name);
    });
    return arr;
  }, [eventsByDay, selectedKey]);

  const loading = tournamentsLoading || tablesLoading;

  const goPrev = () =>
    setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }));
  const goNext = () =>
    setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }));
  const goToday = () => {
    const now = new Date();
    setCursor({ year: now.getFullYear(), month: now.getMonth() });
    setSelectedKey(dateKey(startOfToday()));
  };

  const renderEvent = (event: CalendarEvent) => {
    const isTournament = event.kind === 'tournament';
    return (
      <Pressable
        key={`${event.kind}-${event.id}`}
        onPress={() => router.push(isTournament ? `/tournament/${event.id}` : `/table/${event.id}`)}
        style={({ pressed }) => [
          styles.eventRow,
          { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <View style={[styles.eventIcon, { backgroundColor: isTournament ? colors.primaryMuted : colors.successMuted }]}>
          <Ionicons
            name={isTournament ? 'trophy-outline' : 'grid-outline'}
            size={18}
            color={isTournament ? colors.primary : colors.success}
          />
        </View>
        <View style={styles.eventInfo}>
          <AppText variant="body" weight="semibold">
            {event.name}
          </AppText>
          {isTournament ? (
            <AppText variant="caption" color={colors.textSecondary}>
              {formatEventTime(event.date, locale)} · {t('calendar.tournament')}
            </AppText>
          ) : (
            <AppText variant="caption" color={colors.textSecondary}>
              {t('calendar.openNow')} · {event.blinds}
            </AppText>
          )}
        </View>
        <Badge label={t(`status.${event.status}`)} tone={eventTone(event.status)} />
      </Pressable>
    );
  };

  return (
    <AppScreen
      refreshing={tournamentsRefetching || tablesRefetching}
      onRefresh={async () => {
        await Promise.all([refetchTournaments(), refetchTables()]);
      }}
    >
      <AppHeader title={t('calendar.title')} subtitle={t('calendar.subtitle')} />

      <View style={styles.monthNav}>
        <Pressable
          onPress={goPrev}
          hitSlop={8}
          style={({ pressed }) => [styles.iconBtn, { backgroundColor: pressed ? colors.surfaceMuted : 'transparent' }]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </Pressable>
        <Pressable onPress={goToday} style={styles.monthLabel}>
          <AppText variant="subtitle">{monthLabel}</AppText>
        </Pressable>
        <Pressable
          onPress={goNext}
          hitSlop={8}
          style={({ pressed }) => [styles.iconBtn, { backgroundColor: pressed ? colors.surfaceMuted : 'transparent' }]}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {weekdays.map((w) => (
          <AppText key={w} variant="caption" center style={styles.weekDay}>
            {w}
          </AppText>
        ))}
      </View>

      <AppCard padded={false}>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((day) => {
              const dayEvents = eventsByDay.get(day.key);
              const hasTournament = dayEvents?.some((e) => e.kind === 'tournament');
              const hasTable = dayEvents?.some((e) => e.kind === 'table');
              const selected = day.key === selectedKey;
              return (
                <Pressable key={day.key} onPress={() => setSelectedKey(day.key)} style={styles.dayCell}>
                  <View
                    style={[
                      styles.dayNumber,
                      day.isToday && { backgroundColor: colors.primary },
                      selected && { borderWidth: 2, borderColor: colors.primary },
                    ]}
                  >
                    <AppText
                      variant="caption"
                      weight={day.isToday || selected ? 'semibold' : 'regular'}
                      color={day.isToday ? colors.onPrimary : day.inMonth ? colors.textPrimary : colors.textMuted}
                      center
                    >
                      {day.date.getDate()}
                    </AppText>
                  </View>
                  <View style={styles.dotRow}>
                    {hasTournament ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
                    {hasTable ? <View style={[styles.dot, { backgroundColor: colors.success }]} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </AppCard>

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">
          {t('calendar.eventsOn', { date: formatDayLabel(selectedDate, locale) })}
        </AppText>
        <AppButton title={t('calendar.today')} variant="ghost" size="sm" onPress={goToday} />
      </View>

      {loading ? (
        <LoadingView />
      ) : selectedEvents.length === 0 ? (
        <EmptyState icon="calendar-outline" title={t('calendar.noEvents')} />
      ) : (
        selectedEvents.map(renderEvent)
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  monthLabel: { flex: 1, alignItems: 'center' },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: { flexDirection: 'row' },
  weekDay: { flex: 1, paddingVertical: spacing.xs },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.xxs,
    minHeight: 52,
  },
  dayNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotRow: { flexDirection: 'row', gap: 3, height: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  eventIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventInfo: { flex: 1 },
});

