import {
  collection, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, setDoc, updateDoc, where,
  type DocumentData, type Firestore, type QueryConstraint,
} from 'firebase/firestore';
import type { Auth } from 'firebase/auth';
import { REGION } from '@/config/region';
import { regionDesdeUbicacion, separarNombre } from '@/domain/acceso';
import { ReglaDeNegocioError, validarRespuestaPedido, validarSolicitud } from '@/domain/reglas';
import type {
  Comprador, Cotizacion, DatosCuenta, Embudo, EstadoSolicitud, FiltroRed, FrecuenciaAvisos, PedidoCotizacion,
  Persona, PlanId, Proveedor, SolicitudContacto, Uso,
} from '@/domain/types';
import { esMailCorporativo } from '@/domain/validaciones';
import { firebase } from '@/firebase/app';
import * as referencia from '../mock/seed';
import type { NuevaCotizacion, NuevoPedido, Repository } from '../repository';

/**
 * La red, los pedidos y las cotizaciones en Firestore.
 *
 *   personas/{uid}                        ficha de la red (sin mail ni teléfono: esos viven en users/{uid}/privado/contacto)
 *   solicitudes/{id}                      pedido de contacto de un proveedor a un comprador
 *   pedidos/{id}                          pedido de cotización de un comprador
 *   cotizaciones/{pedidoId}_{proveedorId} una cotización por proveedor y pedido
 *
 * Quién lee y escribe qué lo deciden firebase/firestore.rules. Las reglas de negocio de domain/
 * (motivo, cupos, pedido cerrado) se validan acá antes de escribir.
 * Los valores de referencia y el índice de precios los carga el equipo en el código (data/valores-referencia.ts, data/mock/seed.ts).
 */

const hoy = () => new Date().toISOString().slice(0, 10);
const inicioDeMes = () => `${hoy().slice(0, 7)}-01`;
const SIN_CONTACTO = { email: '', telefono: '' };

/** Código corto y legible para un pedido (sin 0/O ni 1/I para que no se confundan al dictarlo). */
function codigoPedido() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const azar = crypto.getRandomValues(new Uint32Array(6));
  return `PC-${Array.from(azar, (n) => letras[n % letras.length]).join('')}`;
}

function traducir(e: unknown): Error {
  if (e instanceof ReglaDeNegocioError) return e;
  const codigo = (e as { code?: string })?.code ?? '';
  if (codigo === 'permission-denied') return new Error('No tenés permiso para hacer eso.');
  if (codigo === 'unavailable') return new Error('No hay conexión. Revisá internet y probá de nuevo.');
  console.error('[firestore]', e);
  return new Error('Algo falló. Probá de nuevo en un momento.');
}

const ventanaAbierta = (c: Comprador) => !!c.ventanaHasta && c.ventanaHasta >= hoy();

function coincide(p: Persona, f?: FiltroRed) {
  if (!f) return true;
  if (f.rubro && !p.rubros.includes(f.rubro)) return false;
  if (f.region && p.region !== f.region) return false;
  if (f.soloVentanaAbierta && p.rol === 'comprador' && !ventanaAbierta(p)) return false;
  if (f.texto) {
    const t = f.texto.toLowerCase();
    if (![p.nombre, p.apellido, p.empresa, p.cargo, p.ciudad].join(' ').toLowerCase().includes(t)) return false;
  }
  return true;
}

/** Quita campos de servidor (timestamps) que la interfaz no usa. */
function limpio<T>(id: string, d: DocumentData): T {
  const { ts: _ts, actualizado: _a, ...resto } = d;
  return { ...resto, id } as T;
}

const persona = (id: string, d: DocumentData) => ({ ...limpio<Persona>(id, d), contacto: SIN_CONTACTO });

export function crearFirestoreRepository(): Repository {
  const { db, auth } = firebase();
  return new FirestoreRepository(db, auth);
}

export class FirestoreRepository implements Repository {
  private oyentes = new Set<() => void>();

  constructor(private db: Firestore, private auth: Auth) {}

  private avisar() { this.oyentes.forEach((fn) => fn()); }
  private yo() {
    const u = this.auth.currentUser;
    if (!u) throw new Error('Tenés que iniciar sesión.');
    return u.uid;
  }
  private async lista<T>(coleccion: string, ...filtros: QueryConstraint[]): Promise<T[]> {
    const snap = await getDocs(query(collection(this.db, coleccion), ...filtros));
    return snap.docs.map((d) => limpio<T>(d.id, d.data()));
  }

  // ── Red ────────────────────────────────────────────────────────────────

  private async personas(rol: 'comprador' | 'proveedor', f?: FiltroRed) {
    if (!this.auth.currentUser) return [];
    const snap = await getDocs(query(collection(this.db, 'personas'), where('rol', '==', rol)));
    return snap.docs.map((d) => persona(d.id, d.data())).filter((p) => coincide(p, f))
      .sort((a, b) => a.empresa.localeCompare(b.empresa, REGION.locale));
  }
  async listarCompradores(f?: FiltroRed) { return (await this.personas('comprador', f)) as Comprador[]; }
  async listarProveedores(f?: FiltroRed) { return (await this.personas('proveedor', f)) as Proveedor[]; }

  async obtenerPersona(id: string) {
    if (!this.auth.currentUser) return null;
    const d = await getDoc(doc(this.db, 'personas', id));
    return d.exists() ? persona(d.id, d.data()) : null;
  }

  async sincronizarCuenta(c: DatosCuenta): Promise<Persona> {
    const { nombre, apellido } = separarNombre(c.contactoNombre);
    const comunes = {
      nombre, apellido, empresa: c.empresa.trim(), ciudad: c.ubicacion.trim(), region: regionDesdeUbicacion(c.ubicacion),
      logo: c.logoUrl ?? null,
    };
    const ref = doc(this.db, 'personas', c.uid);
    try {
      const existente = await getDoc(ref);
      if (existente.exists()) {
        const actual = persona(existente.id, existente.data());
        const rubros = actual.rubros.includes(c.categoria) ? actual.rubros : [c.categoria, ...actual.rubros].slice(0, 10);
        const cambia = Object.entries({ ...comunes, rubros }).some(([k, v]) => JSON.stringify((actual as never)[k]) !== JSON.stringify(v));
        if (cambia) await updateDoc(ref, { ...comunes, rubros, actualizado: serverTimestamp() });
        return { ...actual, ...comunes, rubros };
      }
      const base = {
        ...comunes, rol: c.rol, idFiscal: c.cuit,
        cargo: c.rol === 'comprador' ? 'Responsable de compras' : 'Responsable comercial',
        rubros: [c.categoria],
        verificaciones: { idFiscal: true, mailCorporativo: esMailCorporativo(c.email, REGION), cargoRevisado: false },
      };
      const nueva = c.rol === 'comprador'
        ? { ...base, ventanaHasta: null, foco: c.sector, acepta: 'Pedidos de cotización', noAcepta: 'Llamadas en frío', tasaRespuesta: 0, semiAnonimo: false, circulos: [] }
        : { ...base, avisos: 'inmediato', plan: 'gratis', desde: new Date().getFullYear(), empleados: '', certificaciones: [], catalogo: c.sector ? [c.sector] : [], cobertura: { [base.region]: 100 }, resenas: [] };
      await setDoc(ref, { ...nueva, ts: serverTimestamp() });
      this.avisar();
      return { ...(nueva as unknown as Persona), id: c.uid, contacto: SIN_CONTACTO };
    } catch (e) {
      throw traducir(e);
    }
  }

  // ── Solicitudes de contacto ───────────────────────────────────────────

  async solicitudesRecibidas(compradorId: string) {
    const l = await this.lista<SolicitudContacto>('solicitudes', where('compradorId', '==', compradorId));
    return l.sort((a, b) => b.creada.localeCompare(a.creada));
  }
  async solicitudesEnviadas(proveedorId: string) {
    const l = await this.lista<SolicitudContacto>('solicitudes', where('proveedorId', '==', proveedorId));
    return l.sort((a, b) => b.creada.localeCompare(a.creada));
  }

  async enviarSolicitud(proveedorId: string, compradorId: string, motivo: string) {
    if (proveedorId !== this.yo()) throw new Error('No tenés permiso para hacer eso.');
    const prov = (await this.obtenerPersona(proveedorId)) as Proveedor | null;
    if (!prov || prov.rol !== 'proveedor') throw new Error('Solo los proveedores piden contacto.');
    const enviadas = await this.solicitudesEnviadas(proveedorId);
    validarSolicitud({
      motivo, plan: prov.plan, uso: await this.uso(proveedorId),
      existentes: enviadas.filter((s) => s.compradorId === compradorId), compradorRecibe: true,
    });
    const s = { proveedorId, compradorId, motivo: motivo.trim(), estado: 'pendiente' as const, creada: hoy() };
    try {
      const ref = doc(collection(this.db, 'solicitudes'));
      await setDoc(ref, { ...s, ts: serverTimestamp() });
      this.avisar();
      return { ...s, id: ref.id };
    } catch (e) {
      throw traducir(e);
    }
  }

  async responderSolicitud(id: string, estado: Exclude<EstadoSolicitud, 'pendiente'>) {
    try {
      await updateDoc(doc(this.db, 'solicitudes', id), { estado, respondida: serverTimestamp() });
      this.avisar();
    } catch (e) {
      throw traducir(e);
    }
  }

  // ── Pedidos y cotizaciones ────────────────────────────────────────────

  async listarPedidos(f?: { compradorId?: string; rubros?: string[] }) {
    if (!this.auth.currentUser) return [];
    const filtros: QueryConstraint[] = [];
    if (f?.compradorId) filtros.push(where('compradorId', '==', f.compradorId));
    if (f?.rubros) {
      if (!f.rubros.length) return [];
      if (f.rubros.length <= 30) filtros.push(where('rubro', 'in', f.rubros));
    }
    const snap = await getDocs(query(collection(this.db, 'pedidos'), ...filtros));
    return snap.docs
      .map((d) => ({ p: limpio<PedidoCotizacion>(d.id, d.data()), t: d.data().ts?.toMillis?.() ?? Date.now() }))
      .filter(({ p }) => !f?.rubros || f.rubros.includes(p.rubro))
      .sort((a, b) => b.t - a.t)
      .map(({ p }) => p);
  }

  async obtenerPedido(id: string) {
    if (!this.auth.currentUser) return null;
    const d = await getDoc(doc(this.db, 'pedidos', id));
    return d.exists() ? limpio<PedidoCotizacion>(d.id, d.data()) : null;
  }

  async publicarPedido(nuevo: NuevoPedido) {
    if (nuevo.compradorId !== this.yo()) throw new Error('No tenés permiso para hacer eso.');
    const p: Omit<PedidoCotizacion, 'id'> = { ...nuevo, estado: 'abierto' };
    try {
      // Código corto: si por azar ya existe, se prueba otro.
      for (let intento = 0; intento < 5; intento++) {
        const ref = doc(this.db, 'pedidos', codigoPedido());
        const creado = await runTransaction(this.db, async (tx) => {
          if ((await tx.get(ref)).exists()) return false;
          tx.set(ref, { ...p, ts: serverTimestamp() });
          return true;
        });
        if (creado) {
          this.avisar();
          return { ...p, id: ref.id };
        }
      }
      throw new Error('No se pudo generar el código del pedido. Probá de nuevo.');
    } catch (e) {
      throw traducir(e);
    }
  }

  /** El comprador ve todas las cotizaciones de su pedido; el proveedor, solo la suya. */
  async cotizacionesDe(pedidoId: string) {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return [];
    const pedido = await this.obtenerPedido(pedidoId);
    if (!pedido) return [];
    const l = pedido.compradorId === uid
      ? await this.lista<Cotizacion & { compradorId?: string }>('cotizaciones', where('pedidoId', '==', pedidoId), where('compradorId', '==', uid))
      : await this.lista<Cotizacion & { compradorId?: string }>('cotizaciones', where('pedidoId', '==', pedidoId), where('proveedorId', '==', uid));
    return l.map(({ compradorId: _c, ...c }) => c as Cotizacion).sort((a, b) => a.precioUnitario - b.precioUnitario);
  }

  async cotizar(nueva: NuevaCotizacion) {
    if (nueva.proveedorId !== this.yo()) throw new Error('No tenés permiso para hacer eso.');
    const [prov, pedido] = await Promise.all([this.obtenerPersona(nueva.proveedorId), this.obtenerPedido(nueva.pedidoId)]);
    if (!prov || prov.rol !== 'proveedor') throw new Error('Solo los proveedores cotizan.');
    if (!pedido) throw new Error('Ese pedido ya no existe.');
    const id = `${pedido.id}_${prov.id}`;
    const ref = doc(this.db, 'cotizaciones', id);
    const yaCotizo = await getDoc(ref).then((d) => d.exists(), () => false);
    validarRespuestaPedido({ plan: prov.plan, uso: await this.uso(prov.id), pedidoAbierto: pedido.estado === 'abierto', yaCotizo });
    if (!(nueva.precioUnitario > 0)) throw new ReglaDeNegocioError('MOTIVO_CORTO', 'Indicá un precio unitario mayor a cero.');
    const c = { ...nueva, plazoDias: Math.max(0, Math.round(nueva.plazoDias || 0)), creada: hoy() };
    try {
      await setDoc(ref, { ...c, compradorId: pedido.compradorId, ts: serverTimestamp() });
      this.avisar();
      return { ...c, id };
    } catch (e) {
      throw traducir(e);
    }
  }

  async adjudicar(pedidoId: string, cotizacionId: string) {
    const proveedorId = cotizacionId.slice(pedidoId.length + 1);
    try {
      await updateDoc(doc(this.db, 'pedidos', pedidoId), { estado: 'adjudicado', adjudicadaA: proveedorId });
      this.avisar();
    } catch (e) {
      throw traducir(e);
    }
  }

  // ── Avisos por mail ───────────────────────────────────────────────────
  // Los mails los manda un backend (server/notificarPedido.ts), que todavía no está publicado.
  // Mientras tanto no se registra ningún aviso: la interfaz no muestra envíos que no ocurrieron.

  async avisosDePedido() { return []; }

  async cambiarAvisos(proveedorId: string, frecuencia: FrecuenciaAvisos) {
    try {
      await updateDoc(doc(this.db, 'personas', proveedorId), { avisos: frecuencia, actualizado: serverTimestamp() });
      this.avisar();
    } catch (e) {
      throw traducir(e);
    }
  }

  async bandejaSalida() { return []; }
  async enviarResumenesAhora() { return 0; }

  // ── Datos de referencia (los carga el equipo en el código) ────────────

  async valoresReferencia() { return { valores: referencia.valores, mesesIso: referencia.mesesIso, inflacion: referencia.inflacion }; }
  async indicePrecios() { return { series: referencia.series, inflacion: referencia.inflacion, meses: referencia.meses }; }

  // ── Plan, cupos y tablero del proveedor ───────────────────────────────

  /** Cupo del mes calendario, contado a partir de lo que el proveedor efectivamente envió. */
  async uso(proveedorId: string): Promise<Uso> {
    const desde = inicioDeMes();
    const [sols, cotis] = await Promise.all([
      this.lista<SolicitudContacto>('solicitudes', where('proveedorId', '==', proveedorId)),
      this.lista<Cotizacion>('cotizaciones', where('proveedorId', '==', proveedorId)),
    ]);
    return {
      solicitudesUsadas: sols.filter((s) => s.creada >= desde).length,
      respuestasUsadas: cotis.filter((c) => c.creada >= desde).length,
    };
  }

  async cambiarPlan(proveedorId: string, plan: PlanId) {
    try {
      await updateDoc(doc(this.db, 'personas', proveedorId), { plan, actualizado: serverTimestamp() });
      this.avisar();
    } catch (e) {
      throw traducir(e);
    }
  }

  async embudo(proveedorId: string): Promise<Embudo> {
    const [enviadas, ganadas] = await Promise.all([
      this.solicitudesEnviadas(proveedorId),
      this.lista<PedidoCotizacion>('pedidos', where('adjudicadaA', '==', proveedorId)),
    ]);
    const aceptadas = enviadas.filter((s) => s.estado === 'aceptada').length;
    // Las vistas de perfil y las reuniones todavía no se registran.
    return { vistas: 0, solicitudes: enviadas.length, aceptadas, reuniones: aceptadas, ganadas: ganadas.length };
  }

  async reiniciarDemo() { /* solo existe en la demo */ }

  suscribir(fn: () => void) {
    this.oyentes.add(fn);
    return () => { this.oyentes.delete(fn); };
  }
}
