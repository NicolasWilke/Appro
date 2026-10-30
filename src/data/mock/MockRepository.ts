import { REGION } from '@/config/region';
import { validarRespuestaPedido, validarSolicitud } from '@/domain/reglas';
import { mailDePedido, mailResumenDiario, planDeAvisos } from '@/domain/notificaciones';
import { regionDesdeUbicacion, separarNombre } from '@/domain/acceso';
import type { Comprador, Consulta, Cotizacion, DatosCuenta, FiltroRed, FrecuenciaAvisos, MailSaliente, PedidoCotizacion, Persona, Proveedor, SolicitudContacto, Uso, ValorReferencia } from '@/domain/types';
import { validarResena, validarValor, type DatosResena } from '@/domain/resenas';
import { adjudicadosDe, validarAdjudicacion, validarCotizacion, validarPedido, validarPregunta, validarRespuestaConsulta } from '@/domain/rfq';
import { esMailCorporativo } from '@/domain/validaciones';
import type { Repository } from '../repository';
import * as seed from './seed';

interface Estado {
  compradores: Comprador[];
  proveedores: Proveedor[];
  solicitudes: SolicitudContacto[];
  pedidos: PedidoCotizacion[];
  cotizaciones: Cotizacion[];
  usos: Record<string, Uso>;
  mails: MailSaliente[];
  /** pedidos esperando el resumen diario, por proveedor */
  colaResumen: Record<string, string[]>;
  /** Valores de referencia editados desde el panel de administración, por id */
  valores?: Record<string, ValorReferencia>;
  consultas?: Consulta[];
  favoritos?: Record<string, string[]>;
}

const CLAVE = 'appro:demo:v3';
const URL_PUBLICA = import.meta.env.VITE_PUBLIC_URL ?? 'https://appro.com.ar';
const hoy = () => new Date().toISOString().slice(0, 10);
const clonar = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const inicial = (): Estado => {
  const e: Estado = clonar({
    compradores: seed.compradores, proveedores: seed.proveedores, solicitudes: seed.solicitudes,
    pedidos: seed.pedidos, cotizaciones: seed.cotizaciones, usos: seed.usos, mails: [], colaResumen: {},
    consultas: seed.consultas, favoritos: seed.favoritos,
  });
  for (const p of e.pedidos) p.ofertas = e.cotizaciones.filter((c) => c.pedidoId === p.id).length;
  // La bandeja de la demo arranca con los avisos del pedido más reciente.
  notificar(e, e.pedidos.find((p) => p.id === 'PC-2619')!);
  return e;
};

let secuenciaMail = 0;
/** Lo que en producción hace el backend al publicarse un pedido (ver server/notificarPedido.ts). */
function notificar(e: Estado, pedido: PedidoCotizacion) {
  const comprador = e.compradores.find((c) => c.id === pedido.compradorId);
  if (!comprador) return;
  const { inmediatos, diarios } = planDeAvisos(pedido, e.proveedores);
  for (const prov of inmediatos) {
    e.mails.unshift({
      id: `m-${Date.now()}-${++secuenciaMail}`, para: { nombre: `${prov.nombre} ${prov.apellido}`, email: prov.contacto.email },
      ...mailDePedido(pedido, comprador, prov, URL_PUBLICA), tipo: 'pedido', proveedorId: prov.id, pedidoIds: [pedido.id], estado: 'enviado', creado: new Date().toISOString(),
    });
  }
  for (const prov of diarios) {
    const cola = (e.colaResumen[prov.id] ??= []);
    if (!cola.includes(pedido.id)) cola.push(pedido.id);
    recomponerResumen(e, prov);
  }
}

function recomponerResumen(e: Estado, prov: Proveedor) {
  const ids = e.colaResumen[prov.id] ?? [];
  e.mails = e.mails.filter((m) => !(m.proveedorId === prov.id && m.estado === 'en-cola'));
  if (!ids.length) return;
  const items = ids.map((id) => e.pedidos.find((p) => p.id === id)!).filter(Boolean)
    .map((pedido) => ({ pedido, comprador: e.compradores.find((c) => c.id === pedido.compradorId)! }));
  e.mails.unshift({
    id: `r-${prov.id}-${ids.join('-')}`, para: { nombre: `${prov.nombre} ${prov.apellido}`, email: prov.contacto.email },
    ...mailResumenDiario(items, prov, URL_PUBLICA), tipo: 'resumen', proveedorId: prov.id, pedidoIds: ids, estado: 'en-cola', creado: new Date().toISOString(),
  });
}

function cargar(): Estado {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (raw) return JSON.parse(raw) as Estado;
  } catch { /* almacenamiento bloqueado: se usa el estado inicial */ }
  return inicial();
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

/** Implementación en memoria con persistencia en el navegador. Aplica las mismas reglas de dominio que el backend. */
export class MockRepository implements Repository {
  private estado = cargar();
  private oyentes = new Set<() => void>();
  private secuencia = Date.now() % 100000;

  private guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(this.estado)); } catch { /* sin persistencia */ }
    this.oyentes.forEach((fn) => fn());
  }
  private id(prefijo: string) { return `${prefijo}-${++this.secuencia}`; }
  private usoDe(id: string) { return (this.estado.usos[id] ??= { solicitudesUsadas: 0, respuestasUsadas: 0 }); }
  private proveedor(id: string) {
    const p = this.estado.proveedores.find((x) => x.id === id);
    if (!p) throw new Error(`Proveedor ${id} inexistente`);
    return p;
  }

  async listarCompradores(f?: FiltroRed) { return this.estado.compradores.filter((c) => coincide(c, f)); }
  async listarProveedores(f?: FiltroRed) { return this.estado.proveedores.filter((p) => coincide(p, f)); }
  async obtenerPersona(id: string) {
    return this.estado.compradores.find((c) => c.id === id) ?? this.estado.proveedores.find((p) => p.id === id) ?? null;
  }

  async sincronizarCuenta(c: DatosCuenta): Promise<Persona> {
    const { nombre, apellido } = separarNombre(c.contactoNombre);
    const comunes = {
      nombre, apellido, empresa: c.empresa.trim(), idFiscal: c.cuit, ciudad: c.ubicacion, logo: c.logoUrl,
      contacto: { email: c.email, telefono: c.telefono },
    };
    const existente = await this.obtenerPersona(c.uid);
    if (existente) {
      Object.assign(existente, comunes);
      if (!existente.rubros.includes(c.categoria)) existente.rubros = [c.categoria, ...existente.rubros];
      this.guardar();
      return existente;
    }
    const base = {
      ...comunes, id: c.uid, cargo: c.rol === 'comprador' ? 'Responsable de compras' : 'Responsable comercial',
      region: regionDesdeUbicacion(c.ubicacion), rubros: [c.categoria],
      verificaciones: { idFiscal: true, mailCorporativo: esMailCorporativo(c.email, REGION), cargoRevisado: false },
    };
    const persona: Persona = c.rol === 'comprador'
      ? { ...base, rol: 'comprador', ventanaHasta: null, foco: c.sector, acepta: 'Pedidos de cotización', noAcepta: 'Llamadas en frío', tasaRespuesta: 0, semiAnonimo: false, circulos: [] }
      : { ...base, rol: 'proveedor', avisos: 'inmediato', plan: 'gratis', desde: new Date().getFullYear(), empleados: '', certificaciones: [], catalogo: c.sector ? [c.sector] : [], cobertura: { [base.region]: 100 }, resenas: [] };
    if (persona.rol === 'comprador') this.estado.compradores.push(persona); else this.estado.proveedores.push(persona);
    this.guardar();
    return persona;
  }

  async solicitudesRecibidas(compradorId: string) {
    return this.estado.solicitudes.filter((s) => s.compradorId === compradorId).sort((a, b) => b.creada.localeCompare(a.creada));
  }
  async solicitudesEnviadas(proveedorId: string) {
    return this.estado.solicitudes.filter((s) => s.proveedorId === proveedorId).sort((a, b) => b.creada.localeCompare(a.creada));
  }

  async enviarSolicitud(proveedorId: string, compradorId: string, motivo: string) {
    const prov = this.proveedor(proveedorId);
    const uso = this.usoDe(proveedorId);
    validarSolicitud({
      motivo, plan: prov.plan, uso,
      existentes: this.estado.solicitudes.filter((s) => s.proveedorId === proveedorId && s.compradorId === compradorId),
      compradorRecibe: true,
    });
    const s: SolicitudContacto = { id: this.id('sol'), proveedorId, compradorId, motivo: motivo.trim(), estado: 'pendiente', creada: hoy() };
    this.estado.solicitudes.push(s);
    uso.solicitudesUsadas++;
    this.guardar();
    return s;
  }

  async responderSolicitud(id: string, estado: 'aceptada' | 'postergada' | 'rechazada') {
    const s = this.estado.solicitudes.find((x) => x.id === id);
    if (!s) throw new Error('Solicitud inexistente');
    s.estado = estado;
    this.guardar();
  }

  async listarPedidos(f?: { compradorId?: string; rubros?: string[]; visorId?: string }) {
    const visible = (p: PedidoCotizacion) => !p.privado || p.compradorId === f?.visorId || (!!f?.visorId && p.invitados.includes(f.visorId));
    return this.estado.pedidos
      .filter((p) => visible(p) && (!f?.compradorId || p.compradorId === f.compradorId)
        && (!f?.rubros || f.rubros.includes(p.rubro) || (!!f.visorId && p.invitados.includes(f.visorId))))
      .sort((a, b) => b.cierraEn.localeCompare(a.cierraEn));
  }
  async obtenerPedido(id: string) { return this.estado.pedidos.find((p) => p.id === id) ?? null; }

  async publicarPedido(nuevo: Parameters<Repository['publicarPedido']>[0]) {
    validarPedido(nuevo);
    const ultimo = Math.max(...this.estado.pedidos.map((p) => Number(p.id.split('-')[1])));
    const p: PedidoCotizacion = { ...clonar(nuevo), invitados: nuevo.privado ? [...nuevo.invitados] : [], id: `PC-${ultimo + 1}`, ofertas: 0, estado: 'abierto' };
    this.estado.pedidos.push(p);
    notificar(this.estado, p);
    this.guardar();
    return p;
  }

  async cotizacionesDe(pedidoId: string) {
    return this.estado.cotizaciones.filter((c) => c.pedidoId === pedidoId).sort((a, b) => a.precioUnitario - b.precioUnitario);
  }

  async cotizar(nueva: Parameters<Repository['cotizar']>[0]) {
    const prov = this.proveedor(nueva.proveedorId);
    const pedido = this.estado.pedidos.find((p) => p.id === nueva.pedidoId);
    if (!pedido) throw new Error('Pedido inexistente');
    const uso = this.usoDe(prov.id);
    validarRespuestaPedido({
      plan: prov.plan, uso, pedidoAbierto: pedido.estado === 'abierto',
      yaCotizo: this.estado.cotizaciones.some((c) => c.pedidoId === pedido.id && c.proveedorId === prov.id),
    });
    validarCotizacion(pedido, nueva);
    const c: Cotizacion = { ...clonar(nueva), id: this.id('c'), creada: hoy() };
    this.estado.cotizaciones.push(c);
    pedido.ofertas++;
    uso.respuestasUsadas++;
    this.guardar();
    return c;
  }

  async adjudicar(pedidoId: string, asignacion: Record<string, string>, comentario: string) {
    const p = this.estado.pedidos.find((x) => x.id === pedidoId);
    if (!p) throw new Error('Pedido inexistente');
    validarAdjudicacion(p, await this.cotizacionesDe(pedidoId), asignacion);
    const adjudicados = adjudicadosDe(asignacion);
    Object.assign(p, { estado: 'adjudicado', adjudicadaA: adjudicados[0], adjudicados, adjudicacion: { ...asignacion }, comentarioAdjudicacion: comentario.trim() });
    this.guardar();
  }

  async consultasDe(pedidoId: string) {
    return (this.estado.consultas ??= clonar(seed.consultas)).filter((c) => c.pedidoId === pedidoId)
      .sort((a, b) => a.creada.localeCompare(b.creada) || a.id.localeCompare(b.id));
  }
  async preguntar(pedidoId: string, pregunta: string, proveedorId: string) {
    const pedido = this.estado.pedidos.find((x) => x.id === pedidoId);
    if (!pedido) throw new Error('Pedido inexistente');
    validarPregunta(pedido, proveedorId, pregunta);
    const c: Consulta = { id: this.id('q'), pedidoId, pregunta: pregunta.trim(), respuesta: null, creada: hoy(), respondida: null };
    (this.estado.consultas ??= clonar(seed.consultas)).push(c);
    this.guardar();
    return c;
  }
  async responderConsulta(pedidoId: string, consultaId: string, respuesta: string) {
    validarRespuestaConsulta(respuesta);
    const c = (this.estado.consultas ??= clonar(seed.consultas)).find((x) => x.id === consultaId && x.pedidoId === pedidoId);
    if (!c) throw new Error('Consulta inexistente');
    if (c.respuesta) throw new Error('Esta consulta ya tiene respuesta.');
    Object.assign(c, { respuesta: respuesta.trim(), respondida: hoy() });
    this.guardar();
  }

  async favoritos(compradorId: string) { return [...((this.estado.favoritos ??= clonar(seed.favoritos))[compradorId] ?? [])]; }
  async marcarFavorito(compradorId: string, proveedorId: string, favorito: boolean) {
    const todos = (this.estado.favoritos ??= clonar(seed.favoritos));
    const lista = (todos[compradorId] ?? []).filter((x) => x !== proveedorId);
    todos[compradorId] = favorito ? [...lista, proveedorId] : lista;
    this.guardar();
  }

  async avisosDePedido(pedidoId: string) {
    const out: { proveedorId: string; empresa: string; via: 'mail' | 'resumen' }[] = [];
    for (const m of this.estado.mails) {
      if (!m.pedidoIds.includes(pedidoId)) continue;
      out.push({ proveedorId: m.proveedorId, empresa: this.proveedor(m.proveedorId).empresa, via: m.tipo === 'pedido' ? 'mail' : 'resumen' });
    }
    return out;
  }

  async cambiarAvisos(proveedorId: string, frecuencia: FrecuenciaAvisos) {
    const prov = this.proveedor(proveedorId);
    prov.avisos = frecuencia;
    if (frecuencia !== 'diario') delete this.estado.colaResumen[proveedorId];
    recomponerResumen(this.estado, prov);
    this.guardar();
  }

  async bandejaSalida() { return [...this.estado.mails]; }

  async enviarResumenesAhora() {
    let n = 0;
    for (const m of this.estado.mails) if (m.estado === 'en-cola') { m.estado = 'enviado'; m.id = `${m.id}-${Date.now()}`; n++; }
    this.estado.colaResumen = {};
    this.guardar();
    return n;
  }

  async valoresReferencia() {
    const editados = this.estado.valores ?? {};
    return { valores: seed.valores.map((v) => editados[v.id] ?? v), mesesIso: seed.mesesIso, inflacion: seed.inflacion };
  }
  async guardarValor(v: ValorReferencia) {
    validarValor(v);
    (this.estado.valores ??= {})[v.id] = clonar(v);
    this.guardar();
  }
  /** En la demo cualquiera puede probar el panel de administración. */
  async esAdmin() { return true; }

  async resenasDePedido(pedidoId: string) {
    return this.estado.proveedores.flatMap((p) => p.resenas.filter((r) => r.pedidoId === pedidoId).map((r) => ({ ...r, proveedorId: p.id })));
  }
  async resenar(pedidoId: string, proveedorId: string, datos: DatosResena) {
    validarResena(datos);
    const pedido = this.estado.pedidos.find((x) => x.id === pedidoId);
    if (!pedido || pedido.estado !== 'adjudicado' || !pedido.adjudicados?.includes(proveedorId)) throw new Error('Solo se reseña a un proveedor que ganó el pedido.');
    if ((await this.resenasDePedido(pedidoId)).some((r) => r.proveedorId === proveedorId)) throw new Error('Ya dejaste la reseña de este proveedor.');
    const prov = this.proveedor(proveedorId);
    const comp = this.estado.compradores.find((x) => x.id === pedido.compradorId);
    prov.resenas.unshift({
      ...datos, texto: datos.texto.trim(), pedidoId, proveedorId, fecha: hoy(),
      autor: comp ? `${comp.nombre} ${comp.apellido}` : 'Comprador', empresa: comp?.empresa ?? '',
    });
    this.guardar();
  }

  async indicePrecios() { return { series: seed.series, inflacion: seed.inflacion, meses: seed.meses }; }

  async uso(proveedorId: string) { return { ...this.usoDe(proveedorId) }; }
  async cambiarPlan(proveedorId: string, plan: Proveedor['plan']) {
    this.proveedor(proveedorId).plan = plan;
    this.guardar();
    return 'activo' as const;
  }

  async embudo(proveedorId: string) {
    const enviadas = this.estado.solicitudes.filter((s) => s.proveedorId === proveedorId);
    const aceptadas = enviadas.filter((s) => s.estado === 'aceptada').length;
    const ganadas = this.estado.pedidos.filter((p) => p.adjudicados?.includes(proveedorId)).length;
    // Base histórica ficticia para que el tablero de la demo tenga volumen.
    return { vistas: 342, solicitudes: 14 + enviadas.length, aceptadas: 8 + aceptadas, reuniones: 5 + aceptadas, ganadas: 2 + ganadas };
  }

  async reiniciarDemo() {
    this.estado = inicial();
    this.guardar();
  }

  suscribir(fn: () => void) {
    this.oyentes.add(fn);
    return () => { this.oyentes.delete(fn); };
  }
}
