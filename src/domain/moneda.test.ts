import { describe, expect, it } from 'vitest';
import { equivalente, leerDolar, monedaDe } from './moneda';

describe('moneda', () => {
  it('los pedidos sin moneda son en pesos', () => {
    expect(monedaDe({})).toBe('ARS');
    expect(monedaDe({ moneda: 'USD' })).toBe('USD');
  });
  it('convierte en las dos direcciones', () => {
    expect(equivalente(100, 'USD', { valor: 1000 })).toBe(100000);
    expect(equivalente(100000, 'ARS', { valor: 1000 })).toBe(100);
    expect(equivalente(100, 'USD', { valor: 0 })).toBe(0);
  });
  it('lee la respuesta de la fuente y descarta basura', () => {
    expect(leerDolar({ venta: 1045.5, fechaActualizacion: '2026-10-31T15:00:00.000Z' })).toEqual({ valor: 1045.5, fuente: 'Dólar oficial BNA, vendedor', fecha: '2026-10-31' });
    expect(leerDolar({ venta: 'x' })).toBeNull();
    expect(leerDolar(null)).toBeNull();
  });
});
