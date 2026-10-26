import type { Comprador, MailSaliente, PedidoCotizacion, Proveedor } from './types';
import { rubro } from './catalogos';

export const HORA_RESUMEN = '8:00';

export type MailCompuesto = Pick<MailSaliente, 'asunto' | 'html' | 'texto'>;

/**
 * Quiénes reciben un pedido nuevo: proveedores con el rubro publicado,
 * identidad fiscal verificada y avisos no pausados.
 */
export function destinatariosDePedido(pedido: PedidoCotizacion, proveedores: Proveedor[]): Proveedor[] {
  return proveedores.filter((p) => p.rubros.includes(pedido.rubro) && p.verificaciones.idFiscal && p.avisos !== 'pausado');
}

export function planDeAvisos(pedido: PedidoCotizacion, proveedores: Proveedor[]) {
  const todos = destinatariosDePedido(pedido, proveedores);
  return {
    inmediatos: todos.filter((p) => p.avisos === 'inmediato'),
    diarios: todos.filter((p) => p.avisos === 'diario'),
  };
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const numero = (n: number) => new Intl.NumberFormat('es-AR').format(n);
const conPunto = (s: string) => (s.endsWith('.') ? s : `${s}.`);
const fecha = (iso: string) => iso.split('-').reverse().slice(0, 2).join('/');

/** Cómo se nombra al comprador en un mail: respeta el perfil semi-anónimo y nunca incluye mail ni teléfono. */
export function quienCompra(c: Comprador) {
  return c.semiAnonimo ? `${c.cargo} de ${c.empresa}` : `${c.nombre} ${c.apellido}, ${c.cargo} de ${c.empresa}`;
}

const marco = (cuerpo: string, pie: string) => `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0B2D5B;background:#ffffff;border:1px solid #D3DCE8;border-radius:10px;overflow:hidden">
  <div style="padding:14px 20px;border-bottom:3px solid #1E88E5;background:#0B2D5B;color:#ffffff"><span style="font-weight:800;font-size:20px;letter-spacing:0.06em">APPRO</span><span style="display:block;font-size:12px;color:#B9CBE3;margin-top:2px">Conectando empresas. Generando negocios.</span></div>
  <div style="padding:20px">${cuerpo}</div>
  <div style="padding:14px 20px;background:#E8EEF5;color:#4F6280;font-size:12px;line-height:1.5">${pie}</div>
</div>`;

function bloquePedido(p: PedidoCotizacion, c: Comprador, urlBase: string) {
  return `
  <p style="margin:0 0 4px;font-size:12px;color:#4F6280;font-family:monospace">${esc(p.id)} · ${esc(rubro(p.rubro).nombre.toUpperCase())}</p>
  <h2 style="margin:0 0 8px;font-size:20px;line-height:1.2">${esc(p.titulo)}</h2>
  <p style="margin:0 0 14px;color:#4F6280">Lo publicó ${esc(conPunto(quienCompra(c)))}</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">
    <tr><td style="padding:6px 0;color:#4F6280;width:140px">Cantidad</td><td style="padding:6px 0">${numero(p.cantidad)} ${esc(p.unidad)}</td></tr>
    <tr><td style="padding:6px 0;color:#4F6280">Entrega</td><td style="padding:6px 0">${esc(p.entrega)}</td></tr>
    <tr><td style="padding:6px 0;color:#4F6280">Pago</td><td style="padding:6px 0">${esc(p.pago)}</td></tr>
    <tr><td style="padding:6px 0;color:#4F6280">Zona</td><td style="padding:6px 0">${esc(p.zona)}</td></tr>
    <tr><td style="padding:6px 0;color:#4F6280">Cotizaciones hasta</td><td style="padding:6px 0;color:#8A5900;font-weight:bold">${fecha(p.cierre)}</td></tr>
  </table>
  <a href="${urlBase}/cotizaciones/${encodeURIComponent(p.id)}" style="display:inline-block;background:#1565C0;color:#ffffff;text-decoration:none;font-weight:bold;padding:11px 18px;border-radius:6px">Ver pedido y cotizar</a>`;
}

const pieComun = (p: Proveedor, urlBase: string) =>
  `Te llega porque ${esc(p.empresa)} publica en ${esc(p.rubros.map((r) => rubro(r).nombre).join(', '))}. ` +
  `Los datos de contacto del comprador se liberan solo si acepta tu solicitud o elige tu cotización. ` +
  `<a href="${urlBase}/panel" style="color:#1565C0">Recibir un resumen diario o pausar avisos</a>.`;

export function mailDePedido(p: PedidoCotizacion, c: Comprador, prov: Proveedor, urlBase: string): MailCompuesto {
  const asunto = `Nuevo pedido en ${rubro(p.rubro).nombre}: ${p.titulo}`;
  const html = marco(`<p style="margin:0 0 16px">Hola ${esc(prov.nombre)}, hay un pedido nuevo en tu rubro.</p>${bloquePedido(p, c, urlBase)}`, pieComun(prov, urlBase));
  const texto = [
    `Hola ${prov.nombre}, hay un pedido nuevo en tu rubro.`, '',
    `${p.id} · ${p.titulo}`, `Lo publicó ${conPunto(quienCompra(c))}`,
    `Cantidad: ${numero(p.cantidad)} ${p.unidad}`, `Entrega: ${p.entrega}`, `Pago: ${p.pago}`, `Zona: ${p.zona}`,
    `Cotizaciones hasta: ${fecha(p.cierre)}`, '', `Ver y cotizar: ${urlBase}/cotizaciones/${p.id}`, '',
    'Los datos de contacto del comprador se liberan solo si acepta tu solicitud o elige tu cotización.',
  ].join('\n');
  return { asunto, html, texto };
}

export function mailResumenDiario(items: { pedido: PedidoCotizacion; comprador: Comprador }[], prov: Proveedor, urlBase: string): MailCompuesto {
  const n = items.length;
  const asunto = `${n} ${n === 1 ? 'pedido nuevo' : 'pedidos nuevos'} en tus rubros`;
  const cuerpo = `<p style="margin:0 0 16px">Hola ${esc(prov.nombre)}, este es tu resumen de las ${HORA_RESUMEN}.</p>` +
    items.map(({ pedido, comprador }) => bloquePedido(pedido, comprador, urlBase)).join('<hr style="border:0;border-top:1px solid #D5DBE4;margin:22px 0">');
  const texto = [`Hola ${prov.nombre}, este es tu resumen de las ${HORA_RESUMEN}.`, '',
    ...items.map(({ pedido, comprador }) => `- ${pedido.id} · ${pedido.titulo} (${quienCompra(comprador)}), cierra ${fecha(pedido.cierre)}: ${urlBase}/cotizaciones/${pedido.id}`)].join('\n');
  return { asunto, html: marco(cuerpo, pieComun(prov, urlBase)), texto };
}
