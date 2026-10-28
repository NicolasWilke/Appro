import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  addDoc, collection, collectionGroup, doc, getDoc, getDocs, query, serverTimestamp, setDoc, setLogLevel, updateDoc, where,
} from 'firebase/firestore';

setLogLevel('silent');
let env: RulesTestEnvironment;

const perfil = (rol: 'comprador' | 'proveedor') => ({
  rol, empresa: `Empresa ${rol}`, contactoNombre: 'Nombre Apellido', categoria: 'seguridad', sector: '', ubicacion: 'Rosario', cuit: '30-71234567-1', logoUrl: null,
});
const pedido = (compradorId: string) => ({
  compradorId, titulo: 'Vigilancia 24 h planta Rosario', rubro: 'seguridad', cantidad: 720, unidad: 'horas vigilador', entrega: 'Desde el 1/12',
  pago: '30 días fecha factura', zona: 'Rosario', cierre: '2026-11-30', estado: 'abierto', creado: serverTimestamp(), avisado: false,
});
const cotizacion = (pedidoId: string, proveedorId: string) => ({
  pedidoId, proveedorId, precioUnitario: 15500, plazoDias: 7, pago: '30 días fecha factura', nota: '', creada: serverTimestamp(),
});
const MOTIVO = 'Cubrimos vigilancia 24 h en Rosario con monitoreo propio y supervisión diaria.';

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
    await setDoc(doc(db, 'users', 'comp1'), perfil('comprador'));
    await setDoc(doc(db, 'users', 'comp2'), perfil('comprador'));
    await setDoc(doc(db, 'users', 'prov1'), perfil('proveedor'));
    await setDoc(doc(db, 'users', 'prov2'), perfil('proveedor'));
    await setDoc(doc(db, 'pedidos', 'PC-1'), { ...pedido('comp1'), creado: new Date() });
    await setDoc(doc(db, 'estado', 'prov1'), { plan: 'pro' });
    await setDoc(doc(db, 'valoresReferencia', 'v1'), { min: 0 });
  });
});

const como = (uid: string) => env.authenticatedContext(uid).firestore();

describe('solicitudes de contacto', () => {
  it('el proveedor pide contacto con motivo de 40 a 300 caracteres', async () => {
    const col = collection(como('prov1'), 'solicitudes');
    await assertSucceeds(addDoc(col, { proveedorId: 'prov1', compradorId: 'comp1', motivo: MOTIVO, estado: 'pendiente', creada: serverTimestamp() }));
    await assertFails(addDoc(col, { proveedorId: 'prov1', compradorId: 'comp1', motivo: 'Hola', estado: 'pendiente', creada: serverTimestamp() }));
  });
  it('nadie la crea a nombre de otro, ya aceptada o hacia otro proveedor', async () => {
    const col = collection(como('prov1'), 'solicitudes');
    await assertFails(addDoc(col, { proveedorId: 'prov2', compradorId: 'comp1', motivo: MOTIVO, estado: 'pendiente', creada: serverTimestamp() }));
    await assertFails(addDoc(col, { proveedorId: 'prov1', compradorId: 'comp1', motivo: MOTIVO, estado: 'aceptada', creada: serverTimestamp() }));
    await assertFails(addDoc(col, { proveedorId: 'prov1', compradorId: 'prov2', motivo: MOTIVO, estado: 'pendiente', creada: serverTimestamp() }));
    await assertFails(addDoc(collection(como('comp2'), 'solicitudes'), { proveedorId: 'comp2', compradorId: 'comp1', motivo: MOTIVO, estado: 'pendiente', creada: serverTimestamp() }));
  });
  it('solo el comprador responde y solo cambia el estado', async () => {
    const ref = await addDoc(collection(como('prov1'), 'solicitudes'), { proveedorId: 'prov1', compradorId: 'comp1', motivo: MOTIVO, estado: 'pendiente', creada: serverTimestamp() });
    await assertFails(updateDoc(doc(como('prov1'), 'solicitudes', ref.id), { estado: 'aceptada' }));
    await assertFails(updateDoc(doc(como('comp2'), 'solicitudes', ref.id), { estado: 'aceptada' }));
    await assertFails(updateDoc(doc(como('comp1'), 'solicitudes', ref.id), { motivo: 'cambiado por el comprador, que no corresponde hacerlo' }));
    await assertSucceeds(updateDoc(doc(como('comp1'), 'solicitudes', ref.id), { estado: 'aceptada' }));
  });
  it('cada uno lista solo las suyas', async () => {
    await addDoc(collection(como('prov1'), 'solicitudes'), { proveedorId: 'prov1', compradorId: 'comp1', motivo: MOTIVO, estado: 'pendiente', creada: serverTimestamp() });
    await assertSucceeds(getDocs(query(collection(como('prov1'), 'solicitudes'), where('proveedorId', '==', 'prov1'))));
    await assertSucceeds(getDocs(query(collection(como('comp1'), 'solicitudes'), where('compradorId', '==', 'comp1'))));
    await assertFails(getDocs(query(collection(como('prov2'), 'solicitudes'), where('compradorId', '==', 'comp1'))));
    await assertFails(getDocs(collection(como('prov1'), 'solicitudes')));
  });
});

describe('pedidos y cotizaciones', () => {
  it('solo un comprador publica, a su nombre y abierto', async () => {
    await assertSucceeds(setDoc(doc(como('comp1'), 'pedidos', 'PC-2'), pedido('comp1')));
    await assertFails(setDoc(doc(como('prov1'), 'pedidos', 'PC-3'), pedido('prov1')));
    await assertFails(setDoc(doc(como('comp1'), 'pedidos', 'PC-4'), pedido('comp2')));
    await assertFails(setDoc(doc(como('comp1'), 'pedidos', 'PC-5'), { ...pedido('comp1'), estado: 'adjudicado' }));
    await assertFails(setDoc(doc(como('comp1'), 'pedidos', 'PC-6'), { ...pedido('comp1'), avisado: true }));
  });
  it('los registrados ven los pedidos; sin sesión no', async () => {
    await assertSucceeds(getDoc(doc(como('prov2'), 'pedidos', 'PC-1')));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'pedidos', 'PC-1')));
  });
  it('un proveedor cotiza una vez y solo a su nombre', async () => {
    await assertSucceeds(setDoc(doc(como('prov1'), 'pedidos', 'PC-1', 'cotizaciones', 'prov1'), cotizacion('PC-1', 'prov1')));
    await assertFails(setDoc(doc(como('prov1'), 'pedidos', 'PC-1', 'cotizaciones', 'prov1'), { ...cotizacion('PC-1', 'prov1'), precioUnitario: 1 }));
    await assertFails(setDoc(doc(como('prov1'), 'pedidos', 'PC-1', 'cotizaciones', 'prov2'), cotizacion('PC-1', 'prov2')));
    await assertFails(setDoc(doc(como('comp2'), 'pedidos', 'PC-1', 'cotizaciones', 'comp2'), cotizacion('PC-1', 'comp2')));
  });
  it('un proveedor no ve el precio de otro; el comprador ve todos', async () => {
    await setDoc(doc(como('prov1'), 'pedidos', 'PC-1', 'cotizaciones', 'prov1'), cotizacion('PC-1', 'prov1'));
    await assertFails(getDoc(doc(como('prov2'), 'pedidos', 'PC-1', 'cotizaciones', 'prov1')));
    await assertFails(getDocs(collection(como('prov2'), 'pedidos', 'PC-1', 'cotizaciones')));
    await assertSucceeds(getDocs(collection(como('comp1'), 'pedidos', 'PC-1', 'cotizaciones')));
    await assertSucceeds(getDocs(query(collectionGroup(como('prov1'), 'cotizaciones'), where('proveedorId', '==', 'prov1'))));
  });
  it('el comprador adjudica solo a quien cotizó', async () => {
    await setDoc(doc(como('prov1'), 'pedidos', 'PC-1', 'cotizaciones', 'prov1'), cotizacion('PC-1', 'prov1'));
    await assertFails(updateDoc(doc(como('comp1'), 'pedidos', 'PC-1'), { estado: 'adjudicado', adjudicadaA: 'prov2' }));
    await assertFails(updateDoc(doc(como('comp2'), 'pedidos', 'PC-1'), { estado: 'adjudicado', adjudicadaA: 'prov1' }));
    await assertSucceeds(updateDoc(doc(como('comp1'), 'pedidos', 'PC-1'), { estado: 'adjudicado', adjudicadaA: 'prov1' }));
    await assertFails(setDoc(doc(como('prov2'), 'pedidos', 'PC-1', 'cotizaciones', 'prov2'), cotizacion('PC-1', 'prov2')));
  });
  it('los avisos los escribe solo el servidor y los lee el comprador', async () => {
    await assertFails(setDoc(doc(como('comp1'), 'pedidos', 'PC-1', 'avisos', 'prov1'), { via: 'mail' }));
    await assertSucceeds(getDocs(collection(como('comp1'), 'pedidos', 'PC-1', 'avisos')));
    await assertFails(getDocs(collection(como('prov1'), 'pedidos', 'PC-1', 'avisos')));
  });
});

describe('planes y referencias', () => {
  it('nadie se asigna un plan; el proveedor solo lo pide', async () => {
    await assertFails(setDoc(doc(como('prov1'), 'estado', 'prov1'), { plan: 'empresa' }));
    await assertSucceeds(getDoc(doc(como('prov2'), 'estado', 'prov1')));
    await assertSucceeds(setDoc(doc(como('prov1'), 'solicitudesPlan', 'prov1'), { plan: 'pro', pedido: serverTimestamp() }));
    await assertFails(setDoc(doc(como('comp1'), 'solicitudesPlan', 'comp1'), { plan: 'pro', pedido: serverTimestamp() }));
  });
  it('los valores de referencia se leen pero no se escriben desde la app', async () => {
    await assertSucceeds(getDoc(doc(como('comp1'), 'valoresReferencia', 'v1')));
    await assertFails(setDoc(doc(como('comp1'), 'valoresReferencia', 'v1'), { min: 1 }));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'valoresReferencia', 'v1')));
  });
  it('el logo puede ir como imagen chica dentro del perfil', async () => {
    const db = como('prov1');
    await assertSucceeds(updateDoc(doc(db, 'users', 'prov1'), { logoUrl: 'data:image/webp;base64,UklGRiIAAABXRUJQ' }));
    await assertFails(updateDoc(doc(db, 'users', 'prov1'), { logoUrl: 'data:image/svg+xml;base64,PHN2Zz4=' }));
    await assertFails(updateDoc(doc(db, 'users', 'prov1'), { logoUrl: 'data:image/png;base64,' + 'A'.repeat(200001) }));
  });
});
