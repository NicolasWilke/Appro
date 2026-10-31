import { matriz, recibeOfertas, totales } from './rfq';
import type { Cotizacion, PedidoCotizacion } from './types';

/**
 * Exportación a CSV pensada para Excel en castellano: separador `;`, coma decimal y BOM,
 * así los números quedan como números y las tildes se ven bien al abrir con doble clic.
 */
export type Celda = string | number | null | undefined;

const num = (n: number) => (Math.round(n * 100) / 100).toString().replace('.', ',');
const fecha = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
};

function celda(v: Celda) {
  if (v == null) return '';
  const s = typeof v === 'number' ? num(v) : v;
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const aCsv = (filas: Celda[][]) => '﻿' + filas.map((f) => f.map(celda).join(';')).join('\r\n');

/** Cuadro comparativo: una fila por ítem, una columna de precio unitario y otra de subtotal neto por proveedor. */
export function matrizCsv(p: PedidoCotizacion, cotis: Cotizacion[], empresa: (proveedorId: string) => string) {
  const m = matriz(p, cotis);
  const asig = p.adjudicacion ?? {};
  const nombres = cotis.map((c) => empresa(c.proveedorId));
  const filas: Celda[][] = [
    [`Pedido ${p.id}`, p.titulo],
    ['Cierre', fecha(p.cierre)],
    ['Moneda', p.moneda === 'USD' ? 'Dólares (USD)' : 'Pesos (ARS)'],
    [],
    ['Ítem', 'Descripción', 'Cantidad', 'Unidad', ...nombres.flatMap((n) => [`${n} unitario neto`, `${n} subtotal neto`]), 'Menor precio', 'Adjudicado a'],
  ];
  for (const { item, celdas } of m.filas) {
    const mejores = celdas.flatMap((x, n) => (x?.mejor ? [nombres[n]] : []));
    filas.push([
      item.nombre, item.descripcion, item.cantidad, item.unidad,
      ...celdas.flatMap((x) => (x ? [x.unitarioNeto, x.neto] : [null, null])),
      mejores.join(', '), asig[item.id] ? empresa(asig[item.id]) : '',
    ]);
  }
  const pie = (titulo: string, valores: Celda[]) => ['', '', '', titulo, ...valores.flatMap((v) => [null, v])];
  filas.push(
    [],
    pie('Neto', m.totales.map((t) => t.neto)),
    pie('IVA', m.totales.map((t) => t.iva)),
    pie('Total con IVA', m.totales.map((t) => t.total)),
    ...(p.moneda === 'USD' ? [
      pie('Dólar oficial BNA vendedor', cotis.map((c) => c.tipoCambio?.valor ?? null)),
      pie('Total con IVA en pesos', m.totales.map((t) => { const c = cotis.find((x) => x.proveedorId === t.proveedorId); return c?.tipoCambio ? Math.round(t.total * c.tipoCambio.valor) : null; })),
    ] : []),
    pie('Plazo de entrega (días)', cotis.map((c) => c.plazoDias)),
    pie('Oferta válida hasta', cotis.map((c) => (c.vigencia ? fecha(c.vigencia) : ''))),
    pie('Pago', cotis.map((c) => c.pago)),
    pie('Aclaraciones', cotis.map((c) => c.nota)),
  );
  return aCsv(filas);
}

/** Historial de pedidos del comprador. `cotis` solo trae los pedidos adjudicados (los demás pueden tener precios cerrados). */
export function historialCsv(
  pedidos: PedidoCotizacion[],
  cotis: Record<string, Cotizacion[]>,
  empresa: (proveedorId: string) => string,
  rubro: (id: PedidoCotizacion['rubro']) => string,
  ahora = new Date(),
) {
  const filas: Celda[][] = [['Pedido', 'Título', 'Rubro', 'Ítems', 'Cierre', 'Privado', 'Ofertas', 'Estado', 'Adjudicado a', 'Moneda', 'Monto adjudicado con IVA']];
  for (const p of pedidos) {
    const asig = p.adjudicacion ?? {};
    const ofertas = cotis[p.id] ?? [];
    const monto = p.estado === 'adjudicado'
      ? Object.entries(asig).reduce((s, [itemId, prov]) => {
          const c = ofertas.find((x) => x.proveedorId === prov);
          return s + (c ? totales(p, c, [itemId]).total : 0);
        }, 0)
      : null;
    filas.push([
      p.id, p.titulo, rubro(p.rubro), p.items.length, fecha(p.cierre), p.privado ? 'Sí' : 'No', p.ofertas,
      p.estado === 'adjudicado' ? 'Adjudicado' : recibeOfertas(p, ahora) ? 'Abierto' : 'En evaluación', (p.adjudicados ?? []).map(empresa).join(', '), p.moneda === 'USD' ? 'USD' : 'ARS', monto,
    ]);
  }
  return aCsv(filas);
}

/** Nombre de archivo seguro: sin tildes ni símbolos. */
export const nombreArchivo = (base: string) =>
  base.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase() + '.csv';
