// Tareas del equipo sin panel de administración todavía.
//   npm run admin -- plan <email> <gratis|pro|empresa>   activa un plan (después de cobrar)
//   npm run admin -- verificar <email>                    marca CUIT, mail corporativo y cargo como revisados
//   npm run admin -- pendientes                           lista los pedidos de plan sin atender
//   npm run admin -- hacer-admin <email>                  le da acceso a /admin/valores
//   npm run admin -- migrar-pedidos                       pasa los pedidos de un solo ítem al formato con ítems
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { auth, db } from './firebaseAdmin';

const [accion, email, plan] = process.argv.slice(2);
const uidDe = async (mail: string) => (await auth.getUserByEmail(mail)).uid;

if (accion === 'plan' && email && ['gratis', 'pro', 'empresa'].includes(plan ?? '')) {
  const uid = await uidDe(email);
  await db.doc(`estado/${uid}`).set({ plan, actualizado: FieldValue.serverTimestamp() }, { merge: true });
  await db.doc(`solicitudesPlan/${uid}`).delete();
  console.log(`Plan ${plan} activo para ${email}.`);
} else if (accion === 'verificar' && email) {
  const uid = await uidDe(email);
  await db.doc(`estado/${uid}`).set({ verificaciones: { idFiscal: true, mailCorporativo: true, cargoRevisado: true }, actualizado: FieldValue.serverTimestamp() }, { merge: true });
  console.log(`${email} verificado.`);
} else if (accion === 'hacer-admin' && email) {
  const uid = await uidDe(email);
  await db.doc(`admins/${uid}`).set({ email, desde: FieldValue.serverTimestamp() });
  console.log(`${email} ya puede editar los valores de referencia.`);
} else if (accion === 'migrar-pedidos') {
  // Los pedidos anteriores a la RFQ completa no tienen "privado": las reglas solo se los muestran a su comprador.
  const snap = await db.collection('pedidos').get();
  let n = 0;
  for (const d of snap.docs) {
    const p = d.data();
    if ('privado' in p) continue;
    const cotis = await d.ref.collection('cotizaciones').get();
    await d.ref.update({
      descripcion: p.descripcion ?? '',
      items: [{ id: 'i1', nombre: p.titulo, descripcion: '', cantidad: p.cantidad, unidad: p.unidad }],
      cierraEn: Timestamp.fromDate(new Date(`${p.cierre}T23:59:00-03:00`)),
      privado: false, invitados: [], sobreCerrado: false, documentos: [], adjuntos: [], ofertas: cotis.size,
      ...(p.adjudicadaA ? { adjudicados: [p.adjudicadaA], adjudicacion: { i1: p.adjudicadaA } } : {}),
    });
    n++;
  }
  console.log(n ? `${n} pedidos migrados.` : 'No había pedidos para migrar.');
} else if (accion === 'pendientes') {
  const snap = await db.collection('solicitudesPlan').get();
  if (snap.empty) console.log('No hay pedidos de plan pendientes.');
  for (const d of snap.docs) {
    const u = await auth.getUser(d.id);
    console.log(`${u.email} pidió el plan ${d.data().plan} el ${d.data().pedido?.toDate().toLocaleString('es-AR')}`);
  }
} else {
  console.log('Uso:\n  npm run admin -- plan <email> <gratis|pro|empresa>\n  npm run admin -- verificar <email>\n  npm run admin -- pendientes\n  npm run admin -- hacer-admin <email>\n  npm run admin -- migrar-pedidos');
  process.exit(1);
}
