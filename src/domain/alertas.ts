import { esc, cierre, fecha, marco, quienCompra } from './notificaciones';
import type { Comprador, Consulta, PedidoCotizacion, Persona, Proveedor, SolicitudValor } from './types';
import type { MailCompuesto } from './notificaciones';

/**
 * Plan de alertas por mail del documento (grupos 1 a 3) y de compras recientes. Las manda el script de avisos
 * cada 30 minutos (GitHub Actions); cada mail marca su hito en Firestore para no repetirse.
 * Ningún mail muestra precios de otros proveedores ni quién preguntó en una consulta.
 */
export const HORAS_RECORDATORIO = 24;
const HORA = 3_600_000;

const ms = (p: PedidoCotizacion) => new Date(p.cierraEn).getTime();
/** 24 h antes del cierre, si todavía no se avisó. */
export const tocaRecordatorio = (p: PedidoCotizacion & { recordado?: boolean }, ahora = new Date()) =>
  p.estado === 'abierto' && !p.recordado && ms(p) > ahora.getTime() && ms(p) - ahora.getTime() <= HORAS_RECORDATORIO * HORA;
export const cerro = (p: PedidoCotizacion & { cierreAvisado?: boolean }, ahora = new Date()) =>
  p.estado === 'abierto' && !p.cierreAvisado && ms(p) <= ahora.getTime();
/** Ofertas nuevas desde el último aviso al comprador. */
export const ofertasSinAvisar = (p: PedidoCotizacion & { ofertasAvisadas?: number }) => Math.max(0, p.ofertas - (p.ofertasAvisadas ?? 0));

const boton = (url: string, texto: string) => `<a href="${url}" style="display:inline-block;background:#1565C0;color:#ffffff;text-decoration:none;font-weight:bold;padding:11px 18px;border-radius:6px">${esc(texto)}</a>`;
const titulo = (p: PedidoCotizacion) => `<p style="margin:0 0 4px;font-size:12px;color:#4F6280;font-family:monospace">${esc(p.id)}</p><h2 style="margin:0 0 12px;font-size:20px;line-height:1.2">${esc(p.titulo)}</h2>`;
const parrafo = (t: string) => `<p style="margin:0 0 14px">${t}</p>`;
const PIE = 'Recibís este mail por tu actividad en Proveo. Los precios de cada oferta solo los ve quien publicó el pedido.';
const url = (base: string, p: PedidoCotizacion) => `${base}/cotizaciones/${encodeURIComponent(p.id)}`;

function armar(asunto: string, partes: { html: string; texto: string }[]): MailCompuesto {
  return { asunto, html: marco(partes.map((x) => x.html).join(''), PIE), texto: partes.map((x) => x.texto).join('\n\n') };
}

// ── Grupo 1: proveedores
export function mailRecordatorio(p: PedidoCotizacion, prov: Persona, base: string) {
  return armar(`[Último aviso] Quedan pocas horas para cotizar: ${p.titulo}`, [
    { html: parrafo(`Hola ${esc(prov.nombre)}, el pedido cierra el <strong>${cierre(p)}</strong> y todavía no mandaste tu oferta.`) + titulo(p) + boton(url(base, p), 'Cargar mi oferta'), texto: `Hola ${prov.nombre}, el pedido ${p.id} · ${p.titulo} cierra el ${cierre(p)} y todavía no mandaste tu oferta.\n${url(base, p)}` },
  ]);
}

export function mailConsultaRespondida(p: PedidoCotizacion, c: Consulta, prov: Persona, base: string) {
  return armar(`[Aclaración] El comprador respondió una consulta sobre ${p.titulo}`, [
    { html: parrafo(`Hola ${esc(prov.nombre)}, hay una respuesta nueva en las consultas del pedido. La ven todos los proveedores.`) + titulo(p), texto: `Hola ${prov.nombre}, hay una respuesta nueva en las consultas del pedido ${p.id} · ${p.titulo}.` },
    { html: `<p style="margin:0 0 6px;color:#4F6280">Pregunta</p><blockquote style="margin:0 0 12px;padding:8px 12px;border-left:3px solid #D3DCE8">${esc(c.pregunta)}</blockquote><p style="margin:0 0 6px;color:#4F6280">Respuesta</p><blockquote style="margin:0 0 16px;padding:8px 12px;border-left:3px solid #1E88E5">${esc(c.respuesta ?? '')}</blockquote>` + boton(url(base, p), 'Ver el pedido'), texto: `Pregunta: ${c.pregunta}\nRespuesta: ${c.respuesta}\n${url(base, p)}` },
  ]);
}

// ── Grupo 2: comprador
export function mailNuevasOfertas(p: PedidoCotizacion, c: Comprador, nuevas: number, base: string) {
  const sobre = p.sobreCerrado ? ' Con sobre cerrado, los precios se abren al cierre.' : '';
  return armar(`[Nueva oferta] ${nuevas === 1 ? 'Un proveedor cotizó' : `${nuevas} proveedores cotizaron`} tu pedido: ${p.titulo}`, [
    { html: parrafo(`Hola ${esc(c.nombre)}, ${nuevas === 1 ? 'llegó una oferta nueva' : `llegaron ${nuevas} ofertas nuevas`}. Ya tenés ${p.ofertas} en total.${sobre}`) + titulo(p) + boton(url(base, p), 'Ver el pedido'), texto: `Hola ${c.nombre}, ${nuevas === 1 ? 'llegó una oferta nueva' : `llegaron ${nuevas} ofertas nuevas`} para ${p.id} · ${p.titulo}. Total: ${p.ofertas}.${sobre}\n${url(base, p)}` },
  ]);
}

export function mailCierre(p: PedidoCotizacion, c: Comprador, base: string) {
  const n = p.ofertas;
  const que = n === 0 ? 'Cerró sin ofertas: podés publicarlo de nuevo con más plazo o como privado.' : `Recibiste ${n} ${n === 1 ? 'oferta' : 'ofertas'}: el cuadro comparativo está listo para adjudicar.`;
  return armar(`[Plazo vencido] Tu pedido ${p.id} cerró${n ? ' y está listo para evaluar' : ''}`, [
    { html: parrafo(`Hola ${esc(c.nombre)}, ${que}`) + titulo(p) + boton(url(base, p), n ? 'Abrir el comparador' : 'Ver el pedido'), texto: `Hola ${c.nombre}, ${que}\n${p.id} · ${p.titulo}\n${url(base, p)}` },
  ]);
}

// ── Grupo 3: adjudicación
export function mailGanador(p: PedidoCotizacion, prov: Proveedor, c: Comprador, contacto: { email: string; telefono: string }, base: string) {
  const ganados = p.items.filter((i) => p.adjudicacion?.[i.id] === prov.id);
  const todo = ganados.length === p.items.length;
  const lista = ganados.map((i) => `${i.nombre} (${new Intl.NumberFormat('es-AR').format(i.cantidad)} ${i.unidad})`);
  const quien = `${c.nombre} ${c.apellido}, ${c.cargo} de ${c.empresa}`;
  return armar(`[¡Felicitaciones!] Tu oferta fue elegida: ${p.titulo}`, [
    {
      html: parrafo(`Hola ${esc(prov.nombre)}, ${esc(c.empresa)} te adjudicó ${todo ? 'todo el pedido' : `${ganados.length} de ${p.items.length} ítems`}.`) + titulo(p) +
        `<ul style="margin:0 0 14px;padding-left:18px">${lista.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` +
        parrafo(`Contacto: ${esc(quien)} · <a href="mailto:${esc(contacto.email)}">${esc(contacto.email)}</a>${contacto.telefono ? ` · ${esc(contacto.telefono)}` : ''}. Pronto te van a contactar para la orden de compra.`) + boton(url(base, p), 'Ver el pedido'),
      texto: `Hola ${prov.nombre}, ${c.empresa} te adjudicó ${todo ? 'todo el pedido' : `${ganados.length} de ${p.items.length} ítems`} de ${p.id} · ${p.titulo}:\n${lista.map((l) => `- ${l}`).join('\n')}\nContacto: ${quien} · ${contacto.email}${contacto.telefono ? ` · ${contacto.telefono}` : ''}\n${url(base, p)}`,
    },
  ]);
}

/** A quien cotizó y no ganó nada: sin nombrar al ganador ni dar precios. */
export function mailNoSeleccionado(p: PedidoCotizacion, prov: Persona, base: string) {
  return armar(`Actualización: el pedido ${p.id} finalizó`, [
    { html: parrafo(`Hola ${esc(prov.nombre)}, gracias por cotizar. El comprador cerró el pedido y lo asignó a otra propuesta.`) + titulo(p) + parrafo('Seguí atento a los pedidos de tus rubros: cada oferta suma a tu historial en la red.') + boton(`${base}/cotizaciones`, 'Ver pedidos abiertos'), texto: `Hola ${prov.nombre}, gracias por cotizar ${p.id} · ${p.titulo}. El comprador lo asignó a otra propuesta.\n${base}/cotizaciones` },
  ]);
}

// ── Compras recientes
export function mailSolicitudValor(s: SolicitudValor, prov: Persona, c: Comprador, vence: string, base: string) {
  return armar(`Te piden valor: ${s.nombre}`, [
    { html: parrafo(`Hola ${esc(prov.nombre)}, ${esc(quienCompra(c))} vio en Compras recientes algo que ganaste y te pide tu valor vigente para <strong>${new Intl.NumberFormat('es-AR').format(s.cantidad)} ${esc(s.unidad)}</strong> de ${esc(s.nombre)}.`) + (s.mensaje ? `<blockquote style="margin:0 0 14px;padding:8px 12px;border-left:3px solid #D3DCE8">${esc(s.mensaje)}</blockquote>` : '') + parrafo(`Tenés hasta el <strong>${fecha(vence)}</strong> para responder. Tu precio adjudicado no lo vio nadie.`) + boton(`${base}/panel`, 'Responder'), texto: `Hola ${prov.nombre}, ${quienCompra(c)} te pide tu valor vigente para ${s.cantidad} ${s.unidad} de ${s.nombre}.${s.mensaje ? `\n"${s.mensaje}"` : ''}\nRespondé hasta el ${fecha(vence)}: ${base}/panel` },
  ]);
}

export function mailRespuestaValor(s: SolicitudValor, c: Persona, empresaProveedor: string, base: string) {
  const respondio = s.estado === 'respondida';
  return armar(respondio ? `${empresaProveedor} te pasó su valor: ${s.nombre}` : `${empresaProveedor} no cotizó ${s.nombre}`, [
    {
      html: parrafo(`Hola ${esc(c.nombre)}, ${respondio ? `${esc(empresaProveedor)} respondió tu pedido de valor por ${esc(s.nombre)}.` : `${esc(empresaProveedor)} prefirió no informar un valor por ${esc(s.nombre)}. Podés armar un pedido de cotización.`}`) + boton(`${base}/compras-recientes`, 'Ver la respuesta'),
      texto: `Hola ${c.nombre}, ${respondio ? `${empresaProveedor} respondió tu pedido de valor por ${s.nombre}.` : `${empresaProveedor} no informó un valor por ${s.nombre}.`}\n${base}/compras-recientes`,
    },
  ]);
}
