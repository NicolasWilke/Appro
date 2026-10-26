import type { Repository } from '../repository';

/**
 * Esqueleto de la implementación contra la API real. Cada método mapea a un
 * endpoint REST; las reglas de dominio (src/domain/reglas.ts) se ejecutan
 * también en el servidor, que es la fuente de verdad.
 */
export function crearHttpRepository(baseUrl: string): Repository {
  const pedir = async <T,>(ruta: string, init?: RequestInit): Promise<T> => {
    const r = await fetch(`${baseUrl}${ruta}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
    if (!r.ok) throw new Error((await r.json().catch(() => null))?.mensaje ?? `Error ${r.status}`);
    return r.status === 204 ? (undefined as T) : r.json();
  };
  const qs = (o: object = {}) => {
    const p = new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]));
    return p.toString() ? `?${p}` : '';
  };
  const post = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body) });
  const oyentes = new Set<() => void>();
  const tocar = <T,>(x: T) => { oyentes.forEach((f) => f()); return x; };

  return {
    listarCompradores: (f) => pedir(`/compradores${qs(f)}`),
    listarProveedores: (f) => pedir(`/proveedores${qs(f)}`),
    obtenerPersona: (id) => pedir(`/personas/${id}`),
    sincronizarCuenta: (c) => pedir(`/personas/${c.uid}`, { method: 'PUT', body: JSON.stringify(c) }).then(tocar) as never,
    solicitudesRecibidas: (id) => pedir(`/compradores/${id}/solicitudes`),
    solicitudesEnviadas: (id) => pedir(`/proveedores/${id}/solicitudes`),
    enviarSolicitud: (proveedorId, compradorId, motivo) => pedir('/solicitudes', post({ proveedorId, compradorId, motivo })).then(tocar) as never,
    responderSolicitud: (id, estado) => pedir(`/solicitudes/${id}`, { method: 'PATCH', body: JSON.stringify({ estado }) }).then(tocar) as never,
    listarPedidos: (f) => pedir(`/pedidos${qs({ compradorId: f?.compradorId, rubros: f?.rubros?.join(',') })}`),
    obtenerPedido: (id) => pedir(`/pedidos/${id}`),
    publicarPedido: (p) => pedir('/pedidos', post(p)).then(tocar) as never,
    cotizacionesDe: (id) => pedir(`/pedidos/${id}/cotizaciones`),
    cotizar: (c) => pedir(`/pedidos/${c.pedidoId}/cotizaciones`, post(c)).then(tocar) as never,
    adjudicar: (pedidoId, cotizacionId) => pedir(`/pedidos/${pedidoId}/adjudicacion`, post({ cotizacionId })).then(tocar) as never,
    avisosDePedido: (id) => pedir(`/pedidos/${id}/avisos`),
    cambiarAvisos: (id, frecuencia) => pedir(`/proveedores/${id}/avisos`, { method: 'PUT', body: JSON.stringify({ frecuencia }) }).then(tocar) as never,
    bandejaSalida: async () => [],
    enviarResumenesAhora: async () => 0,
    valoresReferencia: () => pedir('/valores-referencia'),
    indicePrecios: () => pedir('/indice-precios'),
    uso: (id) => pedir(`/proveedores/${id}/uso`),
    cambiarPlan: (id, plan) => pedir(`/proveedores/${id}/plan`, post({ plan })).then(tocar) as never,
    embudo: (id) => pedir(`/proveedores/${id}/embudo`),
    reiniciarDemo: async () => undefined,
    suscribir: (fn) => { oyentes.add(fn); return () => { oyentes.delete(fn); }; },
  };
}
