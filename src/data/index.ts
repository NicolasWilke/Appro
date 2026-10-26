import { crearHttpRepository } from './http/HttpRepository';
import { MockRepository } from './mock/MockRepository';
import type { Repository } from './repository';

/**
 * VITE_DATA_SOURCE:
 *   firebase  la red, los pedidos y las cotizaciones en Firestore (necesita VITE_AUTH=firebase)
 *   api       la API propia (VITE_API_URL)
 *   mock      datos de ejemplo en el navegador (la demo publicada)
 */
export function crearRepositorio(): Repository {
  const fuente = import.meta.env.VITE_DATA_SOURCE;
  if (fuente === 'firebase') return repositorioDiferido(() => import('./firebase/FirestoreRepository').then((m) => m.crearFirestoreRepository()));
  if (fuente === 'api' && import.meta.env.VITE_API_URL) return crearHttpRepository(import.meta.env.VITE_API_URL);
  return new MockRepository();
}

/**
 * Firebase se carga aparte para que la demo no lo incluya. Este envoltorio expone el repositorio
 * de inmediato y espera la carga en la primera llamada.
 */
function repositorioDiferido(cargar: () => Promise<Repository>): Repository {
  let real: Repository | null = null;
  const listo = cargar().then((r) => (real = r));
  const oyentes = new Set<() => void>();
  listo.then((r) => r.suscribir(() => oyentes.forEach((fn) => fn())));
  return new Proxy({} as Repository, {
    get(_obj, nombre: string | symbol) {
      // Que nadie lo confunda con una promesa ni con otro objeto especial.
      if (typeof nombre === 'symbol' || nombre === 'then') return undefined;
      if (nombre === 'suscribir') {
        return (fn: () => void) => { oyentes.add(fn); return () => { oyentes.delete(fn); }; };
      }
      return async (...args: unknown[]) => {
        const r = real ?? (await listo);
        return (r as unknown as Record<string | symbol, (...a: unknown[]) => unknown>)[nombre](...args);
      };
    },
  });
}

export type { Repository } from './repository';
