import { crearHttpRepository } from './http/HttpRepository';
import { MockRepository } from './mock/MockRepository';
import type { Repository } from './repository';

/**
 * VITE_DATA_SOURCE=api: API propia (VITE_API_URL). Si no, los datos viven en el navegador.
 */
export async function crearRepositorio(): Promise<Repository> {
  if (import.meta.env.VITE_DATA_SOURCE === 'api' && import.meta.env.VITE_API_URL) {
    return crearHttpRepository(import.meta.env.VITE_API_URL);
  }
  return new MockRepository();
}

export type { Repository } from './repository';
