import type { Auth } from 'firebase-admin/auth';
import { FieldValue, type Firestore, type Query } from 'firebase-admin/firestore';

/**
 * Bajas de cuentas (Ley 25.326, derecho de supresión). El usuario la pide desde Mi perfil y queda bajas/{uid};
 * el script de avisos la ejecuta en la próxima corrida (cada 30 minutos), antes de mandar mails.
 *
 * Titular de una cuenta (comprador o proveedor): se borran el perfil con todo lo que cuelga de él, plan, cupos,
 * solicitudes de contacto, pedidos propios (con sus ofertas y consultas), sus ofertas en pedidos que siguen
 * abiertos, reseñas que dejó o recibió, compras recientes y pedidos de valor, el equipo con sus miembros y el
 * usuario de ingreso. Las ofertas que dejó en pedidos ya cerrados quedan en el historial del comprador que las
 * recibió, sin perfil detrás (la política de privacidad lo avisa).
 * Miembro de un equipo: se borra solo su usuario y sale del equipo; la empresa sigue.
 */
export async function procesarBajas(db: Firestore, auth: Auth): Promise<number> {
  const pedidas = await db.collection('bajas').get();
  for (const baja of pedidas.docs) {
    const uid = baja.id;
    try {
      await borrarCuenta(db, auth, uid);
      await baja.ref.delete();
      console.log(`Baja hecha: ${uid}.`);
    } catch (e) {
      // Queda pedida: se reintenta en la próxima corrida.
      console.error(`No se pudo completar la baja de ${uid}:`, (e as Error).message);
    }
  }
  return pedidas.size;
}

async function borrarUsuario(auth: Auth, uid: string) {
  await auth.deleteUser(uid).catch((e: { code?: string }) => {
    if (e.code !== 'auth/user-not-found') throw e;
  });
}

async function borrarConsulta(db: Firestore, q: Query) {
  const snap = await q.get();
  await Promise.all(snap.docs.map((d) => db.recursiveDelete(d.ref)));
}

export async function borrarCuenta(db: Firestore, auth: Auth, uid: string) {
  const miembro = await db.doc(`miembros/${uid}`).get();
  if (miembro.exists) {
    const empresaId = miembro.data()!.empresaId as string;
    const equipo = db.doc(`equipos/${empresaId}`);
    await db.runTransaction(async (tx) => {
      const e = await tx.get(equipo);
      if (e.exists) tx.update(equipo, { miembros: ((e.data()!.miembros ?? []) as string[]).filter((x) => x !== uid) });
      tx.delete(miembro.ref);
    });
    await borrarUsuario(auth, uid);
    return;
  }

  const col = (n: string) => db.collection(n);
  // Ofertas propias en pedidos de otros que siguen abiertos: dejan de competir.
  const ofertas = await db.collectionGroup('cotizaciones').where('proveedorId', '==', uid).get();
  for (const o of ofertas.docs) {
    const pedido = await o.ref.parent.parent!.get();
    if (pedido.exists && pedido.data()!.estado === 'abierto') {
      const lote = db.batch();
      lote.delete(o.ref);
      lote.update(pedido.ref, { ofertas: FieldValue.increment(-1) });
      await lote.commit();
    }
  }
  await Promise.all([
    borrarConsulta(db, col('pedidos').where('compradorId', '==', uid)),
    borrarConsulta(db, col('solicitudes').where('compradorId', '==', uid)),
    borrarConsulta(db, col('solicitudes').where('proveedorId', '==', uid)),
    borrarConsulta(db, col('resenas').where('compradorId', '==', uid)),
    borrarConsulta(db, col('resenas').where('proveedorId', '==', uid)),
    borrarConsulta(db, col('antecedentes').where('proveedorId', '==', uid)),
    borrarConsulta(db, col('solicitudesValor').where('compradorId', '==', uid)),
    borrarConsulta(db, col('solicitudesValor').where('proveedorId', '==', uid)),
    borrarConsulta(db, col('invitaciones').where('empresaId', '==', uid)),
  ]);
  // El equipo de la empresa se va con ella.
  const miembros = await col('miembros').where('empresaId', '==', uid).get();
  for (const m of miembros.docs) {
    await m.ref.delete();
    await borrarUsuario(auth, m.id);
  }
  // Aceptaciones que este proveedor recibió de compradores.
  const aceptado = await db.collectionGroup('aceptados').get();
  await Promise.all(aceptado.docs.filter((d) => d.id === uid).map((d) => d.ref.delete()));
  // Favoritos que lo nombran, en las listas de los compradores.
  const favorito = await db.collectionGroup('favoritos').get();
  await Promise.all(favorito.docs.filter((d) => d.id === uid).map((d) => d.ref.delete()));

  for (const ruta of [`users/${uid}`, `estado/${uid}`, `usos/${uid}`, `solicitudesPlan/${uid}`, `equipos/${uid}`, `colaResumen/${uid}`, `listaEspera/${uid}`]) {
    await db.recursiveDelete(db.doc(ruta));
  }
  await borrarUsuario(auth, uid);
}
