import { ValueTransformer } from 'typeorm';

/**
 * Convierte las columnas DECIMAL de MySQL (que llegan como string)
 * a number en tiempo de ejecucion.
 */
export const DecimalTransformer: ValueTransformer = {
  to: (value?: number | null) => value ?? null,
  from: (value?: string | null) => (value === null || value === undefined ? value : parseFloat(value)),
};
