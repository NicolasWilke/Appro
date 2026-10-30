// Alertas por hito, del plan de alertas del documento. Las corre `npm run avisos` después de los pedidos nuevos.
// Cada mail deja una marca en Firestore (con permisos de admin, sin pasar por las reglas) para no repetirse:
//   pedidos: recordado, ofertasAvisadas, cierreAvisado, adjudicacionAvisada
//   pedidos/{id}/consultas: avisada
//   solicitudesValor: avisada, respuestaAvisada
import { aCotizacion, aPedido, aPersona, fechaIso } from '@/data/firestore/mapeo';
import { cerro, mailCierre, mailConsultaRespondida, mailGanador, mailNoSeleccionado, mailNuevasOfertas, mailRecordatorio, mailRespuestaValor, mailSolicitudValor, ofertasSinAvisar, tocaRecordatorio } from '@/domain/alertas';
import { venceEn } from '@/domain/antecedentes';
import { destinatariosDePedido } from '@/domain/notificaciones';
import type { Comprador, Persona, Proveedor, SolicitudValor } from '@/domain/types';
import type { MailSender } from './mail/MailSender';
import { db } from './firebaseAdmin';

type Contacto = { email: string; telefono: string };
const contactos = new Map<string, Contacto>();
const personas = new Map<string, Persona | null>();

async function contacto(uid: string): Promise<Contacto> {
  if (!contactos.has(uid)) {
    const c = (await db.doc(`users/${uid}/privado/contacto`).get()).data();
    contactos.set(uid, { email: c?.email ?? '', telefono: c?.telefono ?? '' });
  }
  return contactos.get(uid)!;
}
async function persona(uid: string): Promise<Persona | null> {
  if (!personas.has(uid)) {
    const [d, e] = await Promise.all([db.doc(`users/${uid}`).get(), db.doc(`estado/${uid}`).get()]);
    personas.set(uid, d.exists ? aPersona(d.id, d.data()!, e.data() as never) : null);
  }
  return personas.get(uid)!;
}

export async function mandarAlertas(mail: MailSender, base: string, ahora = new Date()) {
  let enviados = 0;
  const enviar = async (uid: string, armado: { asunto: string; html: string; texto: string }) => {
    const [p, c] = await Promise.all([persona(uid), contacto(uid)]);
    if (!p || !c.email) return;
    try {
      await mail.enviar({ para: { nombre: `${p.nombre} ${p.apellido}`.trim(), email: c.email }, ...armado });
      enviados++;
    } catch (e) {
      console.error(`No se pudo mandar "${armado.asunto}" a ${p.empresa}:`, (e as Error).message);
    }
  };
  const proveedores = (await db.collection('users').where('rol', '==', 'proveedor').get()).docs.map((d) => aPersona(d.id, d.data()) as Proveedor);

  // Pedidos abiertos (incluye los que ya cerraron por fecha y esperan adjudicación).
  for (const d of (await db.collection('pedidos').where('estado', '==', 'abierto').get()).docs) {
    const datos = d.data();
    const p = { ...aPedido(d.id, datos), recordado: datos.recordado, cierreAvisado: datos.cierreAvisado, ofertasAvisadas: datos.ofertasAvisadas };
    const comprador = (await persona(p.compradorId)) as Comprador | null;
    if (!comprador) continue;
    const cotizaron = new Set((await d.ref.collection('cotizaciones').get()).docs.map((c) => c.id));
    const marcas: Record<string, unknown> = {};

    const nuevas = ofertasSinAvisar(p);
    if (nuevas > 0) { await enviar(p.compradorId, mailNuevasOfertas(p, comprador, nuevas, base)); marcas.ofertasAvisadas = p.ofertas; }

    if (tocaRecordatorio(p, ahora)) {
      for (const prov of destinatariosDePedido(p, proveedores).filter((x) => !cotizaron.has(x.id))) await enviar(prov.id, mailRecordatorio(p, prov, base));
      marcas.recordado = true;
    }
    if (cerro(p, ahora)) { await enviar(p.compradorId, mailCierre(p, comprador, base)); marcas.cierreAvisado = true; }

    for (const q of (await d.ref.collection('consultas').where('respuesta', '!=', null).get()).docs) {
      if (q.data().avisada) continue;
      const consulta = { id: q.id, pedidoId: p.id, pregunta: q.data().pregunta, respuesta: q.data().respuesta, creada: fechaIso(q.data().creada), respondida: fechaIso(q.data().respondida) };
      for (const prov of destinatariosDePedido(p, proveedores)) await enviar(prov.id, mailConsultaRespondida(p, consulta, prov, base));
      await q.ref.update({ avisada: true });
    }
    if (Object.keys(marcas).length) await d.ref.update(marcas);
  }

  // Adjudicados sin avisar: el aviso de pedido nuevo deja adjudicacionAvisada en false.
  for (const d of (await db.collection('pedidos').where('adjudicacionAvisada', '==', false).get()).docs) {
    const p = aPedido(d.id, d.data());
    if (p.estado !== 'adjudicado') continue;
    const comprador = (await persona(p.compradorId)) as Comprador | null;
    const ganadores = new Set(p.adjudicados ?? []);
    const cotis = (await d.ref.collection('cotizaciones').get()).docs.map((c) => aCotizacion(c.id, c.data(), p.items));
    if (comprador) {
      const datosComprador = await contacto(p.compradorId);
      for (const c of cotis) {
        const prov = (await persona(c.proveedorId)) as Proveedor | null;
        if (!prov) continue;
        await enviar(prov.id, ganadores.has(prov.id) ? mailGanador(p, prov, comprador, datosComprador, base) : mailNoSeleccionado(p, prov, base));
      }
    }
    await d.ref.update({ adjudicacionAvisada: true });
  }

  // Pedidos de valor: aviso al proveedor y, cuando responde, al comprador.
  for (const d of (await db.collection('solicitudesValor').where('estado', '==', 'pendiente').get()).docs) {
    if (d.data().avisada) continue;
    const s = { ...(d.data() as SolicitudValor), id: d.id, creada: fechaIso(d.data().creada) };
    const comprador = (await persona(s.compradorId)) as Comprador | null;
    const prov = await persona(s.proveedorId);
    if (comprador && prov) await enviar(prov.id, mailSolicitudValor(s, prov, comprador, venceEn(s.creada), base));
    await d.ref.update({ avisada: true, respuestaAvisada: false });
  }
  for (const d of (await db.collection('solicitudesValor').where('respuestaAvisada', '==', false).get()).docs) {
    const s = { ...(d.data() as SolicitudValor), id: d.id };
    if (s.estado === 'pendiente') continue;
    const comprador = await persona(s.compradorId);
    const prov = await persona(s.proveedorId);
    if (comprador) await enviar(comprador.id, mailRespuestaValor(s, comprador, prov?.empresa ?? 'El proveedor', base));
    await d.ref.update({ respuestaAvisada: true });
  }
  console.log(`Alertas: ${enviados} mails.`);
}
