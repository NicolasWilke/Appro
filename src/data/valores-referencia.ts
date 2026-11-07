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
  // Electricista: no hay tarifario B2B público. Estimado sobre el básico UOCRA de noviembre (Oficial Especializado $7.828/h, Zona A)
  // + fondo de cese, cargas, ART, movilidad y margen de una contratista formal. Reemplazar por cotizaciones reales.
  { id: 'mant-electricista', rubro: 'mantenimiento', concepto: 'Electricista industrial matriculado · precio por hora que factura la contratista', tipo: 'hora', unidad: 'hora', region: 'nacional', min: 18000, mediana: 22000, max: 28000, fuente: 'estimado', fuenteDetalle: 'Estimación sobre el básico UOCRA (Oficial Especializado $7.828/h), cargas y margen. Sin IVA', fecha: '2026-11' },
  { id: 'mant-oficial-especializado', rubro: 'mantenimiento', concepto: 'Oficial especializado · salario básico (lo que cobra el trabajador)', tipo: 'hora', unidad: 'hora', region: 'nacional', min: 7828, mediana: 7828, max: 7828, fuente: 'convenio', fuenteDetalle: 'UOCRA CCT 76/75, Zona A, noviembre', fecha: '2026-11' },
  { id: 'mant-ingeniero', rubro: 'mantenimiento', concepto: 'Ingeniero de mantenimiento, supervisión', tipo: 'hora', unidad: 'hora', region: 'nacional', min: 0, mediana: 0, max: 0 },
  { id: 'mant-ayudante', rubro: 'mantenimiento', concepto: 'Ayudante · salario básico (lo que cobra el trabajador)', tipo: 'hora', unidad: 'hora', region: 'nacional', min: 5696, mediana: 5696, max: 5696, fuente: 'convenio', fuenteDetalle: 'UOCRA CCT 76/75, Zona A, noviembre', fecha: '2026-11' },
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

  // Seguridad privada · CCT 507/07, escala nov-2026 (Disp. DNRyRT 897/2026, vigencia jul–dic 2026).
  // Noviembre: básico $1.069.000, presentismo $180.000, viático $545.000, no remunerativo $70.000.
  // Valor hora del convenio = monto mensual ÷ jornada. Las fuentes publican 192 o 200 h/mes: min usa 200 h, max usa 192 h.
  { id: 'seg-vigilador-basico', rubro: 'seguridad', concepto: 'Vigilador general · salario básico (lo que cobra el trabajador)', tipo: 'hora', unidad: 'hora', region: 'nacional', min: 5345, mediana: 5456, max: 5568, fuente: 'convenio', fuenteDetalle: 'CCT 507/07: básico $1.069.000 ÷ 192–200 h', fecha: '2026-11' },
  { id: 'seg-vigilador-conformado', rubro: 'seguridad', concepto: 'Vigilador general · salario conformado (básico + presentismo + viático + no remunerativo)', tipo: 'hora', unidad: 'hora', region: 'nacional', min: 9320, mediana: 9514, max: 9708, fuente: 'convenio', fuenteDetalle: 'CCT 507/07: total $1.864.000 ÷ 192–200 h', fecha: '2026-11' },
  { id: 'seg-principal-basico', rubro: 'seguridad', concepto: 'Vigilador principal · salario básico', tipo: 'hora', unidad: 'hora', region: 'nacional', min: 5955, mediana: 6079, max: 6203, fuente: 'convenio', fuenteDetalle: 'CCT 507/07: básico $1.191.000 ÷ 192–200 h', fecha: '2026-10' },
  // Precio al cliente: NO verificado. Costo laboral del conformado + contribuciones, ART, SAC y vacaciones (~50% sobre lo remunerativo),
  // más uniforme, supervisión, seguros, gastos de estructura y margen. Reemplazar por cotizaciones reales o pliegos con precio adjudicado.
  { id: 'seg-vigilador-precio', rubro: 'seguridad', concepto: 'Vigilador general · precio por hora que factura la empresa', tipo: 'hora', unidad: 'hora', principal: true, region: 'nacional', min: 14500, mediana: 16500, max: 19500, fuente: 'estimado', fuenteDetalle: 'Estimación sobre costo laboral del convenio, cargas, seguros y margen. Sin IVA', fecha: '2026-10' },

  // Limpieza · CCT 281/96 (SOM – ADEL), escala oct-2026. Oficial jornada completa: conformado $1.180.726/mes
  // (básico, presentismo, asignación de integración social, viáticos y no remunerativo) ÷ ~200 h.
  { id: 'limp-operario-conformado', rubro: 'limpieza', concepto: 'Operario de limpieza (Oficial) · salario conformado (lo que cobra el trabajador)', tipo: 'hora', unidad: 'hora', region: 'nacional', min: 5676, mediana: 5904, max: 6150, fuente: 'convenio', fuenteDetalle: 'CCT 281/96: total $1.180.726 ÷ 192–208 h', fecha: '2026-10' },
  // Precio al cliente: NO verificado. Costo laboral (+30–35% de cargas, ART, SAC y vacaciones) × 1,35–1,6 por insumos, supervisión y margen.
  { id: 'limp-operario-precio', rubro: 'limpieza', concepto: 'Operario de limpieza · precio por hora que factura la empresa', tipo: 'hora', unidad: 'hora', principal: true, region: 'nacional', min: 10500, mediana: 11800, max: 13000, fuente: 'estimado', fuenteDetalle: 'Estimación sobre costo laboral del convenio, insumos, supervisión y margen. Sin IVA', fecha: '2026-10' },
  { id: 'limp-final-obra', rubro: 'limpieza', concepto: 'Limpieza final de obra (CABA)', tipo: 'unidad', unidad: 'm²', region: 'amba', min: 4900, mediana: 7800, max: 10700, fuente: 'estimado', fuenteDetalle: 'Precios publicados por Servidos para CABA, mercado minorista. Sin IVA', fecha: '2026-10' },
  { id: 'carg-espera', rubro: 'cargas', concepto: 'Hora de espera del chofer', tipo: 'hora', unidad: 'hora', region: 'nacional', min: 0, mediana: 0, max: 0 },
];
