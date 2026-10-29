import {
  addDoc, collection, collectionGroup, doc, getDoc, getDocs, increment, query, serverTimestamp, setDoc, Timestamp, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { firebase } from '@/firebase/app';
import { planDeAvisos } from '@/domain/notificaciones';
import { validarRespuestaPedido, validarSolicitud } from '@/domain/reglas';
import type {
  Comprador, DatosCuenta, Embudo, FiltroRed, FrecuenciaAvisos, Persona, PlanId, Proveedor, Resena, SerieIndice, Uso, ValorReferencia,
} from '@/domain/types';
import { validarResena, validarValor, type DatosResena } from '@/domain/resenas';
import { adjudicadosDe, preciosVisibles, validarAdjudicacion, validarCotizacion, validarPedido } from '@/domain/rfq';
import { aCotizacion, aPedido, aPersona, aResena, aSolicitud, fechaIso, hoyIso, inicioMes, ventanaAbierta, type Estado } from './mapeo';
import { valores as valoresBase } from '../valores-referencia';
import type { NuevaCotizacion, NuevoPedido, Repository } from '../repository';

/**
 * Todos los datos de la red en Firestore. Las reglas (firebase/firestore.rules) deciden quién lee y escribe;
 * acá se repiten las validaciones de negocio para dar mensajes claros antes de llegar a ellas.
 * Ver el modelo de colecciones al inicio de las reglas.
 */

function coincide(p: Persona, f?: FiltroRed) {
  if (!f) return true;
  if (f.rubro && !p.rubros.includes(f.rubro)) return false;
  if (f.region && p.region !== f.region) return false;
  if (f.soloVentanaAbierta && p.rol === 'comprador' && !ventanaAbierta(p)) return false;
  if (f.texto && ![p.nombre, p.apellido, p.empresa, p.ciudad].join(' ').toLowerCase().includes(f.texto.toLowerCase())) return false;
  return true;
}

export class FirestoreRepository implements Repository {
  private db = firebase().db;
  private auth = firebase().auth;
  private oyentes = new Set<() => void>();

  private tocar<T>(x: T) { this.oyentes.forEach((f) => f()); return x; }

  private yo() {
    const u = this.auth.currentUser;
    if (!u) throw new Error('Sin sesión');
    return u.uid;
  }

  private async estados(): Promise<Map<string, Estado>> {
    const snap = await getDocs(collection(this.db, 'estado'));
    return new Map(snap.docs.map((d) => [d.id, d.data() as Estado]));
  }

  /** Reseñas agrupadas por proveedor, de la más nueva a la más vieja. */
  private async resenas(proveedorId?: string): Promise<Map<string, Resena[]>> {
    const ref = collection(this.db, 'resenas');
    const snap = await getDocs(proveedorId ? query(ref, where('proveedorId', '==', proveedorId)) : ref);
    const mapa = new Map<string, Resena[]>();
    for (const d of snap.docs) {
      const lista = mapa.get(d.data().proveedorId) ?? [];
      lista.push(aResena(d.id, d.data()));
      mapa.set(d.data().proveedorId, lista);
    }
    for (const lista of mapa.values()) lista.sort((a, b) => b.fecha.localeCompare(a.fecha));
    return mapa;
  }

  private async personas(rol: 'comprador' | 'proveedor'): Promise<Persona[]> {
    const [snap, estados] = await Promise.all([getDocs(query(collection(this.db, 'users'), where('rol', '==', rol))), this.estados()]);
    const personas = snap.docs.map((d) => aPersona(d.id, d.data(), estados.get(d.id)));
    if (rol === 'proveedor') {
      const porProveedor = await this.resenas();
      for (const p of personas as Proveedor[]) p.resenas = porProveedor.get(p.id) ?? [];
    }
    if (rol === 'comprador') {
      // La "ventana de compra" de un comprador es el cierre de su pedido abierto más lejano.
      const abiertos = await getDocs(query(collection(this.db, 'pedidos'), where('estado', '==', 'abierto'), where('privado', '==', false)));
      const cierre = new Map<string, string>();
      for (const d of abiertos.docs) {
        const p = d.data();
        if (!cierre.has(p.compradorId) || cierre.get(p.compradorId)! < p.cierre) cierre.set(p.compradorId, p.cierre);
      }
      for (const c of personas as Comprador[]) c.ventanaHasta = cierre.get(c.id) ?? null;
    }
    return personas;
  }

  async listarCompradores(f?: FiltroRed) { return (await this.personas('comprador')).filter((p) => coincide(p, f)) as Comprador[]; }
  async listarProveedores(f?: FiltroRed) { return (await this.personas('proveedor')).filter((p) => coincide(p, f)) as Proveedor[]; }

  async obtenerPersona(id: string) {
    const [d, e] = await Promise.all([getDoc(doc(this.db, 'users', id)), getDoc(doc(this.db, 'estado', id))]);
    if (!d.exists()) return null;
    const p = aPersona(d.id, d.data(), e.data() as Estado | undefined);
    if (p.rol === 'comprador') {
      const abiertos = await getDocs(query(collection(this.db, 'pedidos'), where('compradorId', '==', id), where('estado', '==', 'abierto'), where('privado', '==', false)));
      p.ventanaHasta = abiertos.docs.map((x) => x.data().cierre as string).sort().pop() ?? null;
    } else {
      p.resenas = (await this.resenas(id)).get(id) ?? [];
    }
    return p;
  }

  /** El perfil ya está en users/{uid}: no hay nada que copiar. */
  async sincronizarCuenta(_c: DatosCuenta) {}

  // ── Solicitudes
  async solicitudesRecibidas(compradorId: string) {
    const snap = await getDocs(query(collection(this.db, 'solicitudes'), where('compradorId', '==', compradorId)));
    return snap.docs.map((d) => aSolicitud(d.id, d.data())).sort((a, b) => b.creada.localeCompare(a.creada));
  }
  async solicitudesEnviadas(proveedorId: string) {
    const snap = await getDocs(query(collection(this.db, 'solicitudes'), where('proveedorId', '==', proveedorId)));
    return snap.docs.map((d) => aSolicitud(d.id, d.data())).sort((a, b) => b.creada.localeCompare(a.creada));
  }
  async enviarSolicitud(proveedorId: string, compradorId: string, motivo: string) {
    const [prov, uso, enviadas] = await Promise.all([this.obtenerPersona(proveedorId), this.uso(proveedorId), this.solicitudesEnviadas(proveedorId)]);
    validarSolicitud({
      motivo, plan: (prov as Proveedor).plan, uso, existentes: enviadas.filter((s) => s.compradorId === compradorId), compradorRecibe: true,
    });
    const ref = await addDoc(collection(this.db, 'solicitudes'), { proveedorId, compradorId, motivo: motivo.trim(), estado: 'pendiente', creada: serverTimestamp() });
    return this.tocar({ id: ref.id, proveedorId, compradorId, motivo: motivo.trim(), estado: 'pendiente' as const, creada: hoyIso() });
  }
  async responderSolicitud(id: string, estado: 'aceptada' | 'postergada' | 'rechazada') {
    await updateDoc(doc(this.db, 'solicitudes', id), { estado });
    this.tocar(undefined);
  }

  // ── Pedidos y cotizaciones
  // Las consultas tienen que poder probarse contra las reglas: por eso los pedidos ajenos se piden
  // en dos tandas (públicos e invitaciones) y nunca la colección entera.
  async listarPedidos(f?: { compradorId?: string; rubros?: string[]; visorId?: string }) {
    const base = collection(this.db, 'pedidos');
    const uid = this.yo();
    let docs;
    if (f?.compradorId) {
      const q = f.compradorId === uid ? query(base, where('compradorId', '==', uid)) : query(base, where('compradorId', '==', f.compradorId), where('privado', '==', false));
      docs = (await getDocs(q)).docs;
    } else {
      const [publicos, invitado] = await Promise.all([getDocs(query(base, where('privado', '==', false))), getDocs(query(base, where('invitados', 'array-contains', uid)))]);
      const invitaciones = new Set(invitado.docs.map((d) => d.id));
      docs = [...invitado.docs, ...publicos.docs.filter((d) => !invitaciones.has(d.id))];
    }
    return docs.map((d) => aPedido(d.id, d.data()))
      .filter((p) => !f?.rubros || f.rubros.includes(p.rubro) || p.invitados.includes(uid))
      .sort((a, b) => b.cierraEn.localeCompare(a.cierraEn));
  }
  async obtenerPedido(id: string) {
    const d = await getDoc(doc(this.db, 'pedidos', id)).catch(() => null);
    return d?.exists() ? aPedido(d.id, d.data()) : null;
  }
  async publicarPedido(nuevo: NuevoPedido) {
    validarPedido(nuevo);
    const id = `PC-${Date.now().toString(36).slice(-6).toUpperCase()}`;
    const { cierraEn, ...resto } = nuevo;
    await setDoc(doc(this.db, 'pedidos', id), {
      ...resto, invitados: nuevo.privado ? nuevo.invitados : [], cierraEn: Timestamp.fromDate(new Date(cierraEn)),
      ofertas: 0, estado: 'abierto', creado: serverTimestamp(), avisado: false,
    });
    return this.tocar({ ...nuevo, id, ofertas: 0, estado: 'abierto' as const });
  }
  async cotizacionesDe(pedidoId: string) {
    const uid = this.yo();
    const pedido = await this.obtenerPedido(pedidoId);
    if (!pedido) return [];
    if (pedido.compradorId === uid) {
      if (!preciosVisibles(pedido)) return [];
      const snap = await getDocs(collection(this.db, 'pedidos', pedidoId, 'cotizaciones'));
      return snap.docs.map((d) => aCotizacion(d.id, d.data(), pedido.items)).sort((a, b) => a.precioUnitario - b.precioUnitario);
    }
    const mia = await getDoc(doc(this.db, 'pedidos', pedidoId, 'cotizaciones', uid)).catch(() => null);
    return mia?.exists() ? [aCotizacion(mia.id, mia.data(), pedido.items)] : [];
  }
  async cotizar(nueva: NuevaCotizacion) {
    const [prov, pedido, uso, ya] = await Promise.all([
      this.obtenerPersona(nueva.proveedorId), this.obtenerPedido(nueva.pedidoId), this.uso(nueva.proveedorId),
      getDoc(doc(this.db, 'pedidos', nueva.pedidoId, 'cotizaciones', nueva.proveedorId)),
    ]);
    if (!pedido) throw new Error('Pedido inexistente');
    validarRespuestaPedido({ plan: (prov as Proveedor).plan, uso, pedidoAbierto: pedido.estado === 'abierto', yaCotizo: ya.exists() });
    validarCotizacion(pedido, nueva);
    // La oferta y el contador del pedido van juntos: las reglas exigen las dos cosas a la vez.
    const lote = writeBatch(this.db);
    lote.set(doc(this.db, 'pedidos', nueva.pedidoId, 'cotizaciones', nueva.proveedorId), {
      ...nueva, plazoDias: Math.round(nueva.plazoDias), nota: nueva.nota ?? '', creada: serverTimestamp(),
    });
    lote.update(doc(this.db, 'pedidos', nueva.pedidoId), { ofertas: increment(1) });
    await lote.commit();
    return this.tocar({ ...nueva, id: nueva.proveedorId, creada: hoyIso() });
  }
  async adjudicar(pedidoId: string, asignacion: Record<string, string>, comentario: string) {
    const pedido = await this.obtenerPedido(pedidoId);
    if (!pedido) throw new Error('Pedido inexistente');
    validarAdjudicacion(pedido, await this.cotizacionesDe(pedidoId), asignacion);
    const adjudicados = adjudicadosDe(asignacion);
    // El id de cada cotización es el uid del proveedor.
    await updateDoc(doc(this.db, 'pedidos', pedidoId), {
      estado: 'adjudicado', adjudicadaA: adjudicados[0], adjudicados, adjudicacion: asignacion, comentarioAdjudicacion: comentario.trim(),
    });
    this.tocar(undefined);
  }

  // ── Avisos por mail (los manda server/avisos.ts; acá solo se consultan)
  async avisosDePedido(pedidoId: string) {
    const snap = await getDocs(collection(this.db, 'pedidos', pedidoId, 'avisos')).catch(() => null);
    if (snap && !snap.empty) return snap.docs.map((d) => ({ proveedorId: d.id, empresa: d.data().empresa as string, via: d.data().via as 'mail' | 'resumen' }));
    // Todavía no corrió el envío: mostramos a quiénes les va a llegar.
    const pedido = await this.obtenerPedido(pedidoId);
    if (!pedido) return [];
    const { inmediatos, diarios } = planDeAvisos(pedido, await this.listarProveedores());
    return [
      ...inmediatos.map((p) => ({ proveedorId: p.id, empresa: p.empresa, via: 'mail' as const })),
      ...diarios.map((p) => ({ proveedorId: p.id, empresa: p.empresa, via: 'resumen' as const })),
    ];
  }
  async cambiarAvisos(proveedorId: string, frecuencia: FrecuenciaAvisos) {
    await updateDoc(doc(this.db, 'users', proveedorId), { avisos: frecuencia, actualizado: serverTimestamp() });
    this.tocar(undefined);
  }
  /** Los mails reales los registra el proveedor de mail (Resend), no la app. */
  async bandejaSalida() { return []; }
  async enviarResumenesAhora() { return 0; }

  // ── Referencias
  async valoresReferencia() {
    const [snap, indice] = await Promise.all([getDocs(collection(this.db, 'valoresReferencia')), getDoc(doc(this.db, 'config', 'indice'))]);
    // Lo cargado en Firestore pisa al valor del código con el mismo id; lo nuevo se suma.
    const guardados = new Map(snap.docs.map((d) => [d.id, { ...(d.data() as ValorReferencia), id: d.id }]));
    const valores = [...valoresBase.map((v) => guardados.get(v.id) ?? v), ...[...guardados.values()].filter((v) => !valoresBase.some((b) => b.id === v.id))];
    const i = indice.data() ?? {};
    return { valores, mesesIso: (i.mesesIso ?? []) as string[], inflacion: (i.inflacion ?? []) as number[] };
  }
  async guardarValor(v: ValorReferencia) {
    validarValor(v);
    const { id, ...datos } = v;
    // Firestore no acepta undefined: se omiten los campos opcionales vacíos.
    const limpio = Object.fromEntries(Object.entries(datos).filter(([, x]) => x !== undefined));
    await setDoc(doc(this.db, 'valoresReferencia', id), { ...limpio, actualizado: serverTimestamp(), actualizadoPor: this.yo() });
    this.tocar(undefined);
  }
  async esAdmin(uid: string) {
    try { return (await getDoc(doc(this.db, 'admins', uid))).exists(); } catch { return false; }
  }

  // ── Reseñas: una por proveedor ganador. La del principal usa el id del pedido (formato anterior).
  async resenasDePedido(pedidoId: string) {
    const snap = await getDocs(query(collection(this.db, 'resenas'), where('pedidoId', '==', pedidoId)));
    return snap.docs.map((d) => aResena(d.id, d.data()));
  }
  async resenar(pedidoId: string, proveedorId: string, datos: DatosResena) {
    validarResena(datos);
    const pedido = await this.obtenerPedido(pedidoId);
    if (!pedido || pedido.estado !== 'adjudicado' || !pedido.adjudicados?.includes(proveedorId)) throw new Error('Solo se reseña a un proveedor que ganó el pedido.');
    const yo = (await this.obtenerPersona(this.yo())) as Comprador | null;
    const id = proveedorId === pedido.adjudicadaA ? pedidoId : `${pedidoId}--${proveedorId}`;
    await setDoc(doc(this.db, 'resenas', id), {
      pedidoId, proveedorId, compradorId: this.yo(),
      entrega: datos.entrega, calidad: datos.calidad, facturacion: datos.facturacion, texto: datos.texto.trim(),
      autor: yo ? `${yo.nombre} ${yo.apellido}`.trim() : 'Comprador', empresa: yo?.empresa ?? '',
      creada: serverTimestamp(),
    });
    this.tocar(undefined);
  }

  async indicePrecios() {
    const [snap, indice] = await Promise.all([getDocs(collection(this.db, 'indicePrecios')), getDoc(doc(this.db, 'config', 'indice'))]);
    const i = indice.data() ?? {};
    return { series: snap.docs.map((d) => d.data() as SerieIndice), inflacion: (i.inflacion ?? []) as number[], meses: (i.meses ?? []) as string[] };
  }

  // ── Planes y uso
  async uso(proveedorId: string): Promise<Uso> {
    const desde = inicioMes();
    const [sol, cot] = await Promise.all([
      this.solicitudesEnviadas(proveedorId),
      getDocs(query(collectionGroup(this.db, 'cotizaciones'), where('proveedorId', '==', proveedorId))),
    ]);
    return {
      solicitudesUsadas: sol.filter((s) => s.creada >= desde).length,
      respuestasUsadas: cot.docs.filter((d) => fechaIso(d.data().creada) >= desde).length,
    };
  }
  /** El plan pago lo activa el equipo al confirmar el cobro: acá queda pedido. */
  async cambiarPlan(proveedorId: string, plan: PlanId) {
    await setDoc(doc(this.db, 'solicitudesPlan', proveedorId), { plan, pedido: serverTimestamp() });
    this.tocar(undefined);
    return 'solicitado' as const;
  }
  async embudo(proveedorId: string): Promise<Embudo> {
    const [enviadas, ganadas] = await Promise.all([
      this.solicitudesEnviadas(proveedorId),
      getDocs(query(collection(this.db, 'pedidos'), where('adjudicados', 'array-contains', proveedorId))),
    ]);
    const aceptadas = enviadas.filter((s) => s.estado === 'aceptada').length;
    return { vistas: 0, solicitudes: enviadas.length, aceptadas, reuniones: aceptadas, ganadas: ganadas.size };
  }

  async reiniciarDemo() { /* no aplica con datos reales */ }

  suscribir(fn: () => void) {
    this.oyentes.add(fn);
    return () => { this.oyentes.delete(fn); };
  }
}
