import { describe, expect, it } from 'vitest';
import { aCsv, historialCsv, matrizCsv, nombreArchivo } from './exportar';
import { cierreIso } from './rfq';
import type { Cotizacion, PedidoCotizacion } from './types';

const pedido = (cambios: Partial<PedidoCotizacion> = {}): PedidoCotizacion => ({
  id: 'PC-1', compradorId: 'comp', titulo: 'Insumos; seguridad', descripcion: '', rubro: 'seguridad',
  items: [
    { id: 'a', nombre: 'Cámara IP', descripcion: 'Domo "4MP"', cantidad: 10, unidad: 'unidad' },
    { id: 'b', nombre: 'Grabador NVR', descripcion: '', cantidad: 2, unidad: 'unidad' },
  ],
  cantidad: 10, unidad: 'unidad', entrega: '', pago: '30 días', zona: 'Rosario',
  cierre: '2026-11-05', cierraEn: cierreIso('2026-11-05'), privado: false, invitados: [], sobreCerrado: true,
  documentos: [], adjuntos: [], ofertas: 2, estado: 'abierto', ...cambios,
});
const oferta = (proveedorId: string, a: number, b: number): Cotizacion => ({
  id: proveedorId, pedidoId: 'PC-1', proveedorId, plazoDias: 10, vigencia: '2026-11-30', pago: '30 días', nota: '', adjuntos: [], creada: '2026-11-01',
  precioUnitario: a, items: [{ itemId: 'a', precioUnitario: a, descuento: 0, iva: 21 }, { itemId: 'b', precioUnitario: b, descuento: 0, iva: 21 }],
});
const empresa = (id: string) => ({ x: 'Equis SA', y: 'Ye SRL' })[id] ?? id;
const lineas = (csv: string) => csv.slice(1).split('\r\n');

describe('exportar a Excel', () => {
  it('usa punto y coma, coma decimal, BOM y escapa comillas', () => {
    const csv = aCsv([['a;b', 'dice "hola"', 1234.567, null]]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(lineas(csv)[0]).toBe('"a;b";"dice ""hola""";1234,57;');
  });
  it('arma la matriz con unitario y subtotal por proveedor, menor precio y adjudicado', () => {
    const p = pedido({ estado: 'adjudicado', adjudicacion: { a: 'x', b: 'y' }, adjudicados: ['x', 'y'] });
    const ls = lineas(matrizCsv(p, [oferta('x', 100.5, 900), oferta('y', 120, 500)], empresa));
    expect(ls[0]).toBe('Pedido PC-1;"Insumos; seguridad"');
    expect(ls[1]).toBe('Cierre;05/11/2026');
    expect(ls[3]).toBe('Ítem;Descripción;Cantidad;Unidad;Equis SA unitario neto;Equis SA subtotal neto;Ye SRL unitario neto;Ye SRL subtotal neto;Menor precio;Adjudicado a');
    expect(ls[4]).toBe('Cámara IP;"Domo ""4MP""";10;unidad;100,5;1005;120;1200;Equis SA;Equis SA');
    expect(ls[5]).toBe('Grabador NVR;;2;unidad;900;1800;500;1000;Ye SRL;Ye SRL');
    expect(ls.find((l) => l.includes('Total con IVA'))).toBe(';;;Total con IVA;;3394,05;;2662');
  });
  it('el historial suma solo lo adjudicado y deja vacío el monto de los abiertos', () => {
    const adj = pedido({ estado: 'adjudicado', adjudicacion: { a: 'x', b: 'y' }, adjudicados: ['x', 'y'] });
    const abierto = pedido({ id: 'PC-2', titulo: 'Otro', privado: true });
    const cerrado = pedido({ id: 'PC-3', titulo: 'Cerrado', cierre: '2026-10-20', cierraEn: cierreIso('2026-10-20') });
    const ls = lineas(historialCsv([adj, abierto, cerrado], { 'PC-1': [oferta('x', 100, 900), oferta('y', 120, 500)] }, empresa, () => 'Seguridad', new Date('2026-11-01T12:00:00-03:00')));
    expect(ls[1]).toBe('PC-1;"Insumos; seguridad";Seguridad;2;05/11/2026;No;2;Adjudicado;Equis SA, Ye SRL;2420');
    expect(ls[2]).toBe('PC-2;Otro;Seguridad;2;05/11/2026;Sí;2;Abierto;;');
    expect(ls[3]).toBe('PC-3;Cerrado;Seguridad;2;20/10/2026;No;2;En evaluación;;');
  });
  it('genera nombres de archivo sin tildes ni símbolos', () => {
    expect(nombreArchivo('Matriz PC-1 Cámaras y grabadores!')).toBe('matriz-pc-1-camaras-y-grabadores.csv');
  });
});
