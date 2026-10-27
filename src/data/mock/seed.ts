import type { Comprador, Cotizacion, PedidoCotizacion, Proveedor, SerieIndice, SolicitudContacto, Uso } from '@/domain/types';

// Personas y empresas ficticias. Cualquier parecido es coincidencia.
const v = { idFiscal: true, mailCorporativo: true, cargoRevisado: true };

export const compradores: Comprador[] = [
  {
    id: 'laura-gimenez', rol: 'comprador', nombre: 'Laura', apellido: 'Giménez', cargo: 'Jefa de Compras',
    empresa: 'Alimentos del Litoral S.A.', idFiscal: '30-71234567-1', ciudad: 'Rosario', region: 'ros',
    rubros: ['packaging', 'frio', 'mantenimiento'], verificaciones: v,
    contacto: { email: 'lgimenez@alimentoslitoral.com.ar', telefono: '+54 341 555-0142' },
    ventanaHasta: '2026-12-15', foco: 'Packaging · volumen anual ARS 80–150 M',
    acepta: 'Cotizaciones vía pedido', noAcepta: 'Llamadas en frío', tasaRespuesta: 82, semiAnonimo: false,
    circulos: ['Compras de alimentos · Litoral', 'Logística refrigerada · Rosario'],
  },
  {
    id: 'martin-ferreyra', rol: 'comprador', nombre: 'Martín', apellido: 'Ferreyra', cargo: 'Gerente de Abastecimiento',
    empresa: 'Metalúrgica Ferreyra Hnos.', idFiscal: '30-70845123-8', ciudad: 'Córdoba', region: 'cba',
    rubros: ['mantenimiento', 'quimicos'], verificaciones: v,
    contacto: { email: 'mferreyra@ferreyrahnos.com.ar', telefono: '+54 351 555-0187' },
    ventanaHasta: '2026-11-30', foco: 'Mantenimiento predictivo de prensas · contrato anual',
    acepta: 'Solicitudes con un caso de referencia', noAcepta: 'Catálogos genéricos', tasaRespuesta: 74, semiAnonimo: false,
    circulos: ['Metalmecánica · Córdoba'],
  },
  {
    id: 'sofia-benitez', rol: 'comprador', nombre: 'Sofía', apellido: 'Benítez', cargo: 'Compradora Senior',
    empresa: 'Laboratorios Andinos S.A.', idFiscal: '30-69876543-3', ciudad: 'CABA', region: 'amba',
    rubros: ['etiquetas', 'packaging'], verificaciones: v,
    contacto: { email: 'sbenitez@labandinos.com.ar', telefono: '+54 11 5555-0123' },
    ventanaHasta: '2027-01-20', foco: 'Etiquetas con trazabilidad para ANMAT',
    acepta: 'Muestras físicas', noAcepta: 'Mensajes por WhatsApp', tasaRespuesta: 68, semiAnonimo: false,
    circulos: ['Compras farma · AMBA'],
  },
  {
    id: 'diego-paz', rol: 'comprador', nombre: 'Diego', apellido: 'Paz', cargo: 'Responsable de Compras',
    empresa: 'Agroinsumos del Norte S.R.L.', idFiscal: '30-71598432-2', ciudad: 'San Miguel de Tucumán', region: 'noa',
    rubros: ['cargas', 'frio'], verificaciones: v,
    contacto: { email: 'dpaz@agronorte.com.ar', telefono: '+54 381 555-0164' },
    ventanaHasta: null, foco: 'Fletes de cosecha · temporada mayo a agosto',
    acepta: 'Pedidos de cotización', noAcepta: 'Visitas sin cita', tasaRespuesta: 91, semiAnonimo: false,
    circulos: ['Agro y logística · NOA'],
  },
  {
    id: 'carolina-ruiz', rol: 'comprador', nombre: 'Carolina', apellido: 'Ruiz', cargo: 'Head of Procurement',
    empresa: 'Retail Sur S.A.', idFiscal: '30-70012345-2', ciudad: 'Mar del Plata', region: 'costa',
    rubros: ['cargas', 'etiquetas', 'seguridad'], verificaciones: v,
    contacto: { email: 'cruiz@retailsur.com.ar', telefono: '+54 223 555-0119' },
    ventanaHasta: '2026-12-10', foco: 'Distribución a 38 sucursales',
    acepta: 'Propuestas con tarifa por zona', noAcepta: 'Llamadas en frío', tasaRespuesta: 77, semiAnonimo: false,
    circulos: ['Retail · Costa Atlántica'],
  },
  {
    id: 'comp-pacheco', rol: 'comprador', nombre: 'Andrea', apellido: 'Villalba', cargo: 'Compradora de Indirectos',
    empresa: 'Terminal automotriz', idFiscal: '30-50001234-6', ciudad: 'General Pacheco', region: 'amba',
    rubros: ['mantenimiento', 'quimicos'], verificaciones: v,
    contacto: { email: 'avillalba@terminal-auto.com.ar', telefono: '+54 11 5555-0177' },
    ventanaHasta: '2026-12-31', foco: 'Homologación de proveedores de servicios',
    acepta: 'Proveedores con ISO 45001', noAcepta: 'Mensajes sin certificaciones', tasaRespuesta: 63, semiAnonimo: true,
    circulos: [],
  },
];

export const proveedores: Proveedor[] = [
  {
    id: 'ramiro-ortiz', rol: 'proveedor', nombre: 'Ramiro', apellido: 'Ortiz', cargo: 'Gerente Comercial',
    empresa: 'Envases Paraná S.R.L.', idFiscal: '30-68123987-8', ciudad: 'Villa Gobernador Gálvez', region: 'ros',
    rubros: ['packaging', 'etiquetas'], verificaciones: v,
    contacto: { email: 'rortiz@envasesparana.com.ar', telefono: '+54 341 555-0198' },
    avisos: 'inmediato', plan: 'pro', desde: 1998, empleados: '80–120',
    certificaciones: ['ISO 9001:2015', 'BRCGS Packaging', 'Habilitación SENASA'],
    catalogo: ['Film BOPP impreso hasta 8 colores', 'Laminados para snacks y galletitas', 'Bolsas stand-up con zipper'],
    cobertura: { ros: 100, amba: 80, cba: 60, costa: 35, noa: 20 },
    resenas: [
      { autor: 'Sofía Benítez', empresa: 'Laboratorios Andinos', texto: 'Cumplieron 21 días de entrega aun con un cambio de arte a mitad de camino. Facturación prolija.', entrega: 5, calidad: 5, facturacion: 4, fecha: '2026-08-12' },
      { autor: 'Laura Giménez', empresa: 'Alimentos del Litoral', texto: 'Buen precio en volumen. La primera tirada tuvo diferencias de color que corrigieron sin costo.', entrega: 4, calidad: 4, facturacion: 5, fecha: '2026-05-03' },
    ],
  },
  {
    id: 'valeria-mendez', rol: 'proveedor', nombre: 'Valeria', apellido: 'Méndez', cargo: 'Directora Comercial',
    empresa: 'FrioSur Logística S.A.', idFiscal: '30-71011223-8', ciudad: 'Rosario', region: 'ros',
    rubros: ['frio', 'cargas'], verificaciones: v,
    contacto: { email: 'vmendez@friosur.com.ar', telefono: '+54 341 555-0133' },
    avisos: 'inmediato', plan: 'empresa', desde: 2009, empleados: '200–250',
    certificaciones: ['Habilitación SENASA', 'ISO 22000', 'Seguro de carga refrigerada'],
    catalogo: ['Cámaras de −18 °C a +4 °C', 'Cross-docking refrigerado', 'Distribución última milla con frío'],
    cobertura: { ros: 100, cba: 70, amba: 65, noa: 30 },
    resenas: [
      { autor: 'Diego Paz', empresa: 'Agroinsumos del Norte', texto: 'Trazabilidad de temperatura por pallet en tiempo real. Respondieron un reclamo en 2 horas.', entrega: 5, calidad: 5, facturacion: 5, fecha: '2026-07-21' },
    ],
  },
  {
    id: 'javier-sosa', rol: 'proveedor', nombre: 'Javier', apellido: 'Sosa', cargo: 'Socio Gerente',
    empresa: 'Tecnomant Industrial S.R.L.', idFiscal: '30-70456789-4', ciudad: 'Córdoba', region: 'cba',
    rubros: ['mantenimiento'], verificaciones: v,
    contacto: { email: 'jsosa@tecnomant.com.ar', telefono: '+54 351 555-0102' },
    avisos: 'diario', plan: 'pro', desde: 2012, empleados: '30–50',
    certificaciones: ['ISO 45001', 'Matrícula CIEC', 'Termografía nivel II'],
    catalogo: ['Mantenimiento preventivo de prensas', 'Análisis de vibraciones', 'Guardias técnicas 24/7'],
    cobertura: { cba: 100, ros: 55, amba: 40 },
    resenas: [
      { autor: 'Martín Ferreyra', empresa: 'Metalúrgica Ferreyra Hnos.', texto: 'Bajamos paradas no programadas un 30% en el primer semestre. Los informes llegan a tiempo.', entrega: 5, calidad: 4, facturacion: 4, fecha: '2026-06-30' },
    ],
  },
  {
    id: 'lucia-romero', rol: 'proveedor', nombre: 'Lucía', apellido: 'Romero', cargo: 'Ejecutiva de Cuentas',
    empresa: 'Etiquetas del Plata S.A.', idFiscal: '30-71777666-2', ciudad: 'La Plata', region: 'amba',
    rubros: ['etiquetas'], verificaciones: v,
    contacto: { email: 'lromero@etiquetasdelplata.com.ar', telefono: '+54 221 555-0156' },
    avisos: 'inmediato', plan: 'gratis', desde: 2004, empleados: '50–80',
    certificaciones: ['FSC', 'ISO 9001:2015'],
    catalogo: ['Autoadhesivas con Datamatrix', 'Etiquetas termocontraíbles', 'Impresión variable'],
    cobertura: { amba: 100, costa: 60, ros: 45 },
    resenas: [],
  },
  {
    id: 'pablo-aguirre', rol: 'proveedor', nombre: 'Pablo', apellido: 'Aguirre', cargo: 'Gerente de Operaciones',
    empresa: 'Pampa Fría Transportes', idFiscal: '30-70333444-6', ciudad: 'Bahía Blanca', region: 'costa',
    rubros: ['frio', 'cargas'], verificaciones: v,
    contacto: { email: 'paguirre@pampafria.com.ar', telefono: '+54 291 555-0171' },
    avisos: 'diario', plan: 'gratis', desde: 2015, empleados: '40–60',
    certificaciones: ['Habilitación SENASA'],
    catalogo: ['Semirremolques refrigerados', 'Cargas completas Sur–Centro'],
    cobertura: { costa: 100, amba: 70, ros: 50, cba: 30 },
    resenas: [],
  },
  {
    id: 'gustavo-lopez', rol: 'proveedor', nombre: 'Gustavo', apellido: 'López', cargo: 'Jefe de Ventas',
    empresa: 'Flexibles Mitre S.A.', idFiscal: '30-69222111-3', ciudad: 'Pilar', region: 'amba',
    rubros: ['packaging'], verificaciones: v,
    contacto: { email: 'glopez@flexiblesmitre.com.ar', telefono: '+54 230 555-0149' },
    avisos: 'diario', plan: 'pro', desde: 2001, empleados: '150–200',
    certificaciones: ['ISO 9001:2015', 'ISO 14001'],
    catalogo: ['Laminados alta barrera', 'Film compostable', 'Pouches retort'],
    cobertura: { amba: 100, ros: 75, cba: 50, costa: 40 },
    resenas: [
      { autor: 'Carolina Ruiz', empresa: 'Retail Sur', texto: 'Muy buena calidad. Exigen 50% de anticipo, conviene saberlo antes.', entrega: 4, calidad: 5, facturacion: 3, fecha: '2026-04-18' },
    ],
  },
  {
    id: 'hernan-quiroga', rol: 'proveedor', nombre: 'Hernán', apellido: 'Quiroga', cargo: 'Gerente Comercial',
    empresa: 'Guardia Paraná Seguridad S.A.', idFiscal: '30-71456321-8', ciudad: 'Rosario', region: 'ros',
    rubros: ['seguridad'], verificaciones: v,
    contacto: { email: 'hquiroga@guardiaparana.com.ar', telefono: '+54 341 555-0125' },
    avisos: 'inmediato', plan: 'pro', desde: 2006, empleados: '300–400',
    certificaciones: ['Habilitación provincial de agencia de seguridad', 'ISO 9001:2015', 'Seguro de responsabilidad civil'],
    catalogo: ['Vigilancia física 24 h en plantas y depósitos', 'Control de accesos y rondas con registro digital', 'Monitoreo de alarmas y CCTV'],
    cobertura: { ros: 100, cba: 40, amba: 30 },
    resenas: [
      { autor: 'Laura Giménez', empresa: 'Alimentos del Litoral', texto: 'Cubrieron dos ausencias el mismo turno sin que lo tuviéramos que pedir. El informe de rondas llega todos los lunes.', entrega: 5, calidad: 4, facturacion: 5, fecha: '2026-09-02' },
    ],
  },
  {
    id: 'mariela-funes', rol: 'proveedor', nombre: 'Mariela', apellido: 'Funes', cargo: 'Directora de Operaciones',
    empresa: 'Resguardo Pampeano S.R.L.', idFiscal: '30-70987654-2', ciudad: 'Avellaneda', region: 'amba',
    rubros: ['seguridad'], verificaciones: v,
    contacto: { email: 'mfunes@resguardopampeano.com.ar', telefono: '+54 11 5555-0138' },
    avisos: 'diario', plan: 'gratis', desde: 2014, empleados: '120–180',
    certificaciones: ['Habilitación provincial de agencia de seguridad', 'Seguro de responsabilidad civil'],
    catalogo: ['Vigiladores para centros logísticos', 'Custodia de mercadería en tránsito', 'Seguridad en eventos'],
    cobertura: { amba: 100, costa: 50 },
    resenas: [],
  },
  {
    id: 'dario-ledesma', rol: 'proveedor', nombre: 'Darío', apellido: 'Ledesma', cargo: 'Socio Gerente',
    empresa: 'Atalaya Mediterránea S.A.', idFiscal: '30-71222333-9', ciudad: 'Córdoba', region: 'cba',
    rubros: ['seguridad'], verificaciones: v,
    contacto: { email: 'dledesma@atalayamed.com.ar', telefono: '+54 351 555-0191' },
    avisos: 'inmediato', plan: 'empresa', desde: 2001, empleados: '500–700',
    certificaciones: ['Habilitación provincial de agencia de seguridad', 'ISO 9001:2015', 'ISO 45001'],
    catalogo: ['Vigilancia industrial con vigiladores bomberos', 'Centro de monitoreo propio 24/7', 'Análisis de riesgo de instalaciones'],
    cobertura: { cba: 100, ros: 60, noa: 45 },
    resenas: [
      { autor: 'Martín Ferreyra', empresa: 'Metalúrgica Ferreyra Hnos.', texto: 'Buen servicio y supervisión en planta. La tarifa es más alta que la media, pero incluye vigilador bombero.', entrega: 5, calidad: 5, facturacion: 4, fecha: '2026-07-14' },
    ],
  },
];

export const solicitudes: SolicitudContacto[] = [
  { id: 'sol-1', proveedorId: 'valeria-mendez', compradorId: 'laura-gimenez', estado: 'pendiente', creada: '2026-10-23',
    motivo: 'Tenemos 40 posiciones libres a −18 °C en Pérez desde noviembre, a 12 km de su planta. Trabajamos con dos alimenticias del Litoral y podemos mostrar trazabilidad de temperatura por pallet.' },
  { id: 'sol-2', proveedorId: 'javier-sosa', compradorId: 'laura-gimenez', estado: 'pendiente', creada: '2026-10-22',
    motivo: 'Hacemos mantenimiento predictivo de líneas de envasado. Bajamos 30% las paradas no programadas en Ferreyra Hnos. Propongo un diagnóstico de vibraciones sin cargo en una línea.' },
  { id: 'sol-3', proveedorId: 'pablo-aguirre', compradorId: 'laura-gimenez', estado: 'pendiente', creada: '2026-10-20',
    motivo: 'Transporte refrigerado Rosario–Bahía Blanca con salidas dos veces por semana. Si distribuyen hacia el sur, podemos consolidar carga parcial y bajar el costo por pallet.' },
  { id: 'sol-4', proveedorId: 'gustavo-lopez', compradorId: 'laura-gimenez', estado: 'aceptada', creada: '2026-10-02',
    motivo: 'Laminados de alta barrera para galletitas con 20% menos de espesor y la misma vida útil. Podemos enviar muestras para una prueba en su línea.' },
  { id: 'sol-5', proveedorId: 'ramiro-ortiz', compradorId: 'sofia-benitez', estado: 'aceptada', creada: '2026-09-15',
    motivo: 'Imprimimos etiquetas con Datamatrix validadas para trazabilidad ANMAT. Hoy abastecemos a dos laboratorios de AMBA.' },
  { id: 'sol-6', proveedorId: 'ramiro-ortiz', compradorId: 'carolina-ruiz', estado: 'pendiente', creada: '2026-10-19',
    motivo: 'Bolsas stand-up con zipper para marca propia. Podemos producir lotes desde 5.000 unidades con entrega en Mar del Plata en 15 días.' },
  { id: 'sol-7', proveedorId: 'ramiro-ortiz', compradorId: 'martin-ferreyra', estado: 'rechazada', creada: '2026-09-28',
    motivo: 'Film stretch y embalaje para piezas metálicas, con entrega semanal en Córdoba.' },
];

export const pedidos: PedidoCotizacion[] = [
  { id: 'PC-2611', compradorId: 'laura-gimenez', titulo: 'Film laminado BOPP/PE impreso para galletitas', rubro: 'packaging',
    cantidad: 12000, unidad: 'kg', entrega: 'En planta Rosario, 30 días', pago: '60 días fecha factura', zona: 'Rosario', cierre: '2026-11-08', estado: 'abierto' },
  { id: 'PC-2607', compradorId: 'laura-gimenez', titulo: 'Cámara de frío −18 °C, 40 posiciones pallet', rubro: 'frio',
    cantidad: 40, unidad: 'posiciones pallet/mes', entrega: 'Desde el 1/12, contrato de 6 meses', pago: '30 días fecha factura', zona: 'Gran Rosario', cierre: '2026-11-04', estado: 'abierto' },
  { id: 'PC-2598', compradorId: 'martin-ferreyra', titulo: 'Mantenimiento preventivo de 6 prensas hidráulicas', rubro: 'mantenimiento',
    cantidad: 480, unidad: 'horas técnico', entrega: 'Contrato anual, visitas quincenales', pago: '30 días fecha factura', zona: 'Córdoba', cierre: '2026-11-15', estado: 'abierto' },
  { id: 'PC-2615', compradorId: 'sofia-benitez', titulo: 'Etiquetas autoadhesivas 10×5 cm con Datamatrix', rubro: 'etiquetas',
    cantidad: 600, unidad: 'millares', entrega: 'Entregas mensuales en CABA', pago: '60 días fecha factura', zona: 'AMBA', cierre: '2026-11-20', estado: 'abierto' },
  { id: 'PC-2619', compradorId: 'carolina-ruiz', titulo: 'Bolsas stand-up con zipper para marca propia', rubro: 'packaging',
    cantidad: 3500, unidad: 'kg', entrega: 'Mar del Plata, 20 días', pago: '30 días fecha factura', zona: 'Costa Atlántica', cierre: '2026-11-12', estado: 'abierto' },
  { id: 'PC-2617', compradorId: 'carolina-ruiz', titulo: 'Vigilancia 24 h para centro de distribución, 1 puesto', rubro: 'seguridad',
    cantidad: 744, unidad: 'horas vigilador', entrega: 'Mensual, desde el 1/12, contrato de 12 meses', pago: '30 días fecha factura', zona: 'Mar del Plata', cierre: '2026-11-18', estado: 'abierto' },
];

export const cotizaciones: Cotizacion[] = [
  { id: 'c-1', pedidoId: 'PC-2611', proveedorId: 'gustavo-lopez', precioUnitario: 6420, plazoDias: 28, pago: '30 días fecha factura', nota: 'Requiere 50% de anticipo en la primera orden.', creada: '2026-10-21' },
  { id: 'c-2', pedidoId: 'PC-2611', proveedorId: 'ramiro-ortiz', precioUnitario: 6850, plazoDias: 21, pago: '60 días fecha factura', nota: 'Incluye cilindros de impresión.', creada: '2026-10-22' },
  { id: 'c-3', pedidoId: 'PC-2607', proveedorId: 'valeria-mendez', precioUnitario: 40200, plazoDias: 7, pago: '30 días fecha factura', nota: 'Monitoreo de temperatura incluido.', creada: '2026-10-23' },
  { id: 'c-4', pedidoId: 'PC-2607', proveedorId: 'pablo-aguirre', precioUnitario: 45800, plazoDias: 10, pago: '30 días fecha factura', nota: 'Cámara en Pérez, a confirmar disponibilidad.', creada: '2026-10-23' },
  { id: 'c-5', pedidoId: 'PC-2598', proveedorId: 'javier-sosa', precioUnitario: 27100, plazoDias: 15, pago: '30 días fecha factura', nota: 'Incluye informe mensual de vibraciones.', creada: '2026-10-20' },
  { id: 'c-7', pedidoId: 'PC-2617', proveedorId: 'mariela-funes', precioUnitario: 15900, plazoDias: 10, pago: '30 días fecha factura', nota: 'Incluye supervisor móvil y rondas con registro digital.', creada: '2026-10-23' },
  { id: 'c-6', pedidoId: 'PC-2615', proveedorId: 'lucia-romero', precioUnitario: 19800, plazoDias: 12, pago: '60 días fecha factura', nota: '', creada: '2026-10-22' },
];

export const usos: Record<string, Uso> = {
  'ramiro-ortiz': { solicitudesUsadas: 17, respuestasUsadas: 9 },
  'lucia-romero': { solicitudesUsadas: 2, respuestasUsadas: 1 },
  'pablo-aguirre': { solicitudesUsadas: 3, respuestasUsadas: 1 },
};

// Datos ilustrativos. En producción el índice se arma con las cotizaciones
// reales (anonimizadas, mínimo de muestras por celda) y el IPC del INDEC.
export const meses = ['oct-25', 'nov-25', 'dic-25', 'ene-26', 'feb-26', 'mar-26', 'abr-26', 'may-26', 'jun-26', 'jul-26', 'ago-26', 'sep-26', 'oct-26'];
export const inflacion = [2.5, 2.8, 2.3, 2.4, 3.1, 2.6, 2.0, 1.9, 2.1, 2.0, 1.8, 2.2];

export const series: SerieIndice[] = [
  { rubro: 'packaging', item: 'Film BOPP/PE laminado impreso', unidad: 'ARS/kg', actual: 6600, variaciones: [3.0, 3.4, 2.1, 1.8, 2.6, 2.2, 1.5, 1.2, 2.4, 1.9, 1.4, 1.6], muestras: 212 },
  { rubro: 'frio', item: 'Posición pallet en cámara −18 °C', unidad: 'ARS/pallet·mes', actual: 41500, variaciones: [2.8, 3.6, 2.9, 2.7, 3.4, 3.0, 2.6, 2.4, 2.5, 2.3, 2.4, 2.6], muestras: 138 },
  { rubro: 'mantenimiento', item: 'Hora técnico mecánico matriculado', unidad: 'ARS/hora', actual: 28400, variaciones: [2.0, 4.5, 1.0, 1.5, 5.0, 1.2, 1.0, 3.8, 1.1, 1.0, 3.5, 1.4], muestras: 97 },
  { rubro: 'etiquetas', item: 'Etiqueta autoadhesiva 10×5 cm, 4 colores', unidad: 'ARS/millar', actual: 18900, variaciones: [2.2, 2.0, 1.9, 2.1, 2.4, 2.0, 1.6, 1.5, 1.8, 1.7, 1.5, 1.9], muestras: 121 },
  { rubro: 'quimicos', item: 'Desengrasante industrial alcalino', unidad: 'ARS/litro', actual: 3150, variaciones: [3.5, 2.9, 2.4, 2.0, 1.6, 1.4, 1.2, 1.5, 1.9, 2.1, 1.7, 1.5], muestras: 64 },
  { rubro: 'cargas', item: 'Semirremolque, tarifa por km cargado', unidad: 'ARS/km', actual: 2480, variaciones: [2.9, 3.1, 2.6, 2.8, 3.3, 2.7, 2.2, 2.0, 2.3, 2.4, 2.1, 2.5], muestras: 176 },
];

export const mesesIso = ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];

export { valores } from '../valores-referencia';
