import type { Plan, PlanId } from './types';

// Precios de referencia en USD, facturados en pesos con ajuste trimestral.
export const PLANES: Record<PlanId, Plan> = {
  gratis: { id: 'gratis', nombre: 'Gratis', precioUsd: 0, solicitudesMes: 3, respuestasMes: 3, analitica: false, destacado: false, usuarios: 1 },
  pro: { id: 'pro', nombre: 'Pro', precioUsd: 59, solicitudesMes: 25, respuestasMes: null, analitica: true, destacado: false, usuarios: 1 },
  empresa: { id: 'empresa', nombre: 'Empresa', precioUsd: 290, solicitudesMes: 80, respuestasMes: null, analitica: true, destacado: true, usuarios: 5 },
};

export const DESCUENTO_ANUAL = 0.15;

export const precioMensual = (plan: Plan, anual: boolean) =>
  Math.round(plan.precioUsd * (anual ? 1 - DESCUENTO_ANUAL : 1));
