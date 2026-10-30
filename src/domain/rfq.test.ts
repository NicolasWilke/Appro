import { describe, expect, it } from 'vitest';
import {
  adjudicadosDe, ahorro, cierreIso, cerrado, horaDeCierre, isoArgentina, itemsCotizadosDe, itemsDe, linea, matriz, preciosVisibles, recibeOfertas,
  sugerirAdjudicacion, totales, validarAdjudicacion, validarCotizacion, validarPedido, validarPregunta, validarRespuestaConsulta,
} from './rfq';
import type { Cotizacion, PedidoCotizacion } from './types';

const AHORA = new Date('2026-11-01T12:00:00-03:00');
const pedido = (cambios: Partial<PedidoCotizacion> = {}): PedidoCotizacion => ({
  id: 'PC-1', compradorId: 'comp', titulo: 'Insumos de seguridad', descripcion: '', rubro: 'seguridad',
  items: [
    { id: 'a', nombre: 'Cámara IP', descripcion: '', cantidad: 10, unidad: 'unidad' },
    { id: 'b', nombre: 'Grabador NVR', descripcion: '', cantidad: 2, unidad: 'unidad' },
  ],
  cantidad: 10, unidad: 'unidad', entrega: 'Rosario, 15 días', pago: '30 días', zona: 'Rosario',
  cierre: '2026-11-05', cierraEn: cierreIso('2026-11-05'), privado: false, invitados: [], sobreCerrado: true,
  documentos: [], adjuntos: [], ofertas: 0, estado: 'abierto', ...cambios,
});
const oferta = (proveedorId: string, a: number, b: number, plazoDias = 10, cambios: Partial<Cotizacion> = {}): Cotizacion => ({
  id: proveedorId, pedidoId: 'PC-1', proveedorId, plazoDias, vigencia: '2026-11-30', pago: '30 días', nota: '', adjuntos: [], creada: '2026-11-01',
  precioUnitario: a, items: [{ itemId: 'a', precioUnitario: a, descuento: 0, iva: 21 }, { itemId: 'b', precioUnitario: b, descuento: 0, iva: 21 }], ...cambios,
});

describe('cierre y sobre cerrado', () => {
  it('el cierre se guarda con la hora de Buenos Aires', () => {
    expect(cierreIso('2026-11-05')).toBe('2026-11-05T18:00:00-03:00');
    expect(cerrado(pedido(), new Date('2026-11-05T20:59:00Z'))).toBe(false);
    expect(cerrado(pedido(), new Date('2026-11-05T21:00:00Z'))).toBe(true);
  });
  it('con sobre cerrado el comprador no ve precios hasta el cierre; sin sobre cerrado, sí', () => {
    expect(preciosVisibles(pedido(), AHORA)).toBe(false);
    expect(preciosVisibles(pedido({ sobreCerrado: false }), AHORA)).toBe(true);
    expect(preciosVisibles(pedido(), new Date('2026-11-06T00:00:00-03:00'))).toBe(true);
  });
  it('después del cierre no se reciben ofertas', () => {
    expect(recibeOfertas(pedido(), AHORA)).toBe(true);
    expect(recibeOfertas(pedido(), new Date('2026-11-06T00:00:00-03:00'))).toBe(false);
    expect(recibeOfertas(pedido({ estado: 'adjudicado' }), AHORA)).toBe(false);
  });
});

describe('montos y comparación', () => {
  it('aplica descuento y después IVA', () => {
    const l = linea(pedido().items[0], { itemId: 'a', precioUnitario: 1000, descuento: 10, iva: 21 });
    expect(l.unitarioNeto).toBe(900);
    expect(l.neto).toBe(9000);
    expect(l.total).toBeCloseTo(10890);
  });
  it('marca el menor precio por ítem, el total más bajo y la entrega más rápida', () => {
    const m = matriz(pedido(), [oferta('x', 100, 900, 20), oferta('y', 120, 500, 5)]);
    expect(m.filas[0].celdas.map((c) => c?.mejor)).toEqual([true, false]);
    expect(m.filas[1].celdas.map((c) => c?.mejor)).toEqual([false, true]);
    // x: 1000 + 1800 = 2800 neto; y: 1200 + 1000 = 2200 neto
    expect(m.totalMasBajo).toEqual(['y']);
    expect(m.entregaMasRapida).toEqual(['y']);
  });
  it('con una sola oferta no hay etiquetas', () => {
    const m = matriz(pedido(), [oferta('x', 100, 900)]);
    expect(m.filas[0].celdas[0]?.mejor).toBe(false);
    expect(m.totalMasBajo).toEqual([]);
  });
  it('sugiere adjudicar todo al total más bajo o cada ítem al mejor precio', () => {
    const cotis = [oferta('x', 100, 900), oferta('y', 120, 500)];
    expect(sugerirAdjudicacion(pedido(), cotis, 'total')).toEqual({ a: 'y', b: 'y' });
    expect(sugerirAdjudicacion(pedido(), cotis, 'item')).toEqual({ a: 'x', b: 'y' });
  });
  it('calcula lo adjudicado y el ahorro contra la oferta más alta', () => {
    const p = pedido();
    const cotis = [oferta('x', 100, 900), oferta('y', 120, 500)];
    const a = ahorro(p, cotis, { a: 'x', b: 'y' });
    expect(a.adjudicado).toBeCloseTo((1000 + 1000) * 1.21);
    expect(a.alto).toBeCloseTo(totales(p, cotis[0]).total);
    expect(a.pct).toBeCloseTo((800 / 2800) * 100);
  });
  it('el principal es el proveedor con más ítems', () => {
    expect(adjudicadosDe({ a: 'x', b: 'y', c: 'y' })).toEqual(['y', 'x']);
  });
});

describe('validaciones', () => {
  it('un pedido necesita ítems, cierre futuro e invitados si es privado', () => {
    expect(() => validarPedido(pedido(), AHORA)).not.toThrow();
    expect(() => validarPedido(pedido({ items: [] }), AHORA)).toThrow(/al menos un ítem/);
    expect(() => validarPedido(pedido({ cierraEn: cierreIso('2026-10-30') }), AHORA)).toThrow(/futuro/);
    expect(() => validarPedido(pedido({ privado: true }), AHORA)).toThrow(/invitado/);
    expect(() => validarPedido(pedido({ adjuntos: [{ nombre: 'Plano', url: 'plano.pdf' }] }), AHORA)).toThrow(/https/);
  });
  it('una oferta cotiza todos los ítems, antes del cierre y solo si está invitado', () => {
    const p = pedido();
    expect(() => validarCotizacion(p, oferta('x', 100, 900), AHORA)).not.toThrow();
    expect(() => validarCotizacion(p, oferta('x', 100, 0), AHORA)).toThrow(/precio/);
    expect(() => validarCotizacion(p, { ...oferta('x', 100, 900), items: [oferta('x', 100, 900).items[0]] }, AHORA)).toThrow(/todos los ítems/);
    expect(() => validarCotizacion(p, oferta('x', 100, 900), new Date('2026-11-06T00:00:00-03:00'))).toThrow(/ya no recibe/);
    expect(() => validarCotizacion(pedido({ privado: true, invitados: ['y'] }), oferta('x', 100, 900), AHORA)).toThrow(/privado/);
    expect(() => validarCotizacion(p, oferta('x', 100, 900, 10, { vigencia: '2026-10-01' }), AHORA)).toThrow(/vigencia/);
  });
  it('se adjudica después del cierre si hay sobre cerrado, y cada ítem a quien lo cotizó', () => {
    const cotis = [oferta('x', 100, 900), oferta('y', 120, 500)];
    expect(() => validarAdjudicacion(pedido(), cotis, { a: 'x', b: 'y' }, AHORA)).toThrow(/después del cierre/);
    const despues = new Date('2026-11-06T00:00:00-03:00');
    expect(() => validarAdjudicacion(pedido(), cotis, { a: 'x', b: 'y' }, despues)).not.toThrow();
    expect(() => validarAdjudicacion(pedido(), cotis, { a: 'x' }, despues)).toThrow(/Grabador/);
    expect(() => validarAdjudicacion(pedido(), cotis, { a: 'x', b: 'z' }, despues)).toThrow(/no cotizó/);
  });
});

describe('formato anterior', () => {
  it('un pedido sin ítems pasa a tener uno y su oferta lo cotiza', () => {
    const items = itemsDe({ titulo: 'Film BOPP', cantidad: 1200, unidad: 'kg' });
    expect(items).toEqual([{ id: 'i1', nombre: 'Film BOPP', descripcion: '', cantidad: 1200, unidad: 'kg' }]);
    expect(itemsCotizadosDe({ precioUnitario: 6400 }, items)).toEqual([{ itemId: 'i1', precioUnitario: 6400, descuento: 0, iva: 0 }]);
  });
});

it('isoArgentina muestra la hora de cierre de Argentina sin importar la zona', () => {
  const iso = isoArgentina(new Date('2026-11-08T21:00:00Z'));
  expect(iso).toBe('2026-11-08T18:00:00-03:00');
  expect(horaDeCierre(iso)).toBe('18:00');
});

describe('consultas', () => {
  it('pregunta quien puede cotizar, con 10 a 500 caracteres, antes del cierre', () => {
    expect(() => validarPregunta(pedido(), 'p1', '¿Aceptan entregas parciales?', AHORA)).not.toThrow();
    expect(() => validarPregunta(pedido(), 'p1', 'Corta', AHORA)).toThrow(/entre 10 y 500/);
    expect(() => validarPregunta(pedido({ privado: true, invitados: ['p2'] }), 'p1', '¿Aceptan entregas parciales?', AHORA)).toThrow(/privado/);
    expect(() => validarPregunta(pedido(), 'p1', '¿Aceptan entregas parciales?', new Date('2027-01-01T00:00:00-03:00'))).toThrow(/cerró/);
  });
  it('la respuesta no puede estar vacía', () => {
    expect(() => validarRespuestaConsulta('   ')).toThrow();
    expect(() => validarRespuestaConsulta('Sí.')).not.toThrow();
  });
});
