import type { EscalaConvenio, Indicador, PuntoSerie } from '@/domain/types';

/**
 * Datos de partida del Centro de referencias, tomados del documento de especificación (relevados a octubre
 * de 2026). Un administrador los actualiza desde /admin/indices; lo cargado en Firestore pisa estos valores.
 * Donde la fuente da solo variaciones, el nivel se reconstruye (base diciembre 2025 = 100) y se aclara en `base`.
 */
const r2 = (n: number) => Math.round(n * 100) / 100;
/** Diciembre 2025, el mes anterior, el último y el mismo mes del año anterior, desde el último nivel y sus variaciones. */
function desdeVariaciones(ultimo: string, nivel: number, mensual: number, acumulado: number, interanual: number | null): PuntoSerie[] {
  const [y, m] = ultimo.split('-').map(Number);
  const anterior = `${y}-${String(m - 1).padStart(2, '0')}`;
  return [
    ...(interanual !== null ? [{ periodo: `${y - 1}-${String(m).padStart(2, '0')}`, valor: r2(nivel / (1 + interanual / 100)) }] : []),
    { periodo: `${y - 1}-12`, valor: r2(nivel / (1 + acumulado / 100)) },
    { periodo: anterior, valor: r2(nivel / (1 + mensual / 100)) },
    { periodo: ultimo, valor: nivel },
  ];
}
/**
 * IPC nacional 2026, hacia atrás desde septiembre con las variaciones mensuales publicadas. Como esas vienen
 * redondeadas a un decimal, se reparte la diferencia para que el acumulado dé exactamente el 23,6 % oficial.
 */
function ipcNacional(): PuntoSerie[] {
  const mensuales = [2.9, 2.9, 3.4, 2.6, 2.1, 1.9, 2.1, 1.7, 1.9];
  const ajuste = (1.236 / mensuales.reduce((a, m) => a * (1 + m / 100), 1)) ** (1 / mensuales.length);
  const serie: PuntoSerie[] = [{ periodo: '2026-09', valor: 12514.15 }];
  for (let i = mensuales.length - 1; i >= 0; i--) {
    serie.unshift({ periodo: i === 0 ? '2025-12' : `2026-${String(i).padStart(2, '0')}`, valor: r2(serie[0].valor / ((1 + mensuales[i] / 100) * ajuste)) });
  }
  return [{ periodo: '2025-09', valor: 9384.09 }, ...serie];
}

const INDEC = (tema: string) => ({ nombre: 'INDEC', url: `https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-5-${tema}` });
const DERIVADO = 'Nivel reconstruido desde las variaciones publicadas (diciembre 2025 = 100)';

export const indicadoresBase: Indicador[] = [
  { id: 'ipc', nombre: 'IPC Nivel General (nacional)', grupo: 'precios', organismo: 'INDEC', unidad: 'puntos', base: 'Diciembre 2016 = 100', fuente: INDEC('31'), proximaPublicacion: '2026-11-12', serie: ipcNacional(), actualizado: '2026-10-15' },
  { id: 'ipc-ba', nombre: 'IPC-BA (Ciudad de Buenos Aires)', grupo: 'precios', organismo: 'IDECBA', unidad: 'puntos', base: '2021 = 100', fuente: { nombre: 'Estadística Ciudad', url: 'https://www.estadisticaciudad.gob.ar' }, nota: 'La referencia más ajustada para servicios contratados en CABA.', serie: [...desdeVariaciones('2026-09', 2644.33, 1.8, 23.7, 32.9).filter((p) => p.periodo !== '2026-08'), { periodo: '2026-08', valor: 2596.6 }].sort((a, b) => a.periodo.localeCompare(b.periodo)), actualizado: '2026-10-15' },
  { id: 'ipim', nombre: 'IPIM (precios internos al por mayor)', grupo: 'precios', organismo: 'INDEC', unidad: 'puntos', base: DERIVADO, fuente: INDEC('32'), proximaPublicacion: '2026-11-17', nota: 'En septiembre los productos nacionales subieron 3,4 % y los importados 0,4 %.', serie: desdeVariaciones('2026-09', 122.8, 3.2, 22.8, 29.2), actualizado: '2026-10-17' },
  { id: 'icc', nombre: 'ICC nivel general (GBA)', grupo: 'construccion', organismo: 'INDEC', unidad: 'puntos', base: DERIVADO, fuente: INDEC('33'), serie: desdeVariaciones('2026-09', 123.9, 1.5, 23.9, 31.3), actualizado: '2026-10-17' },
  { id: 'icc-materiales', nombre: 'ICC materiales', grupo: 'construccion', organismo: 'INDEC', unidad: 'puntos', base: DERIVADO, fuente: INDEC('33'), serie: desdeVariaciones('2026-09', 116.8, 1.3, 16.8, 22.8), actualizado: '2026-10-17' },
  { id: 'icc-mano-obra', nombre: 'ICC mano de obra', grupo: 'construccion', organismo: 'INDEC', unidad: 'puntos', base: DERIVADO, fuente: INDEC('33'), serie: desdeVariaciones('2026-09', 129.6, 1.6, 29.6, 38.7), actualizado: '2026-10-17' },
  { id: 'icc-gastos', nombre: 'ICC gastos generales', grupo: 'construccion', organismo: 'INDEC', unidad: 'puntos', base: DERIVADO, fuente: INDEC('33'), serie: desdeVariaciones('2026-09', 127.2, 1.5, 27.2, 33.6), actualizado: '2026-10-17' },
  { id: 'camarco', nombre: 'CAMARCO costo de construcción (edificio tipo CABA)', grupo: 'construccion', organismo: 'CAMARCO', unidad: 'puntos', fuente: { nombre: 'CAMARCO', url: 'https://www.camarco.org.ar' }, nota: 'Valores provisorios.', serie: desdeVariaciones('2026-09', 23607.5, 2.9, 25.7, null), actualizado: '2026-10-20' },
  { id: 'camarco-materiales', nombre: 'CAMARCO materiales', grupo: 'construccion', organismo: 'CAMARCO', unidad: 'puntos', fuente: { nombre: 'CAMARCO', url: 'https://www.camarco.org.ar' }, nota: 'Valores provisorios.', serie: desdeVariaciones('2026-09', 25714.3, 3.5, 20.5, null), actualizado: '2026-10-20' },
  { id: 'camarco-mano-obra', nombre: 'CAMARCO mano de obra', grupo: 'construccion', organismo: 'CAMARCO', unidad: 'puntos', fuente: { nombre: 'CAMARCO', url: 'https://www.camarco.org.ar' }, nota: 'Valores provisorios.', serie: desdeVariaciones('2026-09', 20519.6, 1.7, 36.6, null), actualizado: '2026-10-20' },
  {
    id: 'vigilador-basico', nombre: 'Vigilador General, básico (CCT 507/07)', grupo: 'salarios', organismo: 'UPSRA – CAESI', unidad: 'mes', fuente: { nombre: 'UPSRA', url: 'https://www.upsra.org.ar' },
    serie: [{ periodo: '2025-12', valor: 833600 }, { periodo: '2026-07', valor: 1001300 }, { periodo: '2026-08', valor: 1020300 }, { periodo: '2026-09', valor: 1037600 }], actualizado: '2026-10-10',
  },
  {
    id: 'vigilador-conformado', nombre: 'Vigilador General, total conformado (CCT 507/07)', grupo: 'salarios', organismo: 'UPSRA – CAESI', unidad: 'mes', fuente: { nombre: 'UPSRA', url: 'https://www.upsra.org.ar' },
    nota: 'Incluye básico, presentismo, viático y suma no remunerativa.', serie: [{ periodo: '2026-07', valor: 1706800 }, { periodo: '2026-08', valor: 1744800 }, { periodo: '2026-09', valor: 1791600 }], actualizado: '2026-10-10',
  },
  {
    id: 'limpieza-oficial', nombre: 'Oficial de limpieza, ingreso conformado (CCT 281/96)', grupo: 'salarios', organismo: 'SOM – ADEL', unidad: 'mes', fuente: { nombre: 'Acta SOM – ADEL del 14/08/2026', url: '' },
    nota: 'Sin asignaciones de integración social ni viáticos. Valores de publicaciones de terceros: contrastar con el acta homologada.',
    serie: [{ periodo: '2026-08', valor: 713464 }, { periodo: '2026-09', valor: 804326 }, { periodo: '2026-10', valor: 814769 }, { periodo: '2026-11', valor: 825406, pactado: true }, { periodo: '2026-12', valor: 866137, pactado: true }], actualizado: '2026-10-10',
  },
  {
    id: 'suterh-encargado', nombre: 'Encargado permanente 1ª sin vivienda (CCT 589/10)', grupo: 'salarios', organismo: 'FATERYH – SUTERH', unidad: 'mes', fuente: { nombre: 'SUTERH', url: 'https://www.suterh.org.ar' },
    serie: [{ periodo: '2026-09', valor: 1452618 }, { periodo: '2026-10', valor: 1504674 }], actualizado: '2026-10-10',
  },
  {
    id: 'uocra-oficial', nombre: 'Oficial UOCRA, Zona A, por hora (CCT 76/75)', grupo: 'salarios', organismo: 'UOCRA', unidad: 'hora', fuente: { nombre: 'UOCRA', url: 'https://www.uocra.org' },
    nota: 'Aumentos de 1,9 % (septiembre), 1,8 % (octubre) y 1,7 % (noviembre), vigentes hasta el 30/11/2026.',
    serie: [{ periodo: '2026-09', valor: r2(6585 / 1.018) }, { periodo: '2026-10', valor: 6585 }, { periodo: '2026-11', valor: 6697, pactado: true }], actualizado: '2026-10-10',
  },
];

export const escalasBase: EscalaConvenio[] = [
  {
    id: 'upsra', actividad: 'Vigilancia y seguridad privada', convenio: 'CCT 507/07 – UPSRA / CAESI', periodo: '2026-09', vigenciaHasta: '2026-12-31', proximaRevision: 'Antes de fin de año, para la pauta desde enero de 2027',
    nota: 'La suma no remunerativa sigue en $60.000 (octubre), $70.000 (noviembre) y $120.000 (diciembre), y pasa al básico desde enero de 2027.',
    fuente: { nombre: 'UPSRA', url: 'https://www.upsra.org.ar' }, actualizado: '2026-10-10',
    categorias: [
      { nombre: 'Vigilador General', basico: 1037600, conformado: 1791600 },
      { nombre: 'Vigilador Principal', basico: 1172100, conformado: 1956800 },
      { nombre: 'Operador de Monitoreo', basico: 1105700, conformado: 1874800 },
      { nombre: 'Instalador de Sistemas Electrónicos', basico: 1172100, conformado: 1956800 },
    ],
  },
  {
    id: 'som', actividad: 'Limpieza', convenio: 'CCT 281/96 – SOM / ADEL', periodo: '2026-10', vigenciaHasta: '2026-12-31',
    nota: 'Con asignaciones de integración social y viáticos, el Oficial de octubre llega a $1.180.726. Contrastar con el acta homologada.',
    fuente: { nombre: 'Acta SOM – ADEL del 14/08/2026', url: '' }, actualizado: '2026-10-10',
    categorias: [{ nombre: 'Oficial (jornada completa)', basico: 558908, conformado: 814769 }],
  },
  {
    id: 'suterh', actividad: 'Mantenimiento de edificios', convenio: 'CCT 589/10 – FATERYH / SUTERH', periodo: '2026-10', vigenciaHasta: '2027-02-28', proximaRevision: 'Paritaria prevista en diciembre de 2026',
    nota: 'Los básicos del convenio van de $619.586 (ayudante temporario, media jornada) a $1.810.032 (Intendente).',
    fuente: { nombre: 'SUTERH', url: 'https://www.suterh.org.ar' }, actualizado: '2026-10-10',
    categorias: [
      { nombre: 'Encargado permanente 1ª, sin vivienda', basico: 1504674, conformado: null },
      { nombre: 'Encargado permanente 1ª, con vivienda', basico: 1316343, conformado: null },
    ],
  },
  {
    id: 'uocra', actividad: 'Construcción y mantenimiento de obra', convenio: 'CCT 76/75 y 577/10 – UOCRA', periodo: '2026-10', vigenciaHasta: '2026-11-30', proximaRevision: 'Reunión prevista para los ajustes desde diciembre',
    nota: 'Valores por hora en Zona A. Las zonas B, C y C-Austral suman adicional por zona desfavorable. En noviembre: Oficial Especializado $7.828, Oficial $6.697, Medio Oficial $6.188, Ayudante $5.696.',
    fuente: { nombre: 'UOCRA', url: 'https://www.uocra.org' }, actualizado: '2026-10-10',
    categorias: [
      { nombre: 'Oficial Especializado', basico: null, conformado: null, hora: 7697 },
      { nombre: 'Oficial', basico: null, conformado: null, hora: 6585 },
      { nombre: 'Medio Oficial', basico: null, conformado: null, hora: 6085 },
      { nombre: 'Ayudante', basico: null, conformado: null, hora: 5601 },
    ],
  },
];
