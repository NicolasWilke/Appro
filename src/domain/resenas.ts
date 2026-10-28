import { ReglaDeNegocioError } from './reglas';
import type { ValorReferencia } from './types';

export interface DatosResena { entrega: number; calidad: number; facturacion: number; texto: string }

export const RESENA_TEXTO = { min: 20, max: 500 } as const;

/** La reseña la deja el comprador sobre el proveedor al que le adjudicó un pedido. Una por pedido. */
export function validarResena(r: DatosResena) {
  for (const k of ['entrega', 'calidad', 'facturacion'] as const) {
    if (!Number.isInteger(r[k]) || r[k] < 1 || r[k] > 5) throw new ReglaDeNegocioError('RESENA_INVALIDA', 'Puntuá entrega, calidad y facturación de 1 a 5.');
  }
  const largo = r.texto.trim().length;
  if (largo < RESENA_TEXTO.min || largo > RESENA_TEXTO.max) {
    throw new ReglaDeNegocioError('RESENA_INVALIDA', `El comentario tiene que tener entre ${RESENA_TEXTO.min} y ${RESENA_TEXTO.max} caracteres.`);
  }
}

/** Un valor de referencia en $0 es "a definir". Si tiene valor, el rango tiene que estar ordenado. */
export function validarValor(v: Pick<ValorReferencia, 'min' | 'mediana' | 'max'>) {
  if ([v.min, v.mediana, v.max].some((n) => !Number.isFinite(n) || n < 0)) throw new ReglaDeNegocioError('VALOR_INVALIDO', 'Los valores no pueden ser negativos.');
  if (v.min > v.mediana || v.mediana > v.max) throw new ReglaDeNegocioError('VALOR_INVALIDO', 'Tiene que cumplirse mínimo ≤ mediana ≤ máximo.');
}
