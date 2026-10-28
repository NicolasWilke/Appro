// Tareas del equipo sin panel de administración todavía.
//   npm run admin -- plan <email> <gratis|pro|empresa>   activa un plan (después de cobrar)
//   npm run admin -- verificar <email>                    marca CUIT, mail corporativo y cargo como revisados
//   npm run admin -- pendientes                           lista los pedidos de plan sin atender
//   npm run admin -- hacer-admin <email>                  le da acceso a /admin/valores
import { FieldValue } from 'firebase-admin/firestore';
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
} else if (accion === 'pendientes') {
  const snap = await db.collection('solicitudesPlan').get();
  if (snap.empty) console.log('No hay pedidos de plan pendientes.');
  for (const d of snap.docs) {
    const u = await auth.getUser(d.id);
    console.log(`${u.email} pidió el plan ${d.data().plan} el ${d.data().pedido?.toDate().toLocaleString('es-AR')}`);
  }
} else {
  console.log('Uso:\n  npm run admin -- plan <email> <gratis|pro|empresa>\n  npm run admin -- verificar <email>\n  npm run admin -- pendientes\n  npm run admin -- hacer-admin <email>');
  process.exit(1);
}
