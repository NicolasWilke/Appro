import { describe, expect, it } from 'vitest';
import { etiqueta, informeHtml, valorSimple } from './informeDatos';

const op = { marca: 'Proveo', ley: 'Ley 25.326' };

describe('mis datos en versión legible', () => {
  it('traduce valores al castellano', () => {
    expect(valorSimple(true)).toBe('Sí');
    expect(valorSimple('2026-11-07')).toBe('07/11/2026');
    expect(valorSimple('frio', 'rubro')).toBe('Logística refrigerada');
    expect(valorSimple('ros', 'region')).toBe('Rosario y Gran Rosario');
    expect(valorSimple('data:image/png;base64,AAA', 'logo')).toBe('Imagen cargada');
    expect(valorSimple(null)).toContain('—');
  });

  it('pone nombres legibles a los campos, también a los que no conoce', () => {
    expect(etiqueta('contactoNombre')).toBe('Nombre de contacto');
    expect(etiqueta('campoNuevoRaro')).toBe('Campo nuevo raro');
  });

  it('no pierde ningún dato del .json y escapa el HTML', () => {
    const html = informeHtml(
      {
        exportado: '2026-11-07T17:00:00.000Z',
        perfil: { empresa: 'ACME <SA>', rubros: ['packaging', 'cargas'] },
        solicitudesDeContacto: [{ motivo: 'Cotizar film', estado: 'pendiente' }, { motivo: 'Otra', estado: 'aceptada' }],
        proveedoresFavoritos: [],
      },
      op,
    );
    expect(html).toContain('ACME &lt;SA&gt;');
    expect(html).not.toContain('<SA>');
    expect(html).toContain('Packaging flexible, Transporte de cargas');
    expect(html).toContain('Solicitudes de contacto <small>(2)</small>');
    expect(html).toContain('Cotizar film');
    expect(html).toContain('2 de 2');
    expect(html).toContain('Ninguno');
    expect(html).toContain('Ley 25.326');
  });
});
