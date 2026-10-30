import type { Persona, Proveedor, RubroId } from './types';

/**
 * Reputación e insignias del directorio. Todo se calcula con datos que ya están en el perfil:
 * reseñas de compra verificada, verificaciones y certificaciones. Nunca precios.
 */
export const MINIMO_RESENAS = 3;
export const TOP_PROMEDIO = 4.5;
export const TOP_RESENAS = 5;
/** Las reseñas de los últimos 24 meses pesan el doble que las anteriores. */
export const MESES_RECIENTES = 24;
export const PESO_ANTIGUAS = 0.5;
export const COMPARAR_MAX = 4;

const notaDe = (r: Proveedor['resenas'][number]) => (r.entrega + r.calidad + r.facturacion) / 3;

export function promedioPonderado(p: Pick<Proveedor, 'resenas'>, ahora = new Date()) {
  if (!p.resenas.length) return 0;
  const corte = new Date(ahora);
  corte.setMonth(corte.getMonth() - MESES_RECIENTES);
  const limite = corte.toISOString().slice(0, 10);
  let suma = 0;
  let pesos = 0;
  for (const r of p.resenas) {
    const w = r.fecha >= limite ? 1 : PESO_ANTIGUAS;
    suma += notaDe(r) * w;
    pesos += w;
  }
  return suma / pesos;
}

/** El promedio se muestra a partir de 3 reseñas; antes es "proveedor nuevo". */
export const reputacionVisible = (p: Pick<Proveedor, 'resenas'>) => p.resenas.length >= MINIMO_RESENAS;

export type Insignia = 'verificado' | 'top' | 'certificado';
export function insignias(p: Proveedor, ahora = new Date()): Insignia[] {
  const v = p.verificaciones;
  return [
    ...(v.idFiscal && v.mailCorporativo && v.cargoRevisado ? ['verificado' as const] : []),
    ...(p.resenas.length >= TOP_RESENAS && promedioPonderado(p, ahora) >= TOP_PROMEDIO ? ['top' as const] : []),
    ...(p.certificaciones.length ? ['certificado' as const] : []),
  ];
}

export type Orden = 'relevancia' | 'calificacion' | 'resenas' | 'antiguedad';

/** Relevancia: primero quien tiene el rubro buscado, después la calificación ponderada, después la antigüedad. */
export function ordenar(lista: Proveedor[], orden: Orden, rubro?: RubroId, ahora = new Date()): Proveedor[] {
  const nota = (p: Proveedor) => reputacionVisible(p) ? promedioPonderado(p, ahora) : 0;
  const cmp: Record<Orden, (a: Proveedor, b: Proveedor) => number> = {
    relevancia: (a, b) => Number(!!rubro && b.rubros[0] === rubro) - Number(!!rubro && a.rubros[0] === rubro) || nota(b) - nota(a) || a.desde - b.desde,
    calificacion: (a, b) => nota(b) - nota(a) || b.resenas.length - a.resenas.length,
    resenas: (a, b) => b.resenas.length - a.resenas.length,
    antiguedad: (a, b) => a.desde - b.desde,
  };
  return [...lista].sort(cmp[orden]);
}

/** Lo que recorre la búsqueda libre: persona, empresa, ciudad y, en proveedores, lo que ofrecen y sus certificaciones. */
export const textoBuscable = (p: Persona) =>
  [p.nombre, p.apellido, p.empresa, p.cargo, p.ciudad, ...(p.rol === 'proveedor' ? [...p.catalogo, ...p.certificaciones] : [])].join(' ').toLowerCase();
