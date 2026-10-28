import { describe, expect, it } from 'vitest';
import { validarResena, validarValor } from './resenas';

const ok = { entrega: 5, calidad: 4, facturacion: 3, texto: 'Cumplieron con todo lo pactado en tiempo.' };

describe('validarResena', () => {
  it('acepta puntajes de 1 a 5 y un comentario razonable', () => expect(() => validarResena(ok)).not.toThrow());
  it('rechaza puntajes fuera de rango o con decimales', () => {
    expect(() => validarResena({ ...ok, entrega: 0 })).toThrow();
    expect(() => validarResena({ ...ok, calidad: 6 })).toThrow();
    expect(() => validarResena({ ...ok, facturacion: 3.5 })).toThrow();
  });
  it('rechaza comentarios muy cortos o muy largos', () => {
    expect(() => validarResena({ ...ok, texto: 'Bien' })).toThrow();
    expect(() => validarResena({ ...ok, texto: 'x'.repeat(501) })).toThrow();
  });
});

describe('validarValor', () => {
  it('acepta $0 (a definir) y rangos ordenados', () => {
    expect(() => validarValor({ min: 0, mediana: 0, max: 0 })).not.toThrow();
    expect(() => validarValor({ min: 10, mediana: 12, max: 15 })).not.toThrow();
  });
  it('rechaza rangos desordenados o negativos', () => {
    expect(() => validarValor({ min: 15, mediana: 12, max: 20 })).toThrow();
    expect(() => validarValor({ min: -1, mediana: 0, max: 0 })).toThrow();
  });
});
