import { describe, expect, it } from 'vitest';
import { antecedentesDe, antiguedad, cantidadComparable, rangoCantidad, validarRespuestaValor, validarSolicitudValor, venceEn } from './antecedentes';
import type { Antecedente, PedidoCotizacion } from './types';

const ahora = new Date('2026-10-30T15:00:00-03:00');
const a = (adjudicado: string): Antecedente => ({
  id: 'PC-1--i1', pedidoId: 'PC-1', itemId: 'i1', rubro: 'packaging', nombre: 'Film stretch', descripcion: '', cantidad: 1200, unidad: 'kg', zona: 'Rosario', sectorComprador: '', proveedorId: 'p1', adjudicado,
});

describe('compras recientes', () => {
  it('arma un antecedente por ítem adjudicado, sin precio', () => {
    const p = { id: 'PC-1', rubro: 'packaging', zona: 'Rosario', items: [{ id: 'i1', nombre: 'Film', descripcion: '', cantidad: 10, unidad: 'kg' }, { id: 'i2', nombre: 'Cinta', descripcion: '', cantidad: 5, unidad: 'u' }] } as PedidoCotizacion;
    const lista = antecedentesDe(p, { i1: 'p1' }, 'Industria', ahora);
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ id: 'PC-1--i1', proveedorId: 'p1', adjudicado: '2026-10-30', sectorComprador: 'Industria' });
    expect(Object.keys(lista[0])).not.toContain('precioUnitario');
  });
  it('semáforo: vigente, por vencer en los últimos 15 días, vencida después de 90', () => {
    expect(antiguedad(a('2026-10-01'), ahora).estado).toBe('vigente');
    expect(antiguedad(a('2026-08-11'), ahora)).toEqual({ quedan: 10, estado: 'por-vencer' });
    expect(antiguedad(a('2026-07-01'), ahora).estado).toBe('vencida');
  });
  it('muestra la cantidad como rango y avisa si la pedida es muy distinta', () => {
    expect(rangoCantidad(1200)).toEqual([1000, 4999]);
    expect(rangoCantidad(7)).toEqual([1, 9]);
    expect(rangoCantidad(60)).toEqual([50, 99]);
    expect(cantidadComparable(1200, 1500)).toBe(true);
    expect(cantidadComparable(1200, 3000)).toBe(false);
  });
  it('el plazo de respuesta son 3 días hábiles', () => {
    expect(venceEn('2026-10-30')).toBe('2026-11-04'); // viernes → miércoles
    expect(venceEn('2026-10-27')).toBe('2026-10-30');
  });
  it('valida pedido y respuesta', () => {
    expect(() => validarSolicitudValor(a('2026-07-01'), 100, '', ahora)).toThrow(/90 días/);
    expect(() => validarSolicitudValor(a('2026-10-01'), 0, '', ahora)).toThrow(/cantidad/);
    expect(() => validarSolicitudValor(a('2026-10-01'), 100, '', ahora)).not.toThrow();
    expect(() => validarRespuestaValor(0, '2026-12-01', ahora)).toThrow();
    expect(() => validarRespuestaValor(100, '2026-10-01', ahora)).toThrow(/vigencia/);
    expect(() => validarRespuestaValor(100, '2026-12-01', ahora)).not.toThrow();
  });
});
