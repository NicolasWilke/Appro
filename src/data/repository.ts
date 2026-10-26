import type {
  Comprador, DatosCuenta, FrecuenciaAvisos, MailSaliente, ValorReferencia, Cotizacion, Embudo, EstadoSolicitud, FiltroRed, PedidoCotizacion,
  Persona, PlanId, Proveedor, SerieIndice, SolicitudContacto, Uso,
} from '@/domain/types';

export type NuevoPedido = Omit<PedidoCotizacion, 'id' | 'estado' | 'adjudicadaA'>;
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
  sincronizarCuenta(cuenta: DatosCuenta): Promise<Persona>;

  solicitudesRecibidas(compradorId: string): Promise<SolicitudContacto[]>;
  solicitudesEnviadas(proveedorId: string): Promise<SolicitudContacto[]>;
  enviarSolicitud(proveedorId: string, compradorId: string, motivo: string): Promise<SolicitudContacto>;
  responderSolicitud(id: string, estado: Exclude<EstadoSolicitud, 'pendiente'>): Promise<void>;

  listarPedidos(filtro?: { compradorId?: string; rubros?: string[] }): Promise<PedidoCotizacion[]>;
  obtenerPedido(id: string): Promise<PedidoCotizacion | null>;
  publicarPedido(pedido: NuevoPedido): Promise<PedidoCotizacion>;
  cotizacionesDe(pedidoId: string): Promise<Cotizacion[]>;
  cotizar(cotizacion: NuevaCotizacion): Promise<Cotizacion>;
  adjudicar(pedidoId: string, cotizacionId: string): Promise<void>;

  /** A quién le llegó (o le va a llegar) el aviso de un pedido. Solo lo ve quien lo publicó. */
  avisosDePedido(pedidoId: string): Promise<{ proveedorId: string; empresa: string; via: 'mail' | 'resumen' }[]>;
  cambiarAvisos(proveedorId: string, frecuencia: FrecuenciaAvisos): Promise<void>;
  /** Solo demo: mails que el sistema mandó o tiene en cola. En producción los ve el proveedor de mail. */
  bandejaSalida(): Promise<MailSaliente[]>;
  /** Solo demo: dispara el resumen diario que en producción corre un cron a las 8:00. */
  enviarResumenesAhora(): Promise<number>;

  valoresReferencia(): Promise<{ valores: ValorReferencia[]; mesesIso: string[]; inflacion: number[] }>;

  indicePrecios(): Promise<{ series: SerieIndice[]; inflacion: number[]; meses: string[] }>;

  uso(proveedorId: string): Promise<Uso>;
  cambiarPlan(proveedorId: string, plan: PlanId): Promise<void>;
  embudo(proveedorId: string): Promise<Embudo>;

  reiniciarDemo(): Promise<void>;
  /** Notifica cambios para que las vistas se refresquen. En producción: websocket o revalidación. */
  suscribir(fn: () => void): () => void;
}
