import { describe, expect, it } from 'vitest';
import { compradores, pedidos, proveedores } from '@/data/mock/seed';
import { cerro, mailCierre, mailConsultaRespondida, mailGanador, mailNoSeleccionado, mailNuevasOfertas, ofertasSinAvisar, tocaRecordatorio } from './alertas';
import type { PedidoCotizacion } from './types';

const laura = compradores[0];
const ramiro = proveedores.find((p) => p.id === 'ramiro-ortiz')!;
const base = pedidos.find((p) => p.id === 'PC-2611')!;
const conCierre = (iso: string, cambios: Partial<PedidoCotizacion> = {}) => ({ ...base, estado: 'abierto' as const, cierraEn: iso, ...cambios });
const ahora = new Date('2026-11-05T12:00:00-03:00');

describe('alertas por hito', () => {
  it('recuerda una vez, dentro de las 24 h previas al cierre', () => {
    expect(tocaRecordatorio(conCierre('2026-11-06T10:00:00-03:00'), ahora)).toBe(true);
    expect(tocaRecordatorio(conCierre('2026-11-07T10:00:00-03:00'), ahora)).toBe(false);
    expect(tocaRecordatorio({ ...conCierre('2026-11-06T10:00:00-03:00'), recordado: true }, ahora)).toBe(false);
    expect(tocaRecordatorio(conCierre('2026-11-05T10:00:00-03:00'), ahora)).toBe(false);
  });
  it('avisa el cierre una vez y cuenta solo ofertas nuevas', () => {
    expect(cerro(conCierre('2026-11-05T10:00:00-03:00'), ahora)).toBe(true);
    expect(cerro({ ...conCierre('2026-11-05T10:00:00-03:00'), cierreAvisado: true }, ahora)).toBe(false);
    expect(cerro(conCierre('2026-11-05T10:00:00-03:00', { estado: 'adjudicado' }), ahora)).toBe(false);
    expect(ofertasSinAvisar({ ...base, ofertas: 3, ofertasAvisadas: 1 })).toBe(2);
    expect(ofertasSinAvisar({ ...base, ofertas: 3 })).toBe(3);
  });
});

describe('contenido de las alertas', () => {
  it('con sobre cerrado, el aviso de oferta no da precios ni nombres', () => {
    const m = mailNuevasOfertas({ ...base, sobreCerrado: true, ofertas: 2 }, laura, 1, 'https://x');
    expect(m.texto).toMatch(/sobre cerrado/);
    expect(m.texto).not.toMatch(/\$/);
    expect(m.texto).not.toContain(ramiro.empresa);
  });
  it('la consulta respondida no dice quién preguntó', () => {
    const m = mailConsultaRespondida(base, { id: 'q', pedidoId: base.id, pregunta: '¿Entrega parcial?', respuesta: 'Sí', creada: '2026-11-01', respondida: '2026-11-02' }, ramiro, 'https://x');
    expect(m.texto).toContain('¿Entrega parcial?');
    expect(m.html).not.toContain(ramiro.empresa);
  });
  it('el ganador recibe sus ítems y el contacto; el resto, ni el ganador ni precios', () => {
    const p = { ...base, estado: 'adjudicado' as const, adjudicacion: Object.fromEntries(base.items.map((i) => [i.id, ramiro.id])) };
    const g = mailGanador(p, ramiro, laura, { email: 'compras@litoral.com', telefono: '' }, 'https://x');
    expect(g.texto).toContain('compras@litoral.com');
    expect(g.texto).toContain('todo el pedido');
    const n = mailNoSeleccionado(p, proveedores[1], 'https://x');
    expect(n.texto).not.toContain(ramiro.empresa);
    expect(n.texto).not.toMatch(/\$/);
  });
  it('el cierre sin ofertas sugiere republicar', () => {
    expect(mailCierre({ ...base, ofertas: 0 }, laura, 'https://x').texto).toMatch(/sin ofertas/);
  });
});
