import { describe, expect, it } from 'vitest';
import { coberturaDe, mesCupo, regionesVisibles } from './planes';

describe('regiones por plan', () => {
  it('Gratis y Pro muestran solo la región principal', () => {
    expect(regionesVisibles('gratis', 'ros', ['amba', 'cba'])).toEqual(['ros']);
    expect(regionesVisibles('pro', 'ros', ['amba'])).toEqual(['ros']);
  });
  it('Empresa suma regiones, sin repetir la principal', () => {
    expect(regionesVisibles('empresa', 'ros', ['amba', 'ros', 'cba'])).toEqual(['ros', 'amba', 'cba']);
    expect(coberturaDe(['ros', 'amba'])).toEqual({ ros: 100, amba: 100 });
  });
  it('el mes del cupo es el de UTC, como en las reglas', () => {
    expect(mesCupo(new Date('2026-11-30T23:30:00-03:00'))).toBe('2026-12');
    expect(mesCupo(new Date('2026-11-02T12:00:00Z'))).toBe('2026-11');
  });
});
