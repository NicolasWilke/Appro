import { ReglaDeNegocioError } from './reglas';
import type { Cotizacion, Enlace, ItemCotizado, ItemPedido, PedidoCotizacion } from './types';

/**
 * Reglas del pedido de cotización (RFQ): ítems, sobre cerrado, ofertas por ítem, comparación y adjudicación.
 * Las usan el mock, Firestore y las pantallas; las reglas de Firestore repiten lo que hace a la seguridad.
 */

/** Hora de Buenos Aires: los cierres se guardan con su zona para no depender del reloj de quien mira. */
export const ZONA_HORARIA = '-03:00';
export const HORA_CIERRE = '18:00';
export const ITEMS_MAX = 30;
export const ADJUDICADOS_MAX = 5;
export const INVITADOS_MAX = 30;
export const ENLACES_MAX = 10;
export const IVAS = [0, 10.5, 21, 27] as const;
export const DOCUMENTOS_SUGERIDOS = [
  'Constancia de inscripción en ARCA',
  'Certificado de calidad (ISO u otro)',
  'Seguro de responsabilidad civil vigente',
  'Habilitación municipal o provincial',
  'Ficha técnica del producto',
];

export const cierreIso = (fecha: string, hora = HORA_CIERRE) => `${fecha}T${hora}:00${ZONA_HORARIA}`;
/** ISO con la hora de Argentina (UTC−3 todo el año), para que horaDeCierre no dependa de la zona del navegador. */
export const isoArgentina = (d: Date) => `${new Date(d.getTime() - 3 * 3600000).toISOString().slice(0, 19)}${ZONA_HORARIA}`;
/** Hora local de cierre, HH:MM, a partir del ISO guardado. */
export const horaDeCierre = (iso: string) => iso.slice(11, 16);

export const cerrado = (p: Pick<PedidoCotizacion, 'cierraEn'>, ahora = new Date()) => new Date(p.cierraEn).getTime() <= ahora.getTime();
export const recibeOfertas = (p: Pick<PedidoCotizacion, 'cierraEn' | 'estado'>, ahora = new Date()) => p.estado === 'abierto' && !cerrado(p, ahora);
/** Con sobre cerrado, el comprador ve los precios recién después del cierre. */
export const preciosVisibles = (p: Pick<PedidoCotizacion, 'cierraEn' | 'estado' | 'sobreCerrado'>, ahora = new Date()) =>
  !p.sobreCerrado || p.estado === 'adjudicado' || cerrado(p, ahora);
export const puedeCotizar = (p: Pick<PedidoCotizacion, 'privado' | 'invitados'>, proveedorId: string) => !p.privado || p.invitados.includes(proveedorId);

export const urlValida = (u: string) => /^https?:\/\/[^\s/]+\.[^\s]+$/.test(u.trim());

// ── Montos
export interface Linea { unitarioNeto: number; neto: number; iva: number; total: number }

export function linea(item: ItemPedido, c: ItemCotizado): Linea {
  const unitarioNeto = c.precioUnitario * (1 - c.descuento / 100);
  const neto = unitarioNeto * item.cantidad;
  const iva = neto * (c.iva / 100);
  return { unitarioNeto, neto, iva, total: neto + iva };
}

export const precioDe = (c: Cotizacion, itemId: string) => c.items.find((i) => i.itemId === itemId);

/** Totales de una oferta; con `itemIds`, solo esos ítems (adjudicación parcial). */
export function totales(p: PedidoCotizacion, c: Cotizacion, itemIds?: string[]) {
  let neto = 0, iva = 0;
  for (const item of p.items) {
    if (itemIds && !itemIds.includes(item.id)) continue;
    const precio = precioDe(c, item.id);
    if (!precio) continue;
    const l = linea(item, precio);
    neto += l.neto; iva += l.iva;
  }
  return { neto, iva, total: neto + iva };
}

// ── Comparación
export interface Celda extends Linea { mejor: boolean }
export interface Matriz {
  filas: { item: ItemPedido; celdas: (Celda | null)[] }[];
  totales: { proveedorId: string; neto: number; iva: number; total: number; plazoDias: number }[];
  /** Proveedores con el total más bajo y la entrega más rápida (puede haber empate) */
  totalMasBajo: string[];
  entregaMasRapida: string[];
}

const minimos = <T,>(xs: T[], valor: (x: T) => number) => {
  if (!xs.length) return [];
  const m = Math.min(...xs.map(valor));
  return xs.filter((x) => valor(x) === m);
};

/** Ítems en filas, proveedores en columnas, en el orden de `cotis`. */
export function matriz(p: PedidoCotizacion, cotis: Cotizacion[]): Matriz {
  const filas = p.items.map((item) => {
    const celdas = cotis.map((c) => {
      const precio = precioDe(c, item.id);
      return precio ? { ...linea(item, precio), mejor: false } : null;
    });
    const conPrecio = celdas.filter((x): x is Celda => !!x);
    if (conPrecio.length > 1) for (const x of minimos(conPrecio, (y) => Math.round(y.unitarioNeto * 100))) x.mejor = true;
    return { item, celdas };
  });
  const tot = cotis.map((c) => ({ proveedorId: c.proveedorId, ...totales(p, c), plazoDias: c.plazoDias }));
  const varias = cotis.length > 1;
  return {
    filas,
    totales: tot,
    totalMasBajo: varias ? minimos(tot, (t) => Math.round(t.total * 100)).map((t) => t.proveedorId) : [],
    entregaMasRapida: varias ? minimos(tot, (t) => t.plazoDias).map((t) => t.proveedorId) : [],
  };
}

/** Adjudicación sugerida: todo al total más bajo, o cada ítem al menor precio. */
export function sugerirAdjudicacion(p: PedidoCotizacion, cotis: Cotizacion[], modo: 'total' | 'item'): Record<string, string> {
  if (!cotis.length) return {};
  if (modo === 'total') {
    const ganador = [...cotis].sort((a, b) => totales(p, a).total - totales(p, b).total)[0];
    return Object.fromEntries(p.items.map((i) => [i.id, ganador.proveedorId]));
  }
  const out: Record<string, string> = {};
  for (const item of p.items) {
    const ofertas = cotis.map((c) => ({ c, precio: precioDe(c, item.id) })).filter((x) => x.precio);
    if (!ofertas.length) continue;
    out[item.id] = ofertas.sort((a, b) => linea(item, a.precio!).unitarioNeto - linea(item, b.precio!).unitarioNeto)[0].c.proveedorId;
  }
  return out;
}

/** Proveedores adjudicados, el de más ítems primero (es el "principal" del pedido). */
export function adjudicadosDe(asignacion: Record<string, string>): string[] {
  const cuenta = new Map<string, number>();
  for (const prov of Object.values(asignacion)) cuenta.set(prov, (cuenta.get(prov) ?? 0) + 1);
  return [...cuenta.entries()].sort((a, b) => b[1] - a[1]).map(([prov]) => prov);
}

/** Monto adjudicado y ahorro contra la oferta completa más alta. */
export function ahorro(p: PedidoCotizacion, cotis: Cotizacion[], asignacion: Record<string, string>) {
  const adjudicado = Object.entries(asignacion).reduce((s, [itemId, prov]) => {
    const c = cotis.find((x) => x.proveedorId === prov);
    return s + (c ? totales(p, c, [itemId]).total : 0);
  }, 0);
  const alto = Math.max(0, ...cotis.map((c) => totales(p, c).total));
  const monto = Math.max(0, alto - adjudicado);
  return { adjudicado, alto, monto, pct: alto > 0 ? (monto / alto) * 100 : 0 };
}

// ── Validaciones
const invalido = (codigo: 'PEDIDO_INVALIDO' | 'COTIZACION_INVALIDA' | 'ADJUDICACION_INVALIDA', msg: string) => new ReglaDeNegocioError(codigo, msg);

function validarEnlaces(enlaces: Enlace[], codigo: 'PEDIDO_INVALIDO' | 'COTIZACION_INVALIDA') {
  if (enlaces.length > ENLACES_MAX) throw invalido(codigo, `Podés sumar hasta ${ENLACES_MAX} enlaces.`);
  for (const e of enlaces) {
    if (!e.nombre.trim()) throw invalido(codigo, 'Cada enlace necesita un nombre.');
    if (!urlValida(e.url)) throw invalido(codigo, `"${e.nombre}" no tiene un enlace válido. Tiene que empezar con https://`);
  }
}

export function validarPedido(p: Pick<PedidoCotizacion, 'titulo' | 'descripcion' | 'items' | 'cierraEn' | 'privado' | 'invitados' | 'documentos' | 'adjuntos' | 'entrega'>, ahora = new Date()) {
  const titulo = p.titulo.trim().length;
  if (titulo < 6 || titulo > 140) throw invalido('PEDIDO_INVALIDO', 'El título tiene que tener entre 6 y 140 caracteres.');
  if (p.descripcion.length > 1000) throw invalido('PEDIDO_INVALIDO', 'La descripción no puede pasar de 1000 caracteres.');
  if (!p.items.length) throw invalido('PEDIDO_INVALIDO', 'Agregá al menos un ítem.');
  if (p.items.length > ITEMS_MAX) throw invalido('PEDIDO_INVALIDO', `Un pedido puede tener hasta ${ITEMS_MAX} ítems.`);
  p.items.forEach((i, n) => {
    if (i.nombre.trim().length < 2) throw invalido('PEDIDO_INVALIDO', `Al ítem ${n + 1} le falta el nombre.`);
    if (!(i.cantidad > 0)) throw invalido('PEDIDO_INVALIDO', `La cantidad del ítem ${n + 1} tiene que ser mayor a cero.`);
    if (!i.unidad.trim()) throw invalido('PEDIDO_INVALIDO', `Al ítem ${n + 1} le falta la unidad.`);
    if (i.descripcion.length > 500) throw invalido('PEDIDO_INVALIDO', `La descripción del ítem ${n + 1} no puede pasar de 500 caracteres.`);
  });
  if (!p.entrega.trim()) throw invalido('PEDIDO_INVALIDO', 'Indicá dónde y cuándo es la entrega.');
  if (Number.isNaN(new Date(p.cierraEn).getTime()) || cerrado(p, ahora)) throw invalido('PEDIDO_INVALIDO', 'El cierre tiene que ser en el futuro.');
  if (p.privado && !p.invitados.length) throw invalido('PEDIDO_INVALIDO', 'Un pedido privado necesita al menos un proveedor invitado.');
  if (p.invitados.length > INVITADOS_MAX) throw invalido('PEDIDO_INVALIDO', `Podés invitar hasta ${INVITADOS_MAX} proveedores.`);
  if (p.documentos.length > 10 || p.documentos.some((d) => !d.trim() || d.length > 120)) throw invalido('PEDIDO_INVALIDO', 'Revisá los documentos exigidos: hasta 10, de hasta 120 caracteres.');
  validarEnlaces(p.adjuntos, 'PEDIDO_INVALIDO');
}

const hoyIso = (d: Date) => new Date(d.getTime() - 3 * 3600_000).toISOString().slice(0, 10);

export function validarCotizacion(p: PedidoCotizacion, c: Pick<Cotizacion, 'proveedorId' | 'items' | 'plazoDias' | 'vigencia' | 'adjuntos'>, ahora = new Date()) {
  if (!recibeOfertas(p, ahora)) throw new ReglaDeNegocioError('PEDIDO_CERRADO', 'Este pedido ya no recibe cotizaciones.');
  if (!puedeCotizar(p, c.proveedorId)) throw new ReglaDeNegocioError('NO_INVITADO', 'Este pedido es privado y no te invitaron a cotizar.');
  if (c.items.length !== p.items.length || p.items.some((i) => !c.items.some((x) => x.itemId === i.id)))
    throw invalido('COTIZACION_INVALIDA', 'Cotizá todos los ítems del pedido.');
  for (const x of c.items) {
    const nombre = p.items.find((i) => i.id === x.itemId)?.nombre ?? x.itemId;
    if (!(x.precioUnitario > 0)) throw invalido('COTIZACION_INVALIDA', `Indicá el precio de "${nombre}".`);
    if (!(x.descuento >= 0 && x.descuento < 100)) throw invalido('COTIZACION_INVALIDA', `El descuento de "${nombre}" tiene que estar entre 0 y 99 %.`);
    if (!(IVAS as readonly number[]).includes(x.iva)) throw invalido('COTIZACION_INVALIDA', `El IVA de "${nombre}" tiene que ser 0, 10,5, 21 o 27 %.`);
  }
  if (!Number.isInteger(c.plazoDias) || c.plazoDias < 0 || c.plazoDias > 365) throw invalido('COTIZACION_INVALIDA', 'El plazo de entrega va de 0 a 365 días.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.vigencia) || c.vigencia < hoyIso(ahora)) throw invalido('COTIZACION_INVALIDA', 'La vigencia de la oferta tiene que ser hoy o una fecha futura.');
  validarEnlaces(c.adjuntos, 'COTIZACION_INVALIDA');
}

export function validarAdjudicacion(p: PedidoCotizacion, cotis: Cotizacion[], asignacion: Record<string, string>, ahora = new Date()) {
  if (p.estado !== 'abierto') throw invalido('ADJUDICACION_INVALIDA', 'Este pedido ya está adjudicado.');
  if (!preciosVisibles(p, ahora)) throw invalido('ADJUDICACION_INVALIDA', 'Con sobre cerrado se adjudica después del cierre.');
  for (const item of p.items) {
    const prov = asignacion[item.id];
    if (!prov) throw invalido('ADJUDICACION_INVALIDA', `Elegí a quién adjudicar "${item.nombre}".`);
    const c = cotis.find((x) => x.proveedorId === prov);
    if (!c || !precioDe(c, item.id)) throw invalido('ADJUDICACION_INVALIDA', `Ese proveedor no cotizó "${item.nombre}".`);
  }
  if (Object.keys(asignacion).some((id) => !p.items.some((i) => i.id === id))) throw invalido('ADJUDICACION_INVALIDA', 'La adjudicación incluye un ítem que no está en el pedido.');
  if (adjudicadosDe(asignacion).length > ADJUDICADOS_MAX) throw invalido('ADJUDICACION_INVALIDA', `Podés repartir el pedido entre hasta ${ADJUDICADOS_MAX} proveedores.`);
}

// ── Pedidos y ofertas guardados antes de los ítems
/** Un pedido sin ítems (formato anterior) pasa a tener uno, con su cantidad y unidad. */
export function itemsDe(d: { items?: ItemPedido[]; titulo: string; cantidad?: number; unidad?: string }): ItemPedido[] {
  if (d.items?.length) return d.items;
  return [{ id: 'i1', nombre: d.titulo, descripcion: '', cantidad: d.cantidad ?? 1, unidad: d.unidad ?? 'unidad' }];
}
/** Una oferta sin ítems (formato anterior) cotiza el primer ítem al precio final, sin IVA discriminado. */
export function itemsCotizadosDe(d: { items?: ItemCotizado[]; precioUnitario?: number }, items: ItemPedido[]): ItemCotizado[] {
  if (d.items?.length) return d.items;
  return [{ itemId: items[0]?.id ?? 'i1', precioUnitario: d.precioUnitario ?? 0, descuento: 0, iva: 0 }];
}
