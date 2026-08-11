import { Tournament } from '@/api/types';

/** Cantidad de puestos pagados segun la configuracion del torneo (% del campo de jugadores o cantidad fija). */
export function getPaidPlacesCount(
  tournament: Pick<Tournament, 'paidPlacesType' | 'paidPlacesValue' | 'maxPlayers'>,
): number {
  const value = tournament.paidPlacesValue ?? 0;
  if (tournament.paidPlacesType === 'percent' && value > 0) {
    const players = tournament.maxPlayers ?? 45;
    return Math.min(Math.max(Math.round((players * value) / 100), 1), 50);
  }
  return Math.min(Math.max(value, 0), 50);
}

/** Distribucion proporcional por defecto del premio garantizado entre los puestos pagados
 *  (misma logica que la app admin: pesos descendentes, el ultimo ajusta el total). */
export function buildDefaultPrizes(placeCount: number, total: number): { place: number; amount: number }[] {
  if (total <= 0 || placeCount <= 0) return [];
  if (placeCount === 1) return [{ place: 1, amount: total }];
  const weights = Array.from({ length: placeCount }, (_, i) => placeCount - i);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const result: { place: number; amount: number }[] = [];
  let assigned = 0;
  weights.forEach((w, i) => {
    const place = i + 1;
    const amount = i === placeCount - 1 ? total - assigned : Math.round((total * w) / weightSum);
    result.push({ place, amount });
    assigned += amount;
  });
  return result;
}
