import { regionDesdeUbicacion, separarNombre } from '@/domain/acceso';
import type {
  Comprador, Cotizacion, FrecuenciaAvisos, ItemPedido, Persona, PedidoCotizacion, PlanId, Proveedor, Resena, RubroId, SolicitudContacto, Verificaciones,
} from '@/domain/types';
import { cierreIso, isoArgentina, itemsCotizadosDe, itemsDe } from '@/domain/rfq';

/**
 * De documentos de Firestore a los tipos del dominio. Sin dependencias del SDK:
 * lo usan la app (SDK web) y los scripts del servidor (Admin SDK).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Datos = Record<string, any>;

export interface Estado { plan?: PlanId; verificaciones?: Partial<Verificaciones>; tasaRespuesta?: number; certificaciones?: string[] }

export const hoyIso = () => new Date().toISOString().slice(0, 10);
export const fechaIso = (v: unknown) => (v && typeof (v as { toDate: () => Date }).toDate === 'function' ? (v as { toDate: () => Date }).toDate().toISOString().slice(0, 10) : hoyIso());
export const ventanaAbierta = (c: Comprador) => !!c.ventanaHasta && c.ventanaHasta >= hoyIso();
export const inicioMes = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };

export function aPersona(id: string, d: Datos, e: Estado = {}): Persona {
  const { nombre, apellido } = separarNombre(d.contactoNombre ?? '');
  const region = d.region ?? regionDesdeUbicacion(d.ubicacion ?? '');
  const base = {
    id, nombre, apellido,
    cargo: d.rol === 'comprador' ? 'Responsable de compras' : 'Responsable comercial',
    empresa: d.empresa, idFiscal: d.cuit, ciudad: d.ubicacion, region,
    rubros: (d.rubros?.length ? d.rubros : [d.categoria]) as RubroId[],
    verificaciones: { idFiscal: true, mailCorporativo: false, cargoRevisado: false, ...e.verificaciones },
    // El contacto nunca viaja con el perfil: se lee aparte y lo filtran las reglas (useContacto).
    contacto: { email: '', telefono: '' },
    logo: d.logoUrl ?? null,
  };
  if (d.rol === 'comprador') {
    const c: Comprador = {
      ...base, rol: 'comprador', ventanaHasta: null, foco: d.sector ?? '', acepta: 'Pedidos de cotización', noAcepta: 'Llamadas en frío',
      tasaRespuesta: e.tasaRespuesta ?? 0, semiAnonimo: false, circulos: [],
    };
    return c;
  }
  const p: Proveedor = {
    ...base, rol: 'proveedor', plan: e.plan ?? 'gratis', desde: d.creado ? Number(fechaIso(d.creado).slice(0, 4)) : new Date().getFullYear(),
    empleados: '', certificaciones: e.certificaciones ?? [], catalogo: d.sector ? [d.sector] : [], cobertura: { [region]: 100 }, resenas: [],
    avisos: (d.avisos ?? 'inmediato') as FrecuenciaAvisos,
  };
  return p;
}


/** Acepta el formato anterior (un solo ítem, cierre por día, sin privacidad) y lo completa. */
export function aPedido(id: string, d: Datos): PedidoCotizacion {
  const items = itemsDe(d as { titulo: string });
  return {
    id, compradorId: d.compradorId, titulo: d.titulo, descripcion: d.descripcion ?? '', rubro: d.rubro, items,
    cantidad: items[0].cantidad, unidad: items[0].unidad, entrega: d.entrega, pago: d.pago, zona: d.zona ?? '',
    cierre: d.cierre, cierraEn: d.cierraEn?.toDate ? isoArgentina(d.cierraEn.toDate()) : cierreIso(d.cierre, '23:59'),
    privado: d.privado === true, invitados: d.invitados ?? [], sobreCerrado: d.sobreCerrado === true,
    documentos: d.documentos ?? [], adjuntos: d.adjuntos ?? [], moneda: d.moneda === 'USD' ? 'USD' : 'ARS', ofertas: d.ofertas ?? 0, estado: d.estado,
    ...(d.adjudicadaA ? { adjudicadaA: d.adjudicadaA, adjudicados: d.adjudicados ?? [d.adjudicadaA] } : {}),
    ...(d.adjudicacion ? { adjudicacion: d.adjudicacion } : d.adjudicadaA ? { adjudicacion: Object.fromEntries(items.map((i) => [i.id, d.adjudicadaA])) } : {}),
    ...(d.comentarioAdjudicacion ? { comentarioAdjudicacion: d.comentarioAdjudicacion } : {}),
  };
}

/** `itemsPedido` hace falta para traducir ofertas del formato anterior (sin ítems). */
export function aCotizacion(id: string, d: Datos, itemsPedido: ItemPedido[] = []): Cotizacion {
  return {
    id, pedidoId: d.pedidoId, proveedorId: d.proveedorId, items: itemsCotizadosDe(d, itemsPedido), precioUnitario: d.precioUnitario,
    plazoDias: d.plazoDias, vigencia: d.vigencia ?? '', pago: d.pago, nota: d.nota ?? '', adjuntos: d.adjuntos ?? [], creada: fechaIso(d.creada),
    ...(d.tipoCambio ? { tipoCambio: d.tipoCambio } : {}),
  };
}

export const aSolicitud = (id: string, d: Datos): SolicitudContacto => ({
  id, proveedorId: d.proveedorId, compradorId: d.compradorId, motivo: d.motivo, estado: d.estado, creada: fechaIso(d.creada),
});


export function aResena(id: string, d: Datos): Resena {
  return {
    pedidoId: d.pedidoId ?? id, proveedorId: d.proveedorId, autor: d.autor ?? '', empresa: d.empresa ?? '', texto: d.texto ?? '',
    entrega: d.entrega ?? 0, calidad: d.calidad ?? 0, facturacion: d.facturacion ?? 0, fecha: fechaIso(d.creada),
  };
}
