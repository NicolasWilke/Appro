import type { RegionId, RubroId, ValorReferencia } from './types';

/**
 * Lleva un monto relevado en `fecha` (yyyy-mm) a pesos del último mes de la serie.
 * `meses` tiene un elemento más que `inflacion`: inflacion[i] es la variación de meses[i] a meses[i+1].
 */
/** Un valor en 0 todavía no fue cargado: se muestra como "a definir". */
export const tieneValor = (v: Pick<ValorReferencia, 'max'>) => v.max > 0;

export function factorInflacion(fecha: string | undefined, mesesIso: string[], inflacion: number[]): number {
  if (!fecha) return 1;
  const desde = mesesIso.indexOf(fecha);
  if (desde < 0) return 1;
  return inflacion.slice(desde).reduce((f, v) => f * (1 + v / 100), 1);
}

export function ajustar(v: ValorReferencia, factor: number): ValorReferencia {
  if (factor === 1) return v;
  return { ...v, min: v.min * factor, mediana: v.mediana * factor, max: v.max * factor };
}

/** Valores que aplican a una región: los propios de la región más los nacionales. */
export function valoresPara(valores: ValorReferencia[], f: { rubro?: RubroId; region?: RegionId; tipo?: ValorReferencia['tipo'] }) {
  return valores.filter((v) =>
    (!f.rubro || v.rubro === f.rubro) &&
    (!f.region || v.region === f.region || v.region === 'nacional') &&
    (!f.tipo || v.tipo === f.tipo));
}

/** El valor que se usa al cargar un pedido: el principal del rubro, preferentemente de la región. */
export function valorDelRubro(valores: ValorReferencia[], rubro: RubroId, region?: RegionId) {
  const candidatos = valores.filter((v) => v.rubro === rubro && v.principal);
  return candidatos.find((v) => v.region === region) ?? candidatos.find((v) => v.region === 'nacional') ?? candidatos[0];
}

export function estimarTotal(v: Pick<ValorReferencia, 'min' | 'mediana' | 'max'>, cantidad: number) {
  return { min: v.min * cantidad, mediana: v.mediana * cantidad, max: v.max * cantidad };
}

/** Posición 0–1 de un precio dentro del rango (puede salir de 0–1 si está fuera). */
export const posicionEnRango = (precio: number, v: Pick<ValorReferencia, 'min' | 'max'>) => (v.max > v.min ? (precio - v.min) / (v.max - v.min) : 0.5);
