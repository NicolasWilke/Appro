import { describe, expect, it } from 'vitest';
import { inflacion, mesesIso, valores } from '@/data/mock/seed';
import type { ValorReferencia } from './types';
import { ajustar, estimarTotal, factorInflacion, posicionEnRango, tieneValor, valorDelRubro, valoresPara } from './valores';

const base: ValorReferencia = { id: 'x', rubro: 'mantenimiento', concepto: 'x', tipo: 'hora', unidad: 'hora', region: 'cba', principal: true, min: 100, mediana: 120, max: 150 };

describe('valores de referencia', () => {
  it('un valor en 0 queda a definir', () => {
    expect(tieneValor({ max: 0 })).toBe(false);
    expect(tieneValor({ max: 10 })).toBe(true);
  });
  it('no ajusta sin fecha ni en el último mes', () => {
    expect(factorInflacion(undefined, mesesIso, inflacion)).toBe(1);
    expect(factorInflacion(mesesIso[mesesIso.length - 1], mesesIso, inflacion)).toBe(1);
  });
  it('ajusta un valor de 3 meses atrás por la inflación acumulada', () => {
    const f = factorInflacion(mesesIso[mesesIso.length - 4], mesesIso, inflacion);
    expect(f).toBeCloseTo(inflacion.slice(-3).reduce((a, v) => a * (1 + v / 100), 1), 10);
    expect(ajustar(base, 1.1).mediana).toBeCloseTo(132, 6);
  });
  it('filtra por región sumando los valores nacionales', () => {
    const lista = [...valores, base];
    expect(valoresPara(lista, { region: 'cba', rubro: 'mantenimiento' }).some((v) => v.id === 'x')).toBe(true);
    expect(valoresPara(lista, { region: 'ros', rubro: 'mantenimiento' }).some((v) => v.id === 'x')).toBe(false);
  });
  it('elige el valor principal del rubro, primero el de la región', () => {
    expect(valorDelRubro([...valores, base], 'mantenimiento', 'cba')?.id).toBe('x');
    expect(valorDelRubro(valores, 'mantenimiento', 'noa')?.region).toBe('nacional');
  });
  it('estima un total y no se rompe con valores en 0', () => {
    expect(estimarTotal(base, 10)).toEqual({ min: 1000, mediana: 1200, max: 1500 });
    expect(estimarTotal({ min: 0, mediana: 0, max: 0 }, 10)).toEqual({ min: 0, mediana: 0, max: 0 });
    expect(posicionEnRango(5, { min: 0, max: 0 })).toBe(0.5);
  });
  it('el archivo de valores es coherente', () => {
    const ids = new Set<string>();
    for (const v of valores) {
      expect(v.min <= v.mediana && v.mediana <= v.max).toBe(true);
      expect(ids.has(v.id)).toBe(false);
      ids.add(v.id);
    }
  });
});
