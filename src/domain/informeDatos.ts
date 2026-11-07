import { REGIONES, RUBROS } from './catalogos';

/**
 * Versión para leer (e imprimir o guardar como PDF) de la copia de "Mis datos".
 * Recorre todo el objeto, así no se pierde ningún campo respecto del .json: solo cambia cómo se ve.
 */

const ETIQUETAS: Record<string, string> = {
  exportado: 'Fecha de la copia',
  usuario: 'Usuario',
  miembroDeEquipo: 'Miembro del equipo',
  perfil: 'Perfil de la cuenta',
  contacto: 'Datos de contacto',
  enLaRed: 'Cómo aparecés en la red',
  solicitudesDeContacto: 'Solicitudes de contacto',
  pedidosDeCotizacion: 'Pedidos de cotización',
  proveedoresFavoritos: 'Proveedores favoritos',
  pedidosDeValor: 'Pedidos de valor de referencia',
  uid: 'Identificador',
  id: 'Identificador',
  rol: 'Rol',
  empresa: 'Empresa',
  contactoNombre: 'Nombre de contacto',
  categoria: 'Rubro',
  sector: 'Sector',
  ubicacion: 'Ubicación',
  cuit: 'CUIT',
  idFiscal: 'CUIT',
  logoUrl: 'Logo',
  logo: 'Logo',
  email: 'Email',
  telefono: 'Teléfono',
  nombre: 'Nombre',
  apellido: 'Apellido',
  cargo: 'Cargo',
  ciudad: 'Ciudad',
  region: 'Región',
  rubro: 'Rubro',
  rubros: 'Rubros',
  verificaciones: 'Verificaciones',
  mailCorporativo: 'Mail corporativo',
  cargoRevisado: 'Cargo revisado',
  ventanaHasta: 'Ventana de compra hasta',
  foco: 'Foco de compra',
  acepta: 'Acepta',
  noAcepta: 'No acepta',
  tasaRespuesta: 'Tasa de respuesta (%)',
  semiAnonimo: 'Perfil semi-anónimo',
  circulos: 'Círculos',
  plan: 'Plan',
  desde: 'En actividad desde',
  empleados: 'Empleados',
  certificaciones: 'Certificaciones',
  catalogo: 'Catálogo',
  cobertura: 'Cobertura por región (%)',
  resenas: 'Reseñas',
  avisos: 'Avisos de pedidos',
  autor: 'Autor',
  texto: 'Texto',
  entrega: 'Entrega',
  calidad: 'Calidad',
  facturacion: 'Facturación',
  fecha: 'Fecha',
  pedidoId: 'Pedido',
  proveedorId: 'Proveedor',
  compradorId: 'Comprador',
  antecedenteId: 'Antecedente',
  motivo: 'Motivo',
  estado: 'Estado',
  creada: 'Creada',
  reunion: 'Hubo reunión',
  titulo: 'Título',
  descripcion: 'Descripción',
  items: 'Ítems',
  cantidad: 'Cantidad',
  unidad: 'Unidad',
  pago: 'Condición de pago',
  zona: 'Zona',
  cierre: 'Cierre',
  cierraEn: 'Cierra el',
  privado: 'Privado',
  invitados: 'Invitados',
  sobreCerrado: 'Sobre cerrado',
  documentos: 'Documentos pedidos',
  adjuntos: 'Adjuntos',
  url: 'Enlace',
  moneda: 'Moneda',
  ofertas: 'Ofertas recibidas',
  adjudicadaA: 'Adjudicado a',
  adjudicados: 'Proveedores adjudicados',
  adjudicacion: 'Adjudicación por ítem',
  comentarioAdjudicacion: 'Comentario de adjudicación',
  mensaje: 'Mensaje',
  precioUnitario: 'Precio unitario',
  vigencia: 'Vigencia',
  nota: 'Nota',
  respondida: 'Respondida',
};

/** "noAcepta" → "No acepta", para campos que todavía no tienen etiqueta. */
const humanizar = (k: string) => {
  const s = k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};
export const etiqueta = (k: string) => ETIQUETAS[k] ?? humanizar(k);

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const DIA = /^\d{4}-\d{2}-\d{2}$/;
const MOMENTO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const nombreRubro = (id: string) => RUBROS.find((r) => r.id === id)?.nombre ?? id;
const nombreRegion = (id: string) => REGIONES.find((r) => r.id === id)?.nombre ?? id;

/** Un valor simple, ya escapado. La clave sirve para traducir rubros y regiones. */
export function valorSimple(v: string | number | boolean | null | undefined, clave = ''): string {
  if (v == null || v === '') return '<span class="vacio">—</span>';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (typeof v === 'number') return esc(v.toLocaleString('es-AR'));
  if (clave === 'logo' || clave === 'logoUrl') return v.startsWith('data:') ? 'Imagen cargada' : `<a href="${esc(v)}">${esc(v)}</a>`;
  if (['rubro', 'rubros', 'categoria'].includes(clave)) return esc(nombreRubro(v));
  if (clave === 'region') return esc(nombreRegion(v));
  if (DIA.test(v)) {
    const [y, m, d] = v.split('-');
    return `${d}/${m}/${y}`;
  }
  if (MOMENTO.test(v)) {
    const f = new Date(v);
    if (!Number.isNaN(f.getTime())) return esc(f.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Argentina/Buenos_Aires' }));
  }
  if (/^https?:\/\//.test(v)) return `<a href="${esc(v)}">${esc(v)}</a>`;
  return esc(v).replace(/\n/g, '<br>');
}

type Valor = unknown;
const esSimple = (v: Valor) => v == null || ['string', 'number', 'boolean'].includes(typeof v);

function bloque(v: Valor, clave: string, nivel: number): string {
  if (esSimple(v)) return valorSimple(v as string | number | boolean | null, clave);
  if (Array.isArray(v)) {
    if (v.length === 0) return '<span class="vacio">Ninguno</span>';
    if (v.every(esSimple)) return v.map((x) => valorSimple(x as string, clave)).join(', ');
    return v.map((x, i) => `<div class="tarjeta"><div class="num">${i + 1} de ${v.length}</div>${bloque(x, clave, nivel + 1)}</div>`).join('');
  }
  const entradas = Object.entries(v as Record<string, Valor>);
  if (entradas.length === 0) return '<span class="vacio">—</span>';
  // Mapas cuyo índice es una región (cobertura) se leen mejor con el nombre de la región.
  const claveHija = (k: string) => (clave === 'cobertura' ? 'region-valor' : k);
  const nombreFila = (k: string) => (clave === 'cobertura' ? nombreRegion(k) : etiqueta(k));
  return `<dl>${entradas
    .map(([k, x]) => `<dt>${esc(nombreFila(k))}</dt><dd>${bloque(x, claveHija(k), nivel + 1)}</dd>`)
    .join('')}</dl>`;
}

export interface OpcionesInforme { marca: string; ley: string }

/** Página HTML completa, con estilos de impresión, lista para abrir y "Guardar como PDF". */
export function informeHtml(datos: Record<string, Valor>, o: OpcionesInforme): string {
  const { exportado, ...resto } = datos;
  const cuando = typeof exportado === 'string' ? valorSimple(exportado, 'exportado') : '';
  const secciones = Object.entries(resto)
    .map(([k, v]) => `<section><h2>${esc(etiqueta(k))}${Array.isArray(v) ? ` <small>(${v.length})</small>` : ''}</h2>${bloque(v, k, 0)}</section>`)
    .join('');
  return `<!doctype html>
<html lang="es-AR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mis datos en ${esc(o.marca)}</title>
<style>
  body { font: 14px/1.45 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #1c1c1c; background: #fff; max-width: 820px; margin: 0 auto; padding: 24px 16px 48px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #666; margin: 0 0 20px; }
  .aviso { background: #E8EEF5; border-radius: 6px; padding: 10px 12px; color: #444; margin-bottom: 24px; }
  .barra { margin-bottom: 20px; }
  .barra button { font: inherit; padding: 8px 14px; border-radius: 6px; border: 1px solid #0B2D5B; background: #0B2D5B; color: #fff; cursor: pointer; }
  section { margin: 0 0 22px; break-inside: auto; }
  h2 { font-size: 16px; border-bottom: 2px solid #0B2D5B; color: #0B2D5B; padding-bottom: 4px; margin: 0 0 10px; }
  h2 small { font-weight: 400; color: #666; }
  dl { display: grid; grid-template-columns: minmax(140px, 32%) 1fr; gap: 4px 12px; margin: 0; }
  dt { color: #555; }
  dd { margin: 0; overflow-wrap: anywhere; }
  dd dl { grid-template-columns: minmax(120px, 30%) 1fr; }
  .tarjeta { border: 1px solid #ddd; border-radius: 6px; padding: 8px 10px; margin: 0 0 8px; break-inside: avoid; }
  .num { font-size: 12px; color: #888; margin-bottom: 4px; }
  .vacio { color: #999; }
  a { color: inherit; }
  @media (max-width: 520px) { dl, dd dl { grid-template-columns: 1fr; } dt { font-weight: 600; margin-top: 6px; } }
  @media print { .barra { display: none; } body { padding: 0; } @page { margin: 16mm; } }
</style></head><body>
<h1>Mis datos en ${esc(o.marca)}</h1>
<p class="sub">Copia generada el ${cuando}</p>
<div class="barra"><button onclick="window.print()">Imprimir o guardar como PDF</button></div>
<p class="aviso">Es todo lo que ${esc(o.marca)} guarda de tu cuenta, en cumplimiento de la ${esc(o.ley)}. Si necesitás llevar estos datos a otro sistema, descargá también la versión técnica (.json) desde Mi perfil.</p>
${secciones}
</body></html>`;
}
