import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, setLogLevel } from 'firebase/firestore';

setLogLevel('silent');

let env: RulesTestEnvironment;

const perfil = (rol: 'comprador' | 'proveedor', empresa: string) => ({
  rol, empresa, contactoNombre: 'Nombre Apellido', categoria: 'packaging', sector: 'Alimentos',
  ubicacion: 'Rosario, Santa Fe', cuit: '30-71234567-1', logoUrl: null,
});
const contacto = (email: string) => ({ email, telefono: '+54 9 341 555-0000' });

// Dos compradores y dos proveedores ya registrados.
const USUARIOS = {
  comp1: perfil('comprador', 'Alimentos del Litoral S.A.'),
  comp2: perfil('comprador', 'Retail Sur S.A.'),
  prov1: perfil('proveedor', 'Flexibles Mitre S.R.L.'),
  prov2: perfil('proveedor', 'Guardia Paraná S.A.'),
};

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-appro',
    firestore: { rules: readFileSync('firebase/firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(async () => { await env.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [uid, p] of Object.entries(USUARIOS)) {
      await setDoc(doc(db, 'users', uid), p);
      await setDoc(doc(db, 'users', uid, 'privado', 'contacto'), contacto(`${uid}@empresa.com.ar`));
    }
  });
});

const como = (uid: string) => env.authenticatedContext(uid).firestore();
const contactoDe = (db: ReturnType<typeof como>, uid: string) => getDoc(doc(db, 'users', uid, 'privado', 'contacto'));

const aceptar = (comprador: string, proveedor: string) =>
  setDoc(doc(como(comprador), 'users', comprador, 'aceptados', proveedor), { aceptado: serverTimestamp() });

describe('datos de contacto', () => {
  it('un proveedor NO ve el contacto de un comprador que no lo aceptó', async () => {
    await assertFails(contactoDe(como('prov1'), 'comp1'));
  });
  it('un proveedor ve el contacto del comprador después de que lo acepta', async () => {
    await assertSucceeds(aceptar('comp1', 'prov1'));
    await assertSucceeds(contactoDe(como('prov1'), 'comp1'));
    await assertFails(contactoDe(como('prov2'), 'comp1'));
  });
  it('si el comprador revoca la aceptación, el proveedor deja de verlo', async () => {
    await assertSucceeds(aceptar('comp1', 'prov1'));
    await assertSucceeds(deleteDoc(doc(como('comp1'), 'users', 'comp1', 'aceptados', 'prov1')));
    await assertFails(contactoDe(como('prov1'), 'comp1'));
  });
  it('un proveedor NO ve el contacto de otro proveedor', async () => {
    await assertFails(contactoDe(como('prov1'), 'prov2'));
  });
  it('un comprador ve el contacto de un proveedor', async () => {
    await assertSucceeds(contactoDe(como('comp1'), 'prov1'));
  });
  it('un comprador no ve el contacto de otro comprador', async () => {
    await assertFails(contactoDe(como('comp1'), 'comp2'));
  });
  it('cada uno ve el suyo', async () => {
    await assertSucceeds(contactoDe(como('prov1'), 'prov1'));
    await assertSucceeds(contactoDe(como('comp1'), 'comp1'));
  });
  it('sin sesión no se ve ningún contacto', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'users', 'comp1', 'privado', 'contacto')));
  });
  it('una cuenta sin perfil no ve contactos', async () => {
    await assertFails(contactoDe(como('intruso'), 'comp1'));
  });
  it('nadie escribe el contacto de otro', async () => {
    await assertFails(setDoc(doc(como('prov1'), 'users', 'comp1', 'privado', 'contacto'), contacto('robado@x.com')));
  });
  it('el dueño actualiza su contacto con datos válidos', async () => {
    await assertSucceeds(setDoc(doc(como('prov1'), 'users', 'prov1', 'privado', 'contacto'), contacto('nuevo@flexibles.com.ar')));
    await assertFails(setDoc(doc(como('prov1'), 'users', 'prov1', 'privado', 'contacto'), { email: 'no-es-mail', telefono: '' }));
    await assertFails(setDoc(doc(como('prov1'), 'users', 'prov1', 'privado', 'contacto'), { ...contacto('a@b.com'), extra: 1 }));
  });
  it('no se pueden crear otros documentos privados', async () => {
    await assertFails(setDoc(doc(como('prov1'), 'users', 'prov1', 'privado', 'otro'), contacto('a@b.com')));
  });
});

describe('aceptaciones', () => {
  it('un proveedor no puede aceptarse a sí mismo', async () => {
    await assertFails(setDoc(doc(como('prov1'), 'users', 'comp1', 'aceptados', 'prov1'), { aceptado: serverTimestamp() }));
  });
  it('un proveedor no puede crear aceptaciones en su propio documento', async () => {
    await assertFails(setDoc(doc(como('prov1'), 'users', 'prov1', 'aceptados', 'prov2'), { aceptado: serverTimestamp() }));
  });
  it('el comprador solo acepta proveedores y con fecha del servidor', async () => {
    await assertFails(aceptar('comp1', 'comp2'));
    await assertFails(setDoc(doc(como('comp1'), 'users', 'comp1', 'aceptados', 'prov1'), { aceptado: new Date(2020, 0, 1) }));
  });
  it('el proveedor ve si fue aceptado, pero no las aceptaciones de otros', async () => {
    await assertSucceeds(aceptar('comp1', 'prov1'));
    await assertSucceeds(aceptar('comp1', 'prov2'));
    await assertSucceeds(getDoc(doc(como('prov1'), 'users', 'comp1', 'aceptados', 'prov1')));
    await assertFails(getDoc(doc(como('prov1'), 'users', 'comp1', 'aceptados', 'prov2')));
  });
});

describe('perfil público', () => {
  it('los usuarios registrados ven los perfiles de la red', async () => {
    await assertSucceeds(getDoc(doc(como('prov1'), 'users', 'prov2')));
    await assertSucceeds(getDoc(doc(como('comp1'), 'users', 'prov1')));
  });
  it('sin sesión no se ve la red', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'users', 'prov1')));
  });
  it('alta: cada uno crea solo su perfil y con datos válidos', async () => {
    const db = como('nuevo');
    await assertFails(setDoc(doc(db, 'users', 'otro'), perfil('proveedor', 'Otra S.A.')));
    await assertFails(setDoc(doc(db, 'users', 'nuevo'), { ...perfil('proveedor', 'X S.A.'), rol: 'admin' }));
    await assertFails(setDoc(doc(db, 'users', 'nuevo'), { ...perfil('proveedor', 'X S.A.'), cuit: '123' }));
    await assertFails(setDoc(doc(db, 'users', 'nuevo'), { ...perfil('proveedor', 'X S.A.'), verificado: true }));
    await assertSucceeds(setDoc(doc(db, 'users', 'nuevo'), { ...perfil('proveedor', 'Nueva S.A.'), creado: serverTimestamp() }));
  });
  it('el dueño edita su perfil pero no cambia rol ni CUIT', async () => {
    const db = como('prov1');
    await assertSucceeds(updateDoc(doc(db, 'users', 'prov1'), { sector: 'Envases', logoUrl: 'https://x/logo.png' }));
    await assertFails(updateDoc(doc(db, 'users', 'prov1'), { rol: 'comprador' }));
    await assertFails(updateDoc(doc(db, 'users', 'prov1'), { cuit: '20-12345678-6' }));
  });
  it('nadie edita ni borra el perfil de otro', async () => {
    await assertFails(updateDoc(doc(como('prov2'), 'users', 'prov1'), { empresa: 'Hackeada' }));
    await assertFails(deleteDoc(doc(como('prov1'), 'users', 'prov1')));
  });
  it('colecciones sin reglas quedan cerradas', async () => {
    await assertFails(getDoc(doc(como('comp1'), 'otra', 'x')));
  });
});
