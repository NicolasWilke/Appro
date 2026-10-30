import { describe, expect, it } from 'vitest';
import { indicadoresBase } from '@/data/indicadores-base';
import { acumuladoAnio, acumuladoProyectado, actualizarMonto, ajustePonderado, atrasado, interanual, mensual, proyectar, proyectarSerie, sumarMeses, validarPunto, valorHora } from './indicadores';
import { variacionReal } from './indice';

const ind = (id: string) => indicadoresBase.find((i) => i.id === id)!;

describe('centro de referencias', () => {
  it('reproduce los ejemplos del documento para el IPC', () => {
    expect(interanual(ind('ipc'), '2026-09')).toBeCloseTo(33.4, 1);
    expect(acumuladoAnio(ind('ipc'), '2026-09')).toBeCloseTo(23.6, 1);
    expect(mensual(ind('ipc'), '2026-09')).toBeCloseTo(1.9, 1);
    expect(mensual(ind('ipc-ba'), '2026-09')).toBeCloseTo(1.8, 1);
  });
  it('el básico del vigilador subió 24,5 % contra un IPC de 23,6 %: mejora real de 0,7 %', () => {
    const nominal = acumuladoAnio(ind('vigilador-basico'), '2026-09')!;
    expect(nominal).toBeCloseTo(24.5, 1);
    expect(variacionReal(nominal, 23.6)).toBeCloseTo(0.7, 1);
  });
  it('valor hora = mensual ÷ 200', () => {
    expect(valorHora(1791600)).toBe(8958);
    expect(valorHora(null)).toBeNull();
  });
  it('proyección compuesta: base 1,9 % a 3 meses ≈ 5,8 %', () => {
    expect(acumuladoProyectado(1.9, 3)).toBeCloseTo(5.8, 1);
    expect(acumuladoProyectado(1.5, 12)).toBeCloseTo(19.6, 1);
    expect(proyectar(8958, 1.9, 3)).toBeCloseTo(9478, -1);
  });
  it('actualiza montos entre dos meses con dato', () => {
    expect(actualizarMonto(1000, ind('ipc'), '2025-09', '2026-09')).toBeCloseTo(1333.6, 0);
    expect(actualizarMonto(1000, ind('ipc'), '2025-10', '2026-09')).toBeNull();
  });
  it('cláusula ponderada: los pesos suman 100', () => {
    expect(ajustePonderado([{ peso: 60, variacion: 30 }, { peso: 25, variacion: 20 }, { peso: 15, variacion: 10 }])).toBeCloseTo(24.5);
    expect(() => ajustePonderado([{ peso: 60, variacion: 30 }])).toThrow(/100/);
  });
  it('valida datos nuevos: período, duplicado y salto raro', () => {
    expect(sumarMeses('2026-01', -1)).toBe('2025-12');
    expect(() => validarPunto(ind('ipc'), { periodo: '2026-13', valor: 1 })).toThrow(/período/);
    expect(() => validarPunto(ind('ipc'), { periodo: '2026-09', valor: 1 })).toThrow(/Ya hay/);
    expect(validarPunto(ind('ipc'), { periodo: '2026-10', valor: 12739.4 })).toBeNull();
    expect(validarPunto(ind('ipc'), { periodo: '2026-10', valor: 13500 })).toMatch(/aparta/);
    // Un aumento pactado se puede reemplazar por el dato publicado.
    expect(validarPunto(ind('limpieza-oficial'), { periodo: '2026-11', valor: 825406 })).toBeNull();
  });
});

describe('proyección con aumentos pactados', () => {
  it('usa lo firmado y después la tasa', () => {
    const p = proyectarSerie(ind('limpieza-oficial'), 2, 3);
    expect(p.map((x) => x.periodo)).toEqual(['2026-11', '2026-12', '2027-01']);
    expect(p[0]).toMatchObject({ valor: 825406, pactado: true });
    expect(p[2].valor).toBeCloseTo(866137 * 1.02);
    expect(atrasado({ actualizado: '2026-08-01' }, new Date('2026-10-30'))).toBe(true);
    expect(atrasado({ actualizado: '2026-10-10' }, new Date('2026-10-30'))).toBe(false);
  });
});
