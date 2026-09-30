import { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/theme';
import { radius } from '@/theme/radius';

export interface PokerTableSeat {
  /** Numero de silla (1..seatCount). */
  seatNumber: number;
  /** Nombre del jugador sentado en la silla. */
  name: string;
  /** Stack con el que entro el jugador (opcional). */
  stack?: number | null;
}

export interface PokerTableViewProps {
  /** Total de sillas de la mesa (1..9). */
  seatCount?: number;
  /** Jugadores sentados; se colocan segun su numero de silla. */
  seats: PokerTableSeat[];
  /** Etiqueta que se muestra en las sillas libres. */
  emptyLabel: string;
  /** Texto opcional en el centro del fieltro (p. ej. "Mesa 3"). */
  feltLabel?: string;
  /** Si se define, las sillas ocupadas son pulsables (abre las acciones del jugador). */
  onPressSeat?: (seatNumber: number) => void;
}

/** Medidas de cada silla (avatar + nombre). */
const SEAT_WIDTH = 64;
const SEAT_HEIGHT = 66;
const AVATAR_SIZE = 44;
/** Altura maxima del lienzo de la mesa para no ocupar toda la pantalla. */
const MAX_STAGE_HEIGHT = 380;

/** Colores fijos del tapete: mantienen el aspecto de mesa de poker en ambos temas. */
const FELT_RAIL = '#4A2C1A';
const FELT_CLOTH = '#0F5C3C';
const FELT_EDGE = '#0A3E28';

/** Iniciales del jugador para el avatar de su silla. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

/**
 * Mesa de poker: coloca a los jugadores alrededor del fieltro segun su numero
 * de silla (la silla 1 arriba y el resto en sentido horario).
 */
export function PokerTableView({
  seatCount = 9,
  seats,
  emptyLabel,
  feltLabel,
  onPressSeat,
}: PokerTableViewProps) {
  const { colors } = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });

  const handleLayout = (event: LayoutChangeEvent) => {
    const width = Math.round(event.nativeEvent.layout.width);
    if (width > 0 && width !== size.width) {
      setSize({ width, height: Math.min(width, MAX_STAGE_HEIGHT) });
    }
  };

  const bySeat = new Map<number, PokerTableSeat>();
  seats.forEach((seat) => bySeat.set(seat.seatNumber, seat));

  const ready = size.width > 0;
  const cx = size.width / 2;
  const cy = size.height / 2;
  const rx = Math.max(0, cx - SEAT_WIDTH / 2);
  const ry = Math.max(0, cy - SEAT_HEIGHT / 2);
  const feltWidth = size.width * 0.56;
  const feltHeight = size.height * 0.52;

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {ready ? (
        <View style={[styles.stage, { width: size.width, height: size.height }]}>
          <View
            style={[
              styles.felt,
              {
                width: feltWidth,
                height: feltHeight,
                left: cx - feltWidth / 2,
                top: cy - feltHeight / 2,
              },
            ]}
          >
            <View style={styles.cloth}>
              {feltLabel ? (
                <AppText variant="label" weight="semibold" center color="#D7F5E5">
                  {feltLabel}
                </AppText>
              ) : null}
            </View>
          </View>

          {Array.from({ length: seatCount }, (_, index) => {
            const seatNumber = index + 1;
            const angle = -Math.PI / 2 + (index * 2 * Math.PI) / seatCount;
            const seat = bySeat.get(seatNumber);
            const canPress = !!seat && !!onPressSeat;
            return (
              <Pressable
                key={seatNumber}
                disabled={!canPress}
                onPress={() => onPressSeat?.(seatNumber)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={seat ? seat.name : emptyLabel}
                style={({ pressed }) => [
                  styles.seat,
                  {
                    left: cx + rx * Math.cos(angle) - SEAT_WIDTH / 2,
                    top: cy + ry * Math.sin(angle) - SEAT_HEIGHT / 2,
                  },
                  pressed ? styles.seatPressed : null,
                ]}
              >
                <View
                  style={[
                    styles.avatar,
                    seat
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
                      : {
                          backgroundColor: colors.surfaceMuted,
                          borderColor: colors.border,
                          borderStyle: 'dashed',
                        },
                  ]}
                >
                  <AppText
                    variant="caption"
                    weight="semibold"
                    color={seat ? colors.onPrimary : colors.textMuted}
                  >
                    {seat ? initials(seat.name) : ''}
                  </AppText>
                  <View
                    style={[
                      styles.seatBadge,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <AppText variant="caption" weight="semibold" color={colors.textSecondary}>
                      {seatNumber}
                    </AppText>
                  </View>
                </View>
                <AppText
                  variant="caption"
                  center
                  numberOfLines={1}
                  color={seat ? colors.textPrimary : colors.textMuted}
                  style={styles.seatName}
                >
                  {seat ? seat.name : emptyLabel}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  stage: { position: 'relative' },
  felt: {
    position: 'absolute',
    backgroundColor: FELT_RAIL,
    borderRadius: radius.full,
    padding: 6,
  },
  cloth: {
    flex: 1,
    backgroundColor: FELT_CLOTH,
    borderColor: FELT_EDGE,
    borderWidth: 1,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  seat: { position: 'absolute', width: SEAT_WIDTH, alignItems: 'center' },
  /** Feedback al pulsar una silla ocupada. */
  seatPressed: { opacity: 0.6 },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  seatName: { width: SEAT_WIDTH, marginTop: 2 },
});
