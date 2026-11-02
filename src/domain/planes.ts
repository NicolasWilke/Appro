import type { Plan, PlanId, RegionId } from './types';

// Precios de referencia en USD, facturados en pesos con ajuste trimestral.
export const PLANES: Record<PlanId, Plan> = {
  gratis: { id: 'gratis', nombre: 'Gratis', precioUsd: 0, solicitudesMes: 3, respuestasMes: 3, analitica: false, destacado: false, usuarios: 1, regiones: 1 },
  pro: { id: 'pro', nombre: 'Pro', precioUsd: 59, solicitudesMes: 25, respuestasMes: null, analitica: true, destacado: false, usuarios: 1, regiones: 1 },
  empresa: { id: 'empresa', nombre: 'Empresa', precioUsd: 290, solicitudesMes: 80, respuestasMes: null, analitica: true, destacado: true, usuarios: 5, regiones: 5 },
};

export const DESCUENTO_ANUAL = 0.15;

export const precioMensual = (plan: Plan, anual: boolean) =>
  Math.round(plan.precioUsd * (anual ? 1 - DESCUENTO_ANUAL : 1));

/**
 * Regiones que muestra el perfil: la principal primero y después las que sumó el proveedor, hasta lo que
 * permite su plan. Si baja de plan, las de más quedan guardadas pero dejan de mostrarse.
 */
export function regionesVisibles(plan: PlanId, principal: RegionId, extra: RegionId[] = []): RegionId[] {
  return [principal, ...extra.filter((r) => r !== principal)].filter((r, i, l) => l.indexOf(r) === i).slice(0, PLANES[plan].regiones);
}

/** Cobertura del perfil a partir de las regiones visibles. */
export const coberturaDe = (regiones: RegionId[]) => Object.fromEntries(regiones.map((r) => [r, 100])) as Partial<Record<RegionId, number>>;

/** Mes del cupo, en UTC: el mismo que calculan las reglas de Firestore con request.time. */
export const mesCupo = (ahora = new Date()) => ahora.toISOString().slice(0, 7);
