import type { Moneda, PedidoCotizacion, TipoCambio } from './types';

export const MONEDAS: { id: Moneda; nombre: string }[] = [
  { id: 'ARS', nombre: 'Pesos' },
  { id: 'USD', nombre: 'Dólares' },
];

/** Los pedidos anteriores a esta función no tienen moneda: son en pesos. */
export const monedaDe = (p: Pick<PedidoCotizacion, 'moneda'>): Moneda => p.moneda ?? 'ARS';

export const otraMoneda = (m: Moneda): Moneda => (m === 'USD' ? 'ARS' : 'USD');

/** Pasa un importe a la otra moneda con el dólar dado (pesos por dólar). */
export function equivalente(monto: number, de: Moneda, tc: Pick<TipoCambio, 'valor'>): number {
  if (!(tc.valor > 0)) return 0;
  return de === 'USD' ? monto * tc.valor : monto / tc.valor;
}

/** Valida lo que devuelve la fuente pública del dólar. */
export function leerDolar(d: unknown, ahora = new Date()): TipoCambio | null {
  const x = d as { venta?: unknown; fechaActualizacion?: unknown } | null;
  const valor = typeof x?.venta === 'number' ? x.venta : Number(x?.venta);
  if (!(valor > 0) || valor > 1e6) return null;
  const fecha = typeof x?.fechaActualizacion === 'string' && /^\d{4}-\d{2}-\d{2}/.test(x.fechaActualizacion)
    ? x.fechaActualizacion.slice(0, 10)
    : ahora.toISOString().slice(0, 10);
  return { valor, fuente: 'Dólar oficial BNA, vendedor', fecha };
}
