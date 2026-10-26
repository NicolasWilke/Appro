import type { SerieIndice } from './types';

/** Reconstruye precios mensuales hacia atrás desde el último valor. Devuelve 13 puntos. */
export function serieNominal(s: Pick<SerieIndice, 'actual' | 'variaciones'>): number[] {
  const valores = [s.actual];
  for (let i = s.variaciones.length - 1; i >= 0; i--) valores.unshift(valores[0] / (1 + s.variaciones[i] / 100));
  return valores;
}

export const base100 = (valores: number[]) => valores.map((v) => (v / valores[0]) * 100);

export function serieDesdeVariaciones(variaciones: number[]): number[] {
  const out = [100];
  for (const v of variaciones) out.push(out[out.length - 1] * (1 + v / 100));
  return out;
}

export const acumulada = (variaciones: number[]) => (variaciones.reduce((a, v) => a * (1 + v / 100), 1) - 1) * 100;

/** Variación real: nominal deflactada por inflación, ambas en %. */
export const variacionReal = (nominal: number, inflacion: number) => ((1 + nominal / 100) / (1 + inflacion / 100) - 1) * 100;

/** Cuánto se aleja un precio del mediano del índice, en %. */
export const desvioVsIndice = (precio: number, referencia: number) => (precio / referencia - 1) * 100;

export type Lectura = 'debajo' | 'en-rango' | 'arriba';
export function leerDesvio(desvio: number): Lectura {
  if (desvio <= -3) return 'debajo';
  if (desvio >= 5) return 'arriba';
  return 'en-rango';
}
