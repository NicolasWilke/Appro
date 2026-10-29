import type {
  Comprador, DatosCuenta, FrecuenciaAvisos, MailSaliente, ValorReferencia, Cotizacion, Embudo, EstadoSolicitud, FiltroRed, PedidoCotizacion,
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
  /** Adjudica cada ítem a un proveedor (todos al mismo = adjudicación total). */
  adjudicar(pedidoId: string, asignacion: Record<string, string>, comentario: string): Promise<void>;

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
