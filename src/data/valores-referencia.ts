import type { ValorReferencia } from '@/domain/types';

/*
 * VALORES DE REFERENCIA · los carga el equipo de Proveo.
 *
 * Cómo editar:
 *  - min, mediana y max en pesos, sin IVA, por la unidad indicada. Si están en 0 se muestra "Valor a definir".
 *  - tipo: 'hora' | 'unidad' | 'proyecto'
 *  - region: 'nacional' | 'ros' | 'amba' | 'cba' | 'noa' | 'costa'
 *  - principal: true marca el valor que aparece en el formulario de pedido de ese rubro (uno por rubro y región).
 *  - fuente (opcional): 'cotizaciones' | 'arancel' | 'convenio' | 'estimado', con fuenteDetalle (texto libre) y fecha 'aaaa-mm'.
 *    Con fecha, la sección puede llevar el valor a pesos de hoy por inflación.
 *  - Para agregar un concepto, copiá una línea y cambiá el id (tiene que ser único).
 *
 * En producción esta lista vive en la base de datos y se edita desde un panel de administración.
 */
export const valores: ValorReferencia[] = [
  { id: 'mant-tecnico', rubro: 'mantenimiento', concepto: 'Técnico mecánico matriculado', tipo: 'hora', unidad: 'hora', principal: true, region: 'nacional', min: 0, mediana: 0, max: 0 },
  { id: 'mant-electricista', rubro: 'mantenimiento', concepto: 'Electricista industrial', tipo: 'hora', unidad: 'hora', region: 'nacional', min: 0, mediana: 0, max: 0 },
  { id: 'mant-ingeniero', rubro: 'mantenimiento', concepto: 'Ingeniero de mantenimiento, supervisión', tipo: 'hora', unidad: 'hora', region: 'nacional', min: 0, mediana: 0, max: 0 },
  { id: 'mant-ayudante', rubro: 'mantenimiento', concepto: 'Ayudante de mantenimiento', tipo: 'hora', unidad: 'hora', region: 'nacional', min: 0, mediana: 0, max: 0 },
  { id: 'mant-guardia', rubro: 'mantenimiento', concepto: 'Guardia técnica 24/7', tipo: 'proyecto', unidad: 'mes', region: 'nacional', min: 0, mediana: 0, max: 0 },
  { id: 'pack-film', rubro: 'packaging', concepto: 'Film BOPP/PE laminado impreso', tipo: 'unidad', unidad: 'kg', principal: true, region: 'nacional', min: 0, mediana: 0, max: 0 },
  { id: 'pack-standup', rubro: 'packaging', concepto: 'Bolsa stand-up con zipper', tipo: 'unidad', unidad: 'kg', region: 'nacional', min: 0, mediana: 0, max: 0 },
  { id: 'pack-cilindro', rubro: 'packaging', concepto: 'Cilindro de impresión', tipo: 'proyecto', unidad: 'color', region: 'nacional', min: 0, mediana: 0, max: 0 },
  { id: 'frio-congelado', rubro: 'frio', concepto: 'Posición pallet en cámara −18 °C', tipo: 'unidad', unidad: 'pallet·mes', principal: true, region: 'nacional', min: 0, mediana: 0, max: 0 },
  { id: 'frio-refrigerado', rubro: 'frio', concepto: 'Posición pallet en cámara +2 a +8 °C', tipo: 'unidad', unidad: 'pallet·mes', region: 'nacional', min: 0, mediana: 0, max: 0 },
  { id: 'frio-operario', rubro: 'frio', concepto: 'Operario de depósito con autoelevador', tipo: 'hora', unidad: 'hora', region: 'nacional', min: 0, mediana: 0, max: 0 },
  { id: 'etiq-autoadhesiva', rubro: 'etiquetas', concepto: 'Etiqueta autoadhesiva 10×5 cm, 4 colores', tipo: 'unidad', unidad: 'millar', principal: true, region: 'nacional', min: 0, mediana: 0, max: 0 },
  { id: 'etiq-datamatrix', rubro: 'etiquetas', concepto: 'Etiqueta con código Datamatrix', tipo: 'unidad', unidad: 'millar', region: 'nacional', min: 0, mediana: 0, max: 0 },
  { id: 'etiq-diseno', rubro: 'etiquetas', concepto: 'Diseño y arte por SKU', tipo: 'proyecto', unidad: 'SKU', region: 'nacional', min: 0, mediana: 0, max: 0 },
  { id: 'quim-desengrasante', rubro: 'quimicos', concepto: 'Desengrasante industrial alcalino', tipo: 'unidad', unidad: 'litro', principal: true, region: 'nacional', min: 0, mediana: 0, max: 0 },
  { id: 'quim-intercambiador', rubro: 'quimicos', concepto: 'Limpieza química de intercambiador de calor', tipo: 'proyecto', unidad: 'equipo', region: 'nacional', min: 0, mediana: 0, max: 0 },
  { id: 'carg-km', rubro: 'cargas', concepto: 'Semirremolque, km cargado', tipo: 'unidad', unidad: 'km', principal: true, region: 'nacional', min: 0, mediana: 0, max: 0 },

  // Seguridad privada · CCT 507/07, escala oct-2026 (Disp. DNRyRT 897/2026, vigencia jul–dic 2026).
  // Valor hora del convenio = monto mensual ÷ jornada. Las fuentes publican 192 o 200 h/mes: min usa 200 h, max usa 192 h.
  { id: 'seg-vigilador-basico', rubro: 'seguridad', concepto: 'Vigilador general · salario básico (lo que cobra el trabajador)', tipo: 'hora', unidad: 'hora', region: 'nacional', min: 5266, mediana: 5376, max: 5485, fuente: 'convenio', fuenteDetalle: 'CCT 507/07: básico $1.053.200 ÷ 192–200 h', fecha: '2026-10' },
  { id: 'seg-vigilador-conformado', rubro: 'seguridad', concepto: 'Vigilador general · salario conformado (básico + presentismo + viático + no remunerativo)', tipo: 'hora', unidad: 'hora', region: 'nacional', min: 9136, mediana: 9327, max: 9517, fuente: 'convenio', fuenteDetalle: 'CCT 507/07: total $1.827.200 ÷ 192–200 h', fecha: '2026-10' },
  { id: 'seg-principal-basico', rubro: 'seguridad', concepto: 'Vigilador principal · salario básico', tipo: 'hora', unidad: 'hora', region: 'nacional', min: 5955, mediana: 6079, max: 6203, fuente: 'convenio', fuenteDetalle: 'CCT 507/07: básico $1.191.000 ÷ 192–200 h', fecha: '2026-10' },
  // Precio al cliente: NO verificado. Costo laboral del conformado + contribuciones, ART, SAC y vacaciones (~50% sobre lo remunerativo),
  // más uniforme, supervisión, seguros, gastos de estructura y margen. Reemplazar por cotizaciones reales o pliegos con precio adjudicado.
  { id: 'seg-vigilador-precio', rubro: 'seguridad', concepto: 'Vigilador general · precio por hora que factura la empresa', tipo: 'hora', unidad: 'hora', principal: true, region: 'nacional', min: 14500, mediana: 16500, max: 19500, fuente: 'estimado', fuenteDetalle: 'Estimación sobre costo laboral del convenio, cargas, seguros y margen. Sin IVA', fecha: '2026-10' },
  { id: 'carg-espera', rubro: 'cargas', concepto: 'Hora de espera del chofer', tipo: 'hora', unidad: 'hora', region: 'nacional', min: 0, mediana: 0, max: 0 },
];
