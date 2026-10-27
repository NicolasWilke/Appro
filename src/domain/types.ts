export type Rol = 'comprador' | 'proveedor';
export type RubroId = 'packaging' | 'frio' | 'mantenimiento' | 'etiquetas' | 'quimicos' | 'cargas' | 'seguridad';
export type RegionId = 'ros' | 'amba' | 'cba' | 'noa' | 'costa';
export type PlanId = 'gratis' | 'pro' | 'empresa';
export type FrecuenciaAvisos = 'inmediato' | 'diario' | 'pausado';
export type EstadoSolicitud = 'pendiente' | 'aceptada' | 'postergada' | 'rechazada';

export interface Rubro { id: RubroId; nombre: string; unidad: string }
export interface Region { id: RegionId; nombre: string }

export interface Verificaciones { idFiscal: boolean; mailCorporativo: boolean; cargoRevisado: boolean }

interface PersonaBase {
  id: string;
  nombre: string;
  apellido: string;
  cargo: string;
  empresa: string;
  idFiscal: string;
  ciudad: string;
  region: RegionId;
  rubros: RubroId[];
  verificaciones: Verificaciones;
  contacto: { email: string; telefono: string };
  /** Foto o logo de la empresa (URL o data URL). */
  logo?: string | null;
}

export interface Comprador extends PersonaBase {
  rol: 'comprador';
  /** ISO yyyy-mm-dd; null si no hay ventana de compra abierta */
  ventanaHasta: string | null;
  foco: string;
  acepta: string;
  noAcepta: string;
  /** 0–100 */
  tasaRespuesta: number;
  /** Cargo y empresa visibles; el nombre se libera al aceptar una solicitud */
  semiAnonimo: boolean;
  circulos: string[];
}

export interface Resena {
  autor: string;
  empresa: string;
  texto: string;
  entrega: number;
  calidad: number;
  facturacion: number;
  fecha: string;
}

export interface Proveedor extends PersonaBase {
  rol: 'proveedor';
  plan: PlanId;
  desde: number;
  empleados: string;
  certificaciones: string[];
  catalogo: string[];
  /** % de cobertura operativa por región */
  cobertura: Partial<Record<RegionId, number>>;
  resenas: Resena[];
  /** Cómo recibe los pedidos de cotización de sus rubros */
  avisos: FrecuenciaAvisos;
}

export type Persona = Comprador | Proveedor;

export interface SolicitudContacto {
  id: string;
  proveedorId: string;
  compradorId: string;
  motivo: string;
  estado: EstadoSolicitud;
  creada: string;
}

export interface PedidoCotizacion {
  id: string;
  compradorId: string;
  titulo: string;
  rubro: RubroId;
  cantidad: number;
  unidad: string;
  entrega: string;
  pago: string;
  zona: string;
  cierre: string;
  estado: 'abierto' | 'adjudicado';
  adjudicadaA?: string;
}

export interface Cotizacion {
  id: string;
  pedidoId: string;
  proveedorId: string;
  precioUnitario: number;
  plazoDias: number;
  pago: string;
  nota: string;
  creada: string;
}

export interface SerieIndice {
  rubro: RubroId;
  item: string;
  unidad: string;
  /** precio mediano del último mes */
  actual: number;
  /** variación % mensual de los últimos 12 meses, del más viejo al más nuevo */
  variaciones: number[];
  muestras: number;
}

export interface Plan {
  id: PlanId;
  nombre: string;
  precioUsd: number;
  solicitudesMes: number;
  /** null = ilimitadas */
  respuestasMes: number | null;
  analitica: boolean;
  destacado: boolean;
  usuarios: number;
}

export interface Uso { solicitudesUsadas: number; respuestasUsadas: number }

export interface Embudo {
  vistas: number;
  solicitudes: number;
  aceptadas: number;
  reuniones: number;
  ganadas: number;
}

/** Lo que la cuenta registrada aporta a la persona de la red. */
export interface DatosCuenta {
  uid: string;
  rol: Rol;
  empresa: string;
  contactoNombre: string;
  categoria: RubroId;
  sector: string;
  ubicacion: string;
  cuit: string;
  logoUrl: string | null;
  email: string;
  telefono: string;
}

export interface FiltroRed { rubro?: RubroId; region?: RegionId; soloVentanaAbierta?: boolean; texto?: string }

export interface MailSaliente {
  id: string;
  para: { nombre: string; email: string };
  asunto: string;
  html: string;
  texto: string;
  tipo: 'pedido' | 'resumen';
  proveedorId: string;
  pedidoIds: string[];
  /** enviado: salió al instante. en-cola: sale en el próximo resumen diario. */
  estado: 'enviado' | 'en-cola';
  creado: string;
}

export type TipoValor = 'hora' | 'unidad' | 'proyecto';
export type FuenteValor = 'cotizaciones' | 'arancel' | 'convenio' | 'estimado';

/** Valor de referencia para un concepto: rango observado, no un precio fijado. */
export interface ValorReferencia {
  id: string;
  rubro: RubroId;
  concepto: string;
  tipo: TipoValor;
  /** Unidad del valor, p. ej. "hora", "kg", "pallet·mes", "por color" */
  unidad: string;
  /** Valor en la unidad del rubro: es el que se usa al cargar un pedido */
  principal?: boolean;
  region: RegionId | 'nacional';
  min: number;
  mediana: number;
  max: number;
  /** Cantidad de observaciones (solo para cotizaciones) */
  muestras?: number;
  fuente?: FuenteValor;
  fuenteDetalle?: string;
  /** yyyy-mm del relevamiento */
  fecha?: string;
}
