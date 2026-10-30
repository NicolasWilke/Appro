// Avisos por mail de pedidos nuevos, leyendo y escribiendo en Firestore.
//   npm run avisos                 avisa los pedidos nuevos (mail inmediato o cola del resumen diario) y manda las
//                                  alertas por hito: ofertas nuevas, cierre en 24 h, cierre, consultas respondidas,
//                                  adjudicación y pedidos de valor (ver server/alertas.ts)
//   npm run avisos -- --resumen    manda los resúmenes diarios pendientes (correrlo a las 8:00)
//
// El plan Spark de Firebase no tiene Cloud Functions, así que esto corre afuera:
// a mano, en tu compu, o programado (ver .github/workflows/avisos.yml, gratis con GitHub Actions).
// Mails: MAIL_PROVIDER=resend + RESEND_API_KEY + MAIL_FROM. Sin eso, los imprime en la terminal.
import { FieldValue } from 'firebase-admin/firestore';
import { aPedido, aPersona, type Estado } from '@/data/firestore/mapeo';
import { mailDePedido, mailResumenDiario, planDeAvisos } from '@/domain/notificaciones';
import type { Comprador, PedidoCotizacion, Proveedor } from '@/domain/types';
import { crearMailSender } from './mail/MailSender';
import { db } from './firebaseAdmin';
import { mandarAlertas } from './alertas';

const URL_PUBLICA = process.env.PUBLIC_URL ?? 'http://localhost:5173';
const mail = crearMailSender();

async function proveedoresConContacto(): Promise<Proveedor[]> {
  const [usuarios, estados] = await Promise.all([db.collection('users').where('rol', '==', 'proveedor').get(), db.collection('estado').get()]);
  const est = new Map(estados.docs.map((d) => [d.id, d.data() as Estado]));
  return Promise.all(usuarios.docs.map(async (d) => {
    const p = aPersona(d.id, d.data(), est.get(d.id)) as Proveedor;
    const c = (await db.doc(`users/${d.id}/privado/contacto`).get()).data();
    return { ...p, contacto: { email: c?.email ?? '', telefono: c?.telefono ?? '' } };
  }));
}

async function comprador(id: string): Promise<Comprador | null> {
  const d = await db.doc(`users/${id}`).get();
  return d.exists ? (aPersona(d.id, d.data()!) as Comprador) : null;
}

async function avisarNuevos() {
  const nuevos = await db.collection('pedidos').where('avisado', '==', false).get();
  if (nuevos.empty) { console.log('No hay pedidos nuevos.'); return; }
  const proveedores = (await proveedoresConContacto()).filter((p) => p.contacto.email);
  for (const d of nuevos.docs) {
    const pedido = aPedido(d.id, d.data());
    const c = await comprador(pedido.compradorId);
    if (!c) { await d.ref.update({ avisado: true }); continue; }
    const { inmediatos, diarios } = planDeAvisos(pedido, proveedores);
    let enviados = 0;
    for (const prov of inmediatos) {
      try {
        await mail.enviar({ para: { nombre: `${prov.nombre} ${prov.apellido}`, email: prov.contacto.email }, ...mailDePedido(pedido, c, prov, URL_PUBLICA) });
        await d.ref.collection('avisos').doc(prov.id).set({ via: 'mail', empresa: prov.empresa, enviado: FieldValue.serverTimestamp() });
        enviados++;
      } catch (e) {
        console.error(`No se pudo avisar a ${prov.empresa}:`, (e as Error).message);
      }
    }
    for (const prov of diarios) {
      await db.doc(`colaResumen/${prov.id}`).set({ pedidos: FieldValue.arrayUnion(pedido.id) }, { merge: true });
      await d.ref.collection('avisos').doc(prov.id).set({ via: 'resumen', empresa: prov.empresa });
    }
    // Desde acá las alertas por hito (server/alertas.ts) siguen este pedido hasta la adjudicación.
    await d.ref.update({ avisado: true, adjudicacionAvisada: false });
    console.log(`${pedido.id}: ${enviados} mails, ${diarios.length} en el resumen diario.`);
  }
}

async function mandarResumenes() {
  const cola = await db.collection('colaResumen').get();
  if (cola.empty) { console.log('No hay resúmenes pendientes.'); return; }
  const proveedores = new Map((await proveedoresConContacto()).map((p) => [p.id, p]));
  for (const d of cola.docs) {
    const prov = proveedores.get(d.id);
    const ids: string[] = d.data().pedidos ?? [];
    if (!prov?.contacto.email || prov.avisos !== 'diario' || !ids.length) { await d.ref.delete(); continue; }
    const items: { pedido: PedidoCotizacion; comprador: Comprador }[] = [];
    for (const id of ids) {
      const p = await db.doc(`pedidos/${id}`).get();
      if (!p.exists) continue;
      const pedido = aPedido(p.id, p.data()!);
      const c = await comprador(pedido.compradorId);
      if (c && pedido.estado === 'abierto') items.push({ pedido, comprador: c });
    }
    if (items.length) await mail.enviar({ para: { nombre: `${prov.nombre} ${prov.apellido}`, email: prov.contacto.email }, ...mailResumenDiario(items, prov, URL_PUBLICA) });
    await d.ref.delete();
    console.log(`Resumen a ${prov.empresa}: ${items.length} pedidos.`);
  }
}

if (process.argv.includes('--resumen')) await mandarResumenes();
else {
  await avisarNuevos();
  await mandarAlertas(mail, URL_PUBLICA);
}
