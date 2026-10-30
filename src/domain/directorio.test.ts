import { describe, expect, it } from 'vitest';
import { insignias, ordenar, promedioPonderado, reputacionVisible } from './directorio';
import type { Proveedor, Resena } from './types';

const ahora = new Date('2026-10-30T12:00:00Z');
const resena = (n: number, fecha = '2026-06-01'): Resena => ({ autor: 'A', empresa: 'E', texto: '', entrega: n, calidad: n, facturacion: n, fecha });
const prov = (id: string, cambios: Partial<Proveedor> = {}) => ({
  id, rol: 'proveedor', rubros: ['packaging'], desde: 2015, resenas: [], certificaciones: [],
  verificaciones: { idFiscal: true, mailCorporativo: true, cargoRevisado: true }, ...cambios,
}) as Proveedor;

describe('directorio', () => {
  it('las reseñas de más de 24 meses pesan la mitad', () => {
    expect(promedioPonderado({ resenas: [resena(5), resena(2, '2023-01-01')] }, ahora)).toBeCloseTo(4);
  });
  it('con menos de 3 reseñas no se muestra el promedio', () => {
    expect(reputacionVisible({ resenas: [resena(5), resena(5)] })).toBe(false);
    expect(reputacionVisible({ resenas: [resena(5), resena(5), resena(4)] })).toBe(true);
  });
  it('insignias: verificado, top con 5 reseñas y 4,5 o más, certificado', () => {
    expect(insignias(prov('a', { resenas: Array(5).fill(resena(5)), certificaciones: ['ISO 9001'] }), ahora)).toEqual(['verificado', 'top', 'certificado']);
    expect(insignias(prov('b', { resenas: Array(4).fill(resena(5)) }), ahora)).toEqual(['verificado']);
    expect(insignias(prov('c', { verificaciones: { idFiscal: true, mailCorporativo: false, cargoRevisado: true } }), ahora)).toEqual([]);
  });
  it('relevancia: rubro principal, después calificación', () => {
    const lista = [prov('x', { rubros: ['frio', 'packaging'], resenas: Array(3).fill(resena(5)) }), prov('y', { resenas: Array(3).fill(resena(3)) }), prov('z', { resenas: Array(3).fill(resena(4)) })];
    expect(ordenar(lista, 'relevancia', 'packaging', ahora).map((p) => p.id)).toEqual(['z', 'y', 'x']);
    expect(ordenar(lista, 'calificacion', undefined, ahora).map((p) => p.id)).toEqual(['x', 'z', 'y']);
  });
});
