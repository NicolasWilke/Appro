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
  /** Pedido adjudicado que respalda la reseña (una por pedido y proveedor ganador) */
  pedidoId?: string;
  proveedorId?: string;
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

/** Un renglón del pedido: lo que el comprador fija y el proveedor no puede cambiar. */
export interface ItemPedido {
  id: string;
  nombre: string;
  /** Descripción técnica (opcional) */
  descripcion: string;
  cantidad: number;
  unidad: string;
}

/** Archivo compartido como enlace (Drive, Dropbox, web): el plan Spark no guarda archivos. */
export interface Enlace { nombre: string; url: string }

export interface PedidoCotizacion {
  id: string;
  compradorId: string;
  titulo: string;
  /** Descripción general (opcional) */
  descripcion: string;
  rubro: RubroId;
  items: ItemPedido[];
  /** Cantidad y unidad del primer ítem: lo usan el índice de precios y los avisos */
  cantidad: number;
  unidad: string;
  entrega: string;
  pago: string;
  zona: string;
  /** Día de cierre, yyyy-mm-dd */
  cierre: string;
  /** Momento exacto de cierre (ISO con zona horaria) */
  cierraEn: string;
  /** Privado: solo lo ven y cotizan los proveedores invitados */
  privado: boolean;
  invitados: string[];
  /** Sobre cerrado: el comprador ve los precios recién después del cierre */
  sobreCerrado: boolean;
  /** Documentos que el proveedor tiene que presentar con su oferta */
  documentos: string[];
  adjuntos: Enlace[];
  /** Cuántas ofertas llegaron (visible aunque los precios estén cerrados) */
  ofertas: number;
  estado: 'abierto' | 'adjudicado';
  /** Proveedor principal adjudicado (el de más ítems ganados) */
  adjudicadaA?: string;
  /** Todos los proveedores con algún ítem adjudicado */
  adjudicados?: string[];
  /** Ítem → proveedor */
  adjudicacion?: Record<string, string>;
  comentarioAdjudicacion?: string;
}

/** Precio de un ítem en una oferta. Descuento e IVA en %. */
export interface ItemCotizado { itemId: string; precioUnitario: number; descuento: number; iva: number }

export interface Cotizacion {
  id: string;
  pedidoId: string;
  proveedorId: string;
  items: ItemCotizado[];
  /** Precio unitario del primer ítem, neto de descuento: lo usan el índice y las vistas resumidas */
  precioUnitario: number;
  plazoDias: number;
  /** Hasta cuándo vale la oferta, yyyy-mm-dd */
  vigencia: string;
  pago: string;
  nota: string;
  adjuntos: Enlace[];
  creada: string;
}

/**
 * Pregunta de un proveedor sobre un pedido. La ven todos los que pueden ver el pedido, sin saber quién
 * preguntó: por eso no se guarda el autor.
 */
export interface Consulta {
  id: string;
  pedidoId: string;
  pregunta: string;
  respuesta: string | null;
  creada: string;
  respondida: string | null;
}

/** Un ítem adjudicado en la red, sin precio ni comprador: lo ven solo los compradores, 90 días. */
export interface Antecedente {
  id: string;
  pedidoId: string;
  itemId: string;
  rubro: RubroId;
  nombre: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  zona: string;
  /** "Industria", "Logística"…: el comprador no se identifica. */
  sectorComprador: string;
  proveedorId: string;
  /** yyyy-mm-dd */
  adjudicado: string;
}

export type EstadoSolicitudValor = 'pendiente' | 'respondida' | 'declinada';
/** Pedido de valor vigente al proveedor que ganó un antecedente. El precio llega solo a quien lo pidió. */
export interface SolicitudValor {
  id: string;
  antecedenteId: string;
  nombre: string;
  unidad: string;
  compradorId: string;
  proveedorId: string;
  cantidad: number;
  mensaje: string;
  estado: EstadoSolicitudValor;
  creada: string;
  precioUnitario: number | null;
  vigencia: string | null;
  nota: string | null;
  respondida: string | null;
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
