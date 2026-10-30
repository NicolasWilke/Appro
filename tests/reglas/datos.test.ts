import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  addDoc, collection, collectionGroup, deleteDoc, doc, getDoc, getDocs, increment, query, serverTimestamp, setDoc, setLogLevel, Timestamp, updateDoc, where, writeBatch,
} from 'firebase/firestore';

setLogLevel('silent');
let env: RulesTestEnvironment;

const perfil = (rol: 'comprador' | 'proveedor') => ({
  rol, empresa: `Empresa ${rol}`, contactoNombre: 'Nombre Apellido', categoria: 'seguridad', sector: '', ubicacion: 'Rosario', cuit: '30-71234567-1', logoUrl: null,
});
const enDias = (n: number) => Timestamp.fromDate(new Date(Date.now() + n * 86400000));
const ITEMS = [
  { id: 'i1', nombre: 'Vigilancia 24 h', descripcion: '', cantidad: 720, unidad: 'horas vigilador' },
  { id: 'i2', nombre: 'Monitoreo de alarmas', descripcion: 'Con respuesta en sitio', cantidad: 1, unidad: 'mes' },
];
const pedido = (compradorId: string, cambios: Record<string, unknown> = {}) => ({
  compradorId, titulo: 'Vigilancia 24 h planta Rosario', descripcion: '', rubro: 'seguridad', items: ITEMS, cantidad: 720, unidad: 'horas vigilador',
  entrega: 'Desde el 1/12', pago: '30 días fecha factura', zona: 'Rosario', cierre: '2026-11-30', cierraEn: enDias(7),
  privado: false, invitados: [], sobreCerrado: false, documentos: [], adjuntos: [], ofertas: 0, estado: 'abierto', creado: serverTimestamp(), avisado: false, ...cambios,
});
const cotizacion = (pedidoId: string, proveedorId: string, cambios: Record<string, unknown> = {}) => ({
  pedidoId, proveedorId, items: [{ itemId: 'i1', precioUnitario: 15500, descuento: 0, iva: 21 }, { itemId: 'i2', precioUnitario: 90000, descuento: 5, iva: 21 }],
  precioUnitario: 15500, plazoDias: 7, vigencia: '2026-12-15', pago: '30 días fecha factura', nota: '', adjuntos: [], creada: serverTimestamp(), ...cambios,
});
/** Como lo hace la app: la oferta y el contador del pedido en un mismo lote. */
const cotizar = (uid: string, pedidoId = 'PC-1', cambios: Record<string, unknown> = {}) => {
  const db = como(uid);
  const lote = writeBatch(db);
  lote.set(doc(db, 'pedidos', pedidoId, 'cotizaciones', uid), cotizacion(pedidoId, uid, cambios));
  lote.update(doc(db, 'pedidos', pedidoId), { ofertas: increment(1) });
  return lote.commit();
};
const sembrar = (ruta: string, datos: Record<string, unknown>) => env.withSecurityRulesDisabled(async (ctx) => { await setDoc(doc(ctx.firestore(), ruta), datos); });
const adjudicacion = (asignacion: Record<string, string>, adjudicados: string[], comentario = '') =>
  ({ estado: 'adjudicado', adjudicadaA: adjudicados[0], adjudicados, adjudicacion: asignacion, comentarioAdjudicacion: comentario });
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
    await setDoc(doc(db, 'users', 'prov3'), perfil('proveedor'));
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

describe('pedidos: publicación y lectura', () => {
  it('solo un comprador publica, a su nombre, abierto y con cierre futuro', async () => {
    await assertSucceeds(setDoc(doc(como('comp1'), 'pedidos', 'PC-2'), pedido('comp1')));
    await assertFails(setDoc(doc(como('prov1'), 'pedidos', 'PC-3'), pedido('prov1')));
    await assertFails(setDoc(doc(como('comp1'), 'pedidos', 'PC-4'), pedido('comp2')));
    await assertFails(setDoc(doc(como('comp1'), 'pedidos', 'PC-5'), pedido('comp1', { estado: 'adjudicado' })));
    await assertFails(setDoc(doc(como('comp1'), 'pedidos', 'PC-6'), pedido('comp1', { avisado: true })));
    await assertFails(setDoc(doc(como('comp1'), 'pedidos', 'PC-7'), pedido('comp1', { cierraEn: enDias(-1) })));
    await assertFails(setDoc(doc(como('comp1'), 'pedidos', 'PC-8'), pedido('comp1', { ofertas: 3 })));
    await assertFails(setDoc(doc(como('comp1'), 'pedidos', 'PC-9'), pedido('comp1', { items: [] })));
  });
  it('un pedido privado necesita invitados y uno público no los lleva', async () => {
    await assertSucceeds(setDoc(doc(como('comp1'), 'pedidos', 'PC-2'), pedido('comp1', { privado: true, invitados: ['prov1'] })));
    await assertFails(setDoc(doc(como('comp1'), 'pedidos', 'PC-3'), pedido('comp1', { privado: true, invitados: [] })));
    await assertFails(setDoc(doc(como('comp1'), 'pedidos', 'PC-4'), pedido('comp1', { invitados: ['prov1'] })));
  });
  it('los registrados ven los pedidos públicos; sin sesión no', async () => {
    await assertSucceeds(getDoc(doc(como('prov2'), 'pedidos', 'PC-1')));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'pedidos', 'PC-1')));
  });
  it('un privado lo ven el comprador y los invitados, nadie más', async () => {
    await sembrar('pedidos/PC-P', { ...pedido('comp1', { privado: true, invitados: ['prov1'] }), creado: new Date() });
    await assertSucceeds(getDoc(doc(como('comp1'), 'pedidos', 'PC-P')));
    await assertSucceeds(getDoc(doc(como('prov1'), 'pedidos', 'PC-P')));
    await assertFails(getDoc(doc(como('prov2'), 'pedidos', 'PC-P')));
    await assertFails(getDoc(doc(como('comp2'), 'pedidos', 'PC-P')));
  });
  it('las consultas de la app pasan las reglas; listar todo, no', async () => {
    await sembrar('pedidos/PC-P', { ...pedido('comp1', { privado: true, invitados: ['prov1'] }), creado: new Date() });
    const col = (uid: string) => collection(como(uid), 'pedidos');
    await assertSucceeds(getDocs(query(col('prov2'), where('privado', '==', false))));
    await assertSucceeds(getDocs(query(col('prov1'), where('invitados', 'array-contains', 'prov1'))));
    await assertSucceeds(getDocs(query(col('comp1'), where('compradorId', '==', 'comp1'))));
    await assertSucceeds(getDocs(query(col('prov2'), where('compradorId', '==', 'comp1'), where('privado', '==', false))));
    await assertSucceeds(getDocs(query(col('prov2'), where('estado', '==', 'abierto'), where('privado', '==', false))));
    await assertSucceeds(getDocs(query(col('prov1'), where('adjudicados', 'array-contains', 'prov1'))));
    await assertFails(getDocs(col('prov2')));
    await assertFails(getDocs(query(col('prov2'), where('invitados', 'array-contains', 'prov1'))));
  });
  it('un pedido del formato anterior lo ve solo su comprador hasta migrarlo (npm run admin -- migrar-pedidos)', async () => {
    const viejo = {
      compradorId: 'comp1', titulo: 'Pedido viejo de un ítem', rubro: 'seguridad', cantidad: 10, unidad: 'horas', entrega: 'Ya', pago: 'Contado',
      zona: '', cierre: '2099-01-01', estado: 'abierto', creado: new Date(), avisado: true,
    };
    await sembrar('pedidos/PC-V', viejo);
    await assertSucceeds(getDoc(doc(como('comp1'), 'pedidos', 'PC-V')));
    await assertFails(getDoc(doc(como('prov2'), 'pedidos', 'PC-V')));
    // Migrado: público, sin sobre cerrado y con un ítem; se cotiza como cualquier otro.
    await sembrar('pedidos/PC-V', { ...viejo, privado: false, invitados: [], adjudicados: [], sobreCerrado: false, ofertas: 0, cierraEn: enDias(30) });
    await assertSucceeds(getDoc(doc(como('prov2'), 'pedidos', 'PC-V')));
    await assertSucceeds(cotizar('prov2', 'PC-V', { items: [{ itemId: 'i1', precioUnitario: 100, descuento: 0, iva: 21 }] }));
  });
});

describe('ofertas', () => {
  it('un proveedor cotiza una vez, a su nombre, junto con el contador', async () => {
    await assertSucceeds(cotizar('prov1'));
    await assertFails(cotizar('prov1', 'PC-1', { precioUnitario: 1 }));
    await assertFails(setDoc(doc(como('prov2'), 'pedidos', 'PC-1', 'cotizaciones', 'prov2'), cotizacion('PC-1', 'prov2')));
    await assertFails(updateDoc(doc(como('prov2'), 'pedidos', 'PC-1'), { ofertas: increment(1) }));
    await assertFails(cotizar('comp2'));
    let ofertas: unknown;
    await env.withSecurityRulesDisabled(async (ctx) => { ofertas = (await getDoc(doc(ctx.firestore(), 'pedidos', 'PC-1'))).data()?.ofertas; });
    if (ofertas !== 1) throw new Error(`El contador quedó en ${ofertas}`);
  });
  it('nadie cotiza a nombre de otro ni cambia la cantidad de ítems', async () => {
    const db = como('prov1');
    const lote = writeBatch(db);
    lote.set(doc(db, 'pedidos', 'PC-1', 'cotizaciones', 'prov2'), cotizacion('PC-1', 'prov2'));
    lote.update(doc(db, 'pedidos', 'PC-1'), { ofertas: increment(1) });
    await assertFails(lote.commit());
    await assertFails(cotizar('prov1', 'PC-1', { items: [{ itemId: 'i1', precioUnitario: 15500, descuento: 0, iva: 21 }] }));
  });
  it('después del cierre no se cotiza', async () => {
    await sembrar('pedidos/PC-C', { ...pedido('comp1', { cierraEn: enDias(-1) }), creado: new Date() });
    await assertFails(cotizar('prov1', 'PC-C'));
  });
  it('en un privado cotizan solo los invitados', async () => {
    await sembrar('pedidos/PC-P', { ...pedido('comp1', { privado: true, invitados: ['prov1'] }), creado: new Date() });
    await assertSucceeds(cotizar('prov1', 'PC-P'));
    await assertFails(cotizar('prov2', 'PC-P'));
  });
  it('un proveedor nunca ve la oferta de otro', async () => {
    await cotizar('prov1');
    await assertFails(getDoc(doc(como('prov2'), 'pedidos', 'PC-1', 'cotizaciones', 'prov1')));
    await assertFails(getDocs(collection(como('prov2'), 'pedidos', 'PC-1', 'cotizaciones')));
    await assertSucceeds(getDocs(query(collectionGroup(como('prov1'), 'cotizaciones'), where('proveedorId', '==', 'prov1'))));
  });
  it('sin sobre cerrado el comprador ve las ofertas al llegar', async () => {
    await cotizar('prov1');
    await assertSucceeds(getDocs(collection(como('comp1'), 'pedidos', 'PC-1', 'cotizaciones')));
    await assertFails(getDocs(collection(como('comp2'), 'pedidos', 'PC-1', 'cotizaciones')));
  });
  it('con sobre cerrado el comprador no ve precios hasta el cierre; el proveedor ve la suya', async () => {
    await sembrar('pedidos/PC-S', { ...pedido('comp1', { sobreCerrado: true }), creado: new Date() });
    await cotizar('prov1', 'PC-S');
    await assertFails(getDocs(collection(como('comp1'), 'pedidos', 'PC-S', 'cotizaciones')));
    await assertFails(getDoc(doc(como('comp1'), 'pedidos', 'PC-S', 'cotizaciones', 'prov1')));
    await assertSucceeds(getDoc(doc(como('prov1'), 'pedidos', 'PC-S', 'cotizaciones', 'prov1')));
    await assertSucceeds(getDoc(doc(como('comp1'), 'pedidos', 'PC-S')));
    // Cerró: los precios se abren.
    await env.withSecurityRulesDisabled(async (ctx) => { await updateDoc(doc(ctx.firestore(), 'pedidos', 'PC-S'), { cierraEn: enDias(-1) }); });
    await assertSucceeds(getDocs(collection(como('comp1'), 'pedidos', 'PC-S', 'cotizaciones')));
  });
});

describe('adjudicación', () => {
  it('el comprador adjudica todo a quien cotizó', async () => {
    await cotizar('prov1');
    await assertFails(updateDoc(doc(como('comp1'), 'pedidos', 'PC-1'), adjudicacion({ i1: 'prov2', i2: 'prov2' }, ['prov2'])));
    await assertFails(updateDoc(doc(como('comp2'), 'pedidos', 'PC-1'), adjudicacion({ i1: 'prov1', i2: 'prov1' }, ['prov1'])));
    await assertSucceeds(updateDoc(doc(como('comp1'), 'pedidos', 'PC-1'), adjudicacion({ i1: 'prov1', i2: 'prov1' }, ['prov1'], 'Mejor precio total.')));
    await assertFails(cotizar('prov2'));
  });
  it('reparte ítems entre proveedores que cotizaron, con la lista coherente', async () => {
    await cotizar('prov1');
    await cotizar('prov2');
    const ref = doc(como('comp1'), 'pedidos', 'PC-1');
    await assertFails(updateDoc(ref, adjudicacion({ i1: 'prov1', i2: 'prov2' }, ['prov1'])));
    await assertFails(updateDoc(ref, { ...adjudicacion({ i1: 'prov1', i2: 'prov2' }, ['prov1', 'prov2']), adjudicadaA: 'prov2' }));
    await assertFails(updateDoc(ref, adjudicacion({ i1: 'prov1', i2: 'prov3' }, ['prov1', 'prov3'])));
    await assertSucceeds(updateDoc(ref, adjudicacion({ i1: 'prov1', i2: 'prov2' }, ['prov1', 'prov2'])));
  });
  it('con sobre cerrado se adjudica después del cierre', async () => {
    await sembrar('pedidos/PC-S', { ...pedido('comp1', { sobreCerrado: true }), creado: new Date() });
    await cotizar('prov1', 'PC-S');
    await assertFails(updateDoc(doc(como('comp1'), 'pedidos', 'PC-S'), adjudicacion({ i1: 'prov1', i2: 'prov1' }, ['prov1'])));
    await env.withSecurityRulesDisabled(async (ctx) => { await updateDoc(doc(ctx.firestore(), 'pedidos', 'PC-S'), { cierraEn: enDias(-1) }); });
    await assertSucceeds(updateDoc(doc(como('comp1'), 'pedidos', 'PC-S'), adjudicacion({ i1: 'prov1', i2: 'prov1' }, ['prov1'])));
  });
  it('quien ganó un privado lo sigue viendo', async () => {
    await sembrar('pedidos/PC-P', { ...pedido('comp1', { privado: true, invitados: ['prov1'] }), creado: new Date() });
    await cotizar('prov1', 'PC-P');
    await updateDoc(doc(como('comp1'), 'pedidos', 'PC-P'), adjudicacion({ i1: 'prov1', i2: 'prov1' }, ['prov1']));
    await assertSucceeds(getDoc(doc(como('prov1'), 'pedidos', 'PC-P')));
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
  it('los valores de referencia los lee cualquier registrado y no los escribe un usuario común', async () => {
    await assertSucceeds(getDoc(doc(como('comp1'), 'valoresReferencia', 'v1')));
    await assertFails(setDoc(doc(como('comp1'), 'valoresReferencia', 'v1'), valor('comp1')));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'valoresReferencia', 'v1')));
  });
  it('el logo puede ir como imagen chica dentro del perfil', async () => {
    const db = como('prov1');
    await assertSucceeds(updateDoc(doc(db, 'users', 'prov1'), { logoUrl: 'data:image/webp;base64,UklGRiIAAABXRUJQ' }));
    await assertFails(updateDoc(doc(db, 'users', 'prov1'), { logoUrl: 'data:image/svg+xml;base64,PHN2Zz4=' }));
    await assertFails(updateDoc(doc(db, 'users', 'prov1'), { logoUrl: 'data:image/png;base64,' + 'A'.repeat(200001) }));
  });
});

const valor = (uid: string, cambios: Record<string, unknown> = {}) => ({
  rubro: 'seguridad', concepto: 'Vigilador general', tipo: 'hora', unidad: 'hora', region: 'ros', principal: true,
  min: 4800, mediana: 5200, max: 5900, fecha: '2026-10', actualizado: serverTimestamp(), actualizadoPor: uid, ...cambios,
});

describe('administración de valores', () => {
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await setDoc(doc(ctx.firestore(), 'admins', 'comp2'), { nota: 'equipo' }); });
  });
  it('un administrador edita un valor con rango ordenado', async () => {
    await assertSucceeds(setDoc(doc(como('comp2'), 'valoresReferencia', 'v1'), valor('comp2')));
    await assertSucceeds(setDoc(doc(como('comp2'), 'valoresReferencia', 'v1'), valor('comp2', { min: 0, mediana: 0, max: 0 })));
  });
  it('rechaza rangos desordenados, negativos, firmas ajenas o campos de más', async () => {
    const ref = doc(como('comp2'), 'valoresReferencia', 'v1');
    await assertFails(setDoc(ref, valor('comp2', { min: 6000 })));
    await assertFails(setDoc(ref, valor('comp2', { min: -1 })));
    await assertFails(setDoc(ref, valor('comp1')));
    await assertFails(setDoc(ref, valor('comp2', { oculto: true })));
    await assertFails(setDoc(ref, valor('comp2', { fecha: 'octubre' })));
  });
  it('nadie se nombra administrador desde la app y solo uno lee su propia marca', async () => {
    await assertFails(setDoc(doc(como('prov1'), 'admins', 'prov1'), { nota: 'yo' }));
    await assertSucceeds(getDoc(doc(como('comp2'), 'admins', 'comp2')));
    await assertFails(getDoc(doc(como('prov1'), 'admins', 'comp2')));
  });
});

describe('reseñas', () => {
  const resena = (cambios: Record<string, unknown> = {}) => ({
    pedidoId: 'PC-1', proveedorId: 'prov1', compradorId: 'comp1', entrega: 5, calidad: 4, facturacion: 5,
    texto: 'Cumplieron todos los turnos y facturaron en término.', autor: 'Nombre Apellido', empresa: 'Empresa comprador', creada: serverTimestamp(), ...cambios,
  });
  const adjudicar = (asignacion: Record<string, string> = { i1: 'prov1', i2: 'prov1' }, adjudicados = ['prov1']) => env.withSecurityRulesDisabled(async (ctx) => {
    await updateDoc(doc(ctx.firestore(), 'pedidos', 'PC-1'), adjudicacion(asignacion, adjudicados));
  });

  it('el comprador califica al proveedor que ganó su pedido, una sola vez', async () => {
    await adjudicar();
    const ref = doc(como('comp1'), 'resenas', 'PC-1');
    await assertSucceeds(setDoc(ref, resena()));
    await assertFails(setDoc(ref, resena({ entrega: 1 })));
    await assertSucceeds(getDoc(doc(como('prov2'), 'resenas', 'PC-1')));
  });
  it('no se reseña un pedido abierto, ajeno, a otro proveedor ni con puntajes fuera de 1 a 5', async () => {
    await assertFails(setDoc(doc(como('comp1'), 'resenas', 'PC-1'), resena()));
    await adjudicar();
    await assertFails(setDoc(doc(como('comp2'), 'resenas', 'PC-1'), resena({ compradorId: 'comp2' })));
    await assertFails(setDoc(doc(como('comp1'), 'resenas', 'PC-1'), resena({ proveedorId: 'prov2' })));
    await assertFails(setDoc(doc(como('comp1'), 'resenas', 'PC-1'), resena({ calidad: 6 })));
    await assertFails(setDoc(doc(como('comp1'), 'resenas', 'PC-1'), resena({ texto: 'Bien' })));
    await assertFails(setDoc(doc(como('prov1'), 'resenas', 'PC-1'), resena({ compradorId: 'prov1' })));
  });
  it('con el pedido repartido, cada ganador recibe su reseña', async () => {
    await adjudicar({ i1: 'prov1', i2: 'prov2' }, ['prov1', 'prov2']);
    await assertSucceeds(setDoc(doc(como('comp1'), 'resenas', 'PC-1'), resena()));
    await assertSucceeds(setDoc(doc(como('comp1'), 'resenas', 'PC-1--prov2'), resena({ proveedorId: 'prov2' })));
    await assertFails(setDoc(doc(como('comp1'), 'resenas', 'PC-1--prov3'), resena({ proveedorId: 'prov3' })));
    await assertFails(setDoc(doc(como('comp1'), 'resenas', 'PC-1'), resena({ proveedorId: 'prov2' })));
  });
});

describe('consultas del pedido', () => {
  const pregunta = (cambios: Record<string, unknown> = {}) => ({ pregunta: '¿Aceptan entregas parciales por semana?', respuesta: null, respondida: null, creada: serverTimestamp(), ...cambios });
  it('pregunta un proveedor, sin autor, mientras el pedido recibe ofertas', async () => {
    await assertSucceeds(addDoc(collection(como('prov1'), 'pedidos', 'PC-1', 'consultas'), pregunta()));
    await assertFails(addDoc(collection(como('comp2'), 'pedidos', 'PC-1', 'consultas'), pregunta()));
    await assertFails(addDoc(collection(como('prov1'), 'pedidos', 'PC-1', 'consultas'), pregunta({ autor: 'prov1' })));
    await assertFails(addDoc(collection(como('prov1'), 'pedidos', 'PC-1', 'consultas'), pregunta({ pregunta: 'Corta' })));
    await assertFails(addDoc(collection(como('prov1'), 'pedidos', 'PC-1', 'consultas'), pregunta({ respuesta: 'Me respondo solo' })));
    await sembrar('pedidos/PC-C', { ...pedido('comp1', { cierraEn: enDias(-1) }), creado: new Date() });
    await assertFails(addDoc(collection(como('prov1'), 'pedidos', 'PC-C', 'consultas'), pregunta()));
  });
  it('en un privado solo preguntan y leen los invitados', async () => {
    await sembrar('pedidos/PC-P', { ...pedido('comp1', { privado: true, invitados: ['prov1'] }), creado: new Date() });
    await assertSucceeds(addDoc(collection(como('prov1'), 'pedidos', 'PC-P', 'consultas'), pregunta()));
    await assertFails(addDoc(collection(como('prov2'), 'pedidos', 'PC-P', 'consultas'), pregunta()));
    await assertSucceeds(getDocs(collection(como('comp1'), 'pedidos', 'PC-P', 'consultas')));
    await assertFails(getDocs(collection(como('prov2'), 'pedidos', 'PC-P', 'consultas')));
  });
  it('responde solo el comprador del pedido, una vez', async () => {
    const ref = await addDoc(collection(como('prov1'), 'pedidos', 'PC-1', 'consultas'), pregunta());
    const respuesta = { respuesta: 'Sí, hasta 3.000 kg por semana.', respondida: serverTimestamp() };
    await assertFails(updateDoc(doc(como('prov1'), 'pedidos', 'PC-1', 'consultas', ref.id), respuesta));
    await assertFails(updateDoc(doc(como('comp2'), 'pedidos', 'PC-1', 'consultas', ref.id), respuesta));
    await assertFails(updateDoc(doc(como('comp1'), 'pedidos', 'PC-1', 'consultas', ref.id), { ...respuesta, pregunta: 'Otra pregunta distinta' }));
    await assertSucceeds(updateDoc(doc(como('comp1'), 'pedidos', 'PC-1', 'consultas', ref.id), respuesta));
    await assertFails(updateDoc(doc(como('comp1'), 'pedidos', 'PC-1', 'consultas', ref.id), { respuesta: 'Cambio de idea', respondida: serverTimestamp() }));
    await assertSucceeds(getDocs(collection(como('prov2'), 'pedidos', 'PC-1', 'consultas')));
  });
});

describe('favoritos', () => {
  it('el comprador marca proveedores y solo él los ve', async () => {
    await assertSucceeds(setDoc(doc(como('comp1'), 'users', 'comp1', 'favoritos', 'prov1'), { desde: serverTimestamp() }));
    await assertFails(setDoc(doc(como('comp1'), 'users', 'comp1', 'favoritos', 'comp2'), { desde: serverTimestamp() }));
    await assertFails(setDoc(doc(como('comp2'), 'users', 'comp1', 'favoritos', 'prov2'), { desde: serverTimestamp() }));
    await assertFails(setDoc(doc(como('prov1'), 'users', 'prov1', 'favoritos', 'prov2'), { desde: serverTimestamp() }));
    await assertSucceeds(getDocs(collection(como('comp1'), 'users', 'comp1', 'favoritos')));
    await assertFails(getDocs(collection(como('prov1'), 'users', 'comp1', 'favoritos')));
    await assertSucceeds(deleteDoc(doc(como('comp1'), 'users', 'comp1', 'favoritos', 'prov1')));
  });
});

describe('compras recientes y pedidos de valor', () => {
  const antecedente = (itemId: string, proveedorId: string, cambios: Record<string, unknown> = {}) => {
    const i = ITEMS.find((x) => x.id === itemId)!;
    return { pedidoId: 'PC-1', itemId, rubro: 'seguridad', nombre: i.nombre, descripcion: i.descripcion, cantidad: i.cantidad, unidad: i.unidad, zona: 'Rosario', sectorComprador: 'Industria', proveedorId, adjudicado: serverTimestamp(), ...cambios };
  };
  /** Como la app: la adjudicación y sus antecedentes en un mismo lote. */
  const adjudicarYListar = (antecedentes: [string, Record<string, unknown>][], asignacion = { i1: 'prov1', i2: 'prov1' }) => {
    const db = como('comp1');
    const lote = writeBatch(db);
    lote.update(doc(db, 'pedidos', 'PC-1'), adjudicacion(asignacion, [...new Set(Object.values(asignacion))]));
    for (const [id, d] of antecedentes) lote.set(doc(db, 'antecedentes', id), d);
    return lote.commit();
  };
  const solicitud = (cambios: Record<string, unknown> = {}) => ({
    antecedenteId: 'PC-1--i1', nombre: 'Vigilancia 24 h', unidad: 'horas vigilador', compradorId: 'comp2', proveedorId: 'prov1', cantidad: 600, mensaje: '',
    estado: 'pendiente', creada: serverTimestamp(), precioUnitario: null, vigencia: null, nota: null, respondida: null, ...cambios,
  });

  it('se listan solo en el lote de la adjudicación, con el ganador real y sin precio', async () => {
    await cotizar('prov1');
    await assertFails(adjudicarYListar([['PC-1--i1', antecedente('i1', 'prov2')]]));
    await assertFails(adjudicarYListar([['PC-1--i1', antecedente('i1', 'prov1', { precioUnitario: 15500 })]]));
    await assertFails(adjudicarYListar([['otro-id', antecedente('i1', 'prov1')]]));
    await assertSucceeds(adjudicarYListar([['PC-1--i1', antecedente('i1', 'prov1')], ['PC-1--i2', antecedente('i2', 'prov1')]]));
    // Con el pedido ya adjudicado no se agregan antecedentes sueltos.
    await assertFails(setDoc(doc(como('comp1'), 'antecedentes', 'PC-1--i1'), antecedente('i1', 'prov1')));
  });
  it('los ven los compradores, no los proveedores', async () => {
    await cotizar('prov1');
    await adjudicarYListar([['PC-1--i1', antecedente('i1', 'prov1')]]);
    await assertSucceeds(getDocs(collection(como('comp2'), 'antecedentes')));
    await assertFails(getDocs(collection(como('prov2'), 'antecedentes')));
  });
  it('un comprador pide valor al ganador; responde solo ese proveedor, una vez', async () => {
    await cotizar('prov1');
    await adjudicarYListar([['PC-1--i1', antecedente('i1', 'prov1')]]);
    await assertFails(addDoc(collection(como('comp2'), 'solicitudesValor'), solicitud({ proveedorId: 'prov2' })));
    await assertFails(addDoc(collection(como('comp2'), 'solicitudesValor'), solicitud({ compradorId: 'comp1' })));
    await assertFails(addDoc(collection(como('comp2'), 'solicitudesValor'), solicitud({ precioUnitario: 1 })));
    await assertFails(addDoc(collection(como('prov2'), 'solicitudesValor'), solicitud({ compradorId: 'prov2' })));
    const ref = await addDoc(collection(como('comp2'), 'solicitudesValor'), solicitud());
    const respuesta = { estado: 'respondida', precioUnitario: 16200, vigencia: '2026-12-31', nota: '', respondida: serverTimestamp() };
    await assertFails(updateDoc(doc(como('prov2'), 'solicitudesValor', ref.id), respuesta));
    await assertFails(updateDoc(doc(como('comp2'), 'solicitudesValor', ref.id), respuesta));
    await assertFails(updateDoc(doc(como('prov1'), 'solicitudesValor', ref.id), { ...respuesta, precioUnitario: 0 }));
    await assertSucceeds(updateDoc(doc(como('prov1'), 'solicitudesValor', ref.id), respuesta));
    await assertFails(updateDoc(doc(como('prov1'), 'solicitudesValor', ref.id), { estado: 'declinada', respondida: serverTimestamp() }));
    await assertSucceeds(getDocs(query(collection(como('comp2'), 'solicitudesValor'), where('compradorId', '==', 'comp2'))));
    await assertSucceeds(getDocs(query(collection(como('prov1'), 'solicitudesValor'), where('proveedorId', '==', 'prov1'))));
    await assertFails(getDocs(query(collection(como('comp1'), 'solicitudesValor'), where('compradorId', '==', 'comp2'))));
  });
});
