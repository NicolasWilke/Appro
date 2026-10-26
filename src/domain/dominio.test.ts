import { describe, expect, it } from 'vitest';
import { formatearCuit, validarCuit } from './cuit';
import { acumulada, desvioVsIndice, leerDesvio, serieNominal, variacionReal } from './indice';
import { ReglaDeNegocioError, cupoRestante, estadoVisibleParaProveedor, validarRespuestaPedido, validarSolicitud } from './reglas';
import { esMailCorporativo } from './validaciones';
import { ARGENTINA } from '@/config/region';

describe('CUIT', () => {
  it('acepta un CUIT con dígito verificador correcto', () => {
    expect(validarCuit('30-71234567-1').valido).toBe(true);
    expect(validarCuit('20-12345678-6').valido).toBe(true);
  });
  it('rechaza dígito verificador, largo y prefijo inválidos', () => {
    expect(validarCuit('30-71234567-2').valido).toBe(false);
    expect(validarCuit('30-7123').valido).toBe(false);
    expect(validarCuit('99-71234567-1').valido).toBe(false);
  });
  it('formatea mientras se escribe', () => {
    expect(formatearCuit('30712345671')).toBe('30-71234567-1');
    expect(formatearCuit('3071')).toBe('30-71');
  });
});

describe('mail corporativo', () => {
  it('descarta dominios personales', () => {
    expect(esMailCorporativo('laura@alimentoslitoral.com.ar', ARGENTINA)).toBe(true);
    expect(esMailCorporativo('laura@gmail.com', ARGENTINA)).toBe(false);
  });
});

describe('índice de precios', () => {
  it('reconstruye la serie y la acumulada coincide', () => {
    const vars = [2, 2, 2];
    const serie = serieNominal({ actual: 1000, variaciones: vars });
    expect(serie).toHaveLength(4);
    expect(serie[3]).toBe(1000);
    expect((serie[3] / serie[0] - 1) * 100).toBeCloseTo(acumulada(vars), 6);
  });
  it('deflacta correctamente', () => {
    expect(variacionReal(10, 10)).toBeCloseTo(0, 6);
    expect(variacionReal(21, 10)).toBeCloseTo(10, 6);
  });
  it('clasifica el desvío de una cotización', () => {
    expect(leerDesvio(desvioVsIndice(94, 100))).toBe('debajo');
    expect(leerDesvio(desvioVsIndice(102, 100))).toBe('en-rango');
    expect(leerDesvio(desvioVsIndice(110, 100))).toBe('arriba');
  });
});

describe('reglas de contacto', () => {
  const base = { motivo: 'x'.repeat(80), plan: 'gratis' as const, uso: { solicitudesUsadas: 0, respuestasUsadas: 0 }, existentes: [], compradorRecibe: true };
  it('deja pasar una solicitud válida', () => expect(() => validarSolicitud(base)).not.toThrow());
  it('corta por cupo agotado', () => {
    expect(() => validarSolicitud({ ...base, uso: { solicitudesUsadas: 3, respuestasUsadas: 0 } })).toThrow(ReglaDeNegocioError);
  });
  it('corta por motivo largo y duplicado', () => {
    expect(() => validarSolicitud({ ...base, motivo: 'x'.repeat(301) })).toThrow(/300/);
    const existente = { id: 's', proveedorId: 'p', compradorId: 'c', motivo: '', estado: 'pendiente' as const, creada: '' };
    expect(() => validarSolicitud({ ...base, existentes: [existente] })).toThrow(/abierta/);
  });
  it('Pro tiene respuestas ilimitadas', () => {
    expect(cupoRestante('pro', { solicitudesUsadas: 20, respuestasUsadas: 99 })).toEqual({ solicitudes: 5, respuestas: null });
    expect(() => validarRespuestaPedido({ plan: 'pro', uso: { solicitudesUsadas: 0, respuestasUsadas: 99 }, pedidoAbierto: true, yaCotizo: false })).not.toThrow();
  });
  it('el rechazo es anónimo para el proveedor', () => {
    expect(estadoVisibleParaProveedor('rechazada')).toBe('cerrada');
  });
});
