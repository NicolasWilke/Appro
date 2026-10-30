import type {
  Antecedente, Comprador, Consulta, DatosCuenta, SolicitudValor, FrecuenciaAvisos, MailSaliente, ValorReferencia, Cotizacion, Embudo, EstadoSolicitud, FiltroRed, PedidoCotizacion,
  Persona, PlanId, Proveedor, Resena, SerieIndice, SolicitudContacto, Uso,
} from '@/domain/types';
import type { DatosResena } from '@/domain/resenas';

export type NuevoPedido = Omit<PedidoCotizacion, 'id' | 'estado' | 'ofertas' | 'adjudicadaA' | 'adjudicados' | 'adjudicacion' | 'comentarioAdjudicacion'>;
export type NuevaCotizacion = Omit<Cotizacion, 'id' | 'creada'>;

/**
 * Contrato único entre la interfaz y los datos. La demo usa MockRepository;
 * producción implementa lo mismo contra la API (ver http/HttpRepository.ts).
 * Las pantallas no saben cuál de las dos está detrás.
 */
export interface Repository {
  listarCompradores(filtro?: FiltroRed): Promise<Comprador[]>;
  listarProveedores(filtro?: FiltroRed): Promise<Proveedor[]>;
  obtenerPersona(id: string): Promise<Persona | null>;
  /** Crea o actualiza la persona de la red que corresponde a una cuenta registrada (mismo id). */
  sincronizarCuenta(cuenta: DatosCuenta): Promise<unknown>;

  solicitudesRecibidas(compradorId: string): Promise<SolicitudContacto[]>;
  solicitudesEnviadas(proveedorId: string): Promise<SolicitudContacto[]>;
  enviarSolicitud(proveedorId: string, compradorId: string, motivo: string): Promise<SolicitudContacto>;
  responderSolicitud(id: string, estado: Exclude<EstadoSolicitud, 'pendiente'>): Promise<void>;

  /**
   * Pedidos visibles para quien consulta: los propios (compradorId), o los públicos de esos rubros
   * más los privados a los que lo invitaron (rubros). Un pedido privado no aparece para el resto.
   * `visorId` es quien mira (Firestore lo toma de la sesión; la demo lo necesita explícito).
   */
  listarPedidos(filtro?: { compradorId?: string; rubros?: string[]; visorId?: string }): Promise<PedidoCotizacion[]>;
  obtenerPedido(id: string): Promise<PedidoCotizacion | null>;
  publicarPedido(pedido: NuevoPedido): Promise<PedidoCotizacion>;
  /**
   * El comprador ve todas las ofertas de su pedido (con sobre cerrado, recién después del cierre);
   * un proveedor, solo la suya.
   */
  cotizacionesDe(pedidoId: string): Promise<Cotizacion[]>;
  cotizar(cotizacion: NuevaCotizacion): Promise<Cotizacion>;
  /**
   * Adjudica cada ítem a un proveedor (todos al mismo = adjudicación total). Con `listar`, cada ítem
   * queda 90 días en Compras recientes, sin precio ni nombre del comprador.
   */
  adjudicar(pedidoId: string, asignacion: Record<string, string>, comentario: string, listar?: boolean): Promise<void>;

  /** Compras recientes de la red (últimos 90 días). Solo para compradores. */
  antecedentes(): Promise<Antecedente[]>;
  solicitarValor(antecedenteId: string, compradorId: string, cantidad: number, mensaje: string): Promise<SolicitudValor>;
  /** Las que pidió un comprador o las que recibió un proveedor. */
  solicitudesValor(filtro: { compradorId?: string; proveedorId?: string }): Promise<SolicitudValor[]>;
  /** El proveedor informa su valor vigente (o declina, con precio null). */
  responderValor(id: string, respuesta: { precioUnitario: number; vigencia: string; nota: string } | null): Promise<void>;

  /** Preguntas y respuestas del pedido, sin el autor. Las ve todo el que puede ver el pedido. */
  consultasDe(pedidoId: string): Promise<Consulta[]>;
  /** Un proveedor que puede cotizar pregunta, mientras el pedido recibe ofertas. */
  preguntar(pedidoId: string, pregunta: string, proveedorId: string): Promise<Consulta>;
  /** Solo el comprador del pedido, una vez por consulta. */
  responderConsulta(pedidoId: string, consultaId: string, respuesta: string): Promise<void>;

  /** Proveedores favoritos de un comprador, para invitarlos rápido a pedidos privados. */
  favoritos(compradorId: string): Promise<string[]>;
  marcarFavorito(compradorId: string, proveedorId: string, favorito: boolean): Promise<void>;

  /** A quién le llegó (o le va a llegar) el aviso de un pedido. Solo lo ve quien lo publicó. */
  avisosDePedido(pedidoId: string): Promise<{ proveedorId: string; empresa: string; via: 'mail' | 'resumen' }[]>;
  cambiarAvisos(proveedorId: string, frecuencia: FrecuenciaAvisos): Promise<void>;
  /** Solo demo: mails que el sistema mandó o tiene en cola. En producción los ve el proveedor de mail. */
  bandejaSalida(): Promise<MailSaliente[]>;
  /** Solo demo: dispara el resumen diario que en producción corre un cron a las 8:00. */
  enviarResumenesAhora(): Promise<number>;

  valoresReferencia(): Promise<{ valores: ValorReferencia[]; mesesIso: string[]; inflacion: number[] }>;
  /** Solo administradores: cambia un valor de referencia. */
  guardarValor(valor: ValorReferencia): Promise<void>;
  /** Si la cuenta puede editar los valores de referencia. */
  esAdmin(uid: string): Promise<boolean>;

  /** Las reseñas que el comprador dejó en un pedido adjudicado: una por proveedor ganador. */
  resenasDePedido(pedidoId: string): Promise<Resena[]>;
  resenar(pedidoId: string, proveedorId: string, datos: DatosResena): Promise<void>;

  indicePrecios(): Promise<{ series: SerieIndice[]; inflacion: number[]; meses: string[] }>;

  uso(proveedorId: string): Promise<Uso>;
  /** 'activo': se aplicó ya (demo). 'solicitado': lo activa el equipo al confirmar el cobro. */
  cambiarPlan(proveedorId: string, plan: PlanId): Promise<'activo' | 'solicitado'>;
  embudo(proveedorId: string): Promise<Embudo>;

  reiniciarDemo(): Promise<void>;
  /** Notifica cambios para que las vistas se refresquen. En producción: websocket o revalidación. */
  suscribir(fn: () => void): () => void;
}
