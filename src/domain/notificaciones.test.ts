import { describe, expect, it } from 'vitest';
import { compradores, pedidos, proveedores } from '@/data/mock/seed';
import { destinatariosDePedido, mailDePedido, mailResumenDiario, planDeAvisos } from './notificaciones';

const laura = compradores[0];
const film = pedidos.find((p) => p.id === 'PC-2611')!;

describe('avisos de pedidos por rubro', () => {
  it('solo avisa a proveedores del rubro publicado', () => {
    const ids = destinatariosDePedido(film, proveedores).map((p) => p.id);
    expect(ids.sort()).toEqual(['gustavo-lopez', 'ramiro-ortiz']);
  });
  it('respeta la frecuencia y las pausas', () => {
    const frio = pedidos.find((p) => p.rubro === 'frio')!;
    const plan = planDeAvisos(frio, proveedores);
    expect(plan.inmediatos.map((p) => p.id)).toEqual(['valeria-mendez']);
    expect(plan.diarios.map((p) => p.id)).toEqual(['pablo-aguirre']);
    const pausado = proveedores.map((p) => (p.id === 'valeria-mendez' ? { ...p, avisos: 'pausado' as const } : p));
    expect(destinatariosDePedido(frio, pausado).map((p) => p.id)).toEqual(['pablo-aguirre']);
  });
  it('excluye proveedores sin identidad fiscal verificada', () => {
    const sinVerificar = proveedores.map((p) => (p.id === 'gustavo-lopez' ? { ...p, verificaciones: { ...p.verificaciones, idFiscal: false } } : p));
    expect(destinatariosDePedido(film, sinVerificar).map((p) => p.id)).toEqual(['ramiro-ortiz']);
  });
});

describe('contenido del mail', () => {
  const ramiro = proveedores.find((p) => p.id === 'ramiro-ortiz')!;
  it('no expone mail ni teléfono del comprador', () => {
    const m = mailDePedido(film, laura, ramiro, 'https://appro.test');
    for (const x of [m.html, m.texto]) {
      expect(x).not.toContain(laura.contacto.email);
      expect(x).not.toContain(laura.contacto.telefono);
    }
    expect(m.texto).toContain('Laura Giménez');
  });
  it('respeta el perfil semi-anónimo', () => {
    const semi = { ...laura, semiAnonimo: true };
    const m = mailDePedido(film, semi, ramiro, 'https://appro.test');
    expect(m.html).not.toContain('Giménez');
    expect(m.html).toContain('Jefa de Compras de Alimentos del Litoral');
  });
  it('escapa lo que escribe el comprador', () => {
    const m = mailDePedido({ ...film, titulo: '<script>x</script>' }, laura, ramiro, 'https://appro.test');
    expect(m.html).not.toContain('<script>');
  });
  it('arma un resumen con varios pedidos', () => {
    const m = mailResumenDiario([{ pedido: film, comprador: laura }, { pedido: pedidos[1], comprador: laura }], ramiro, 'https://appro.test');
    expect(m.asunto).toBe('2 pedidos nuevos en tus rubros');
  });
});
