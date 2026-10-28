import { DemoAuth } from './DemoAuth';
import type { AuthService } from './tipos';

/**
 * VITE_AUTH=firebase usa Firebase (claves en .env.local); cualquier otro valor, la demo local.
 * Firebase se carga aparte para que la demo publicada no lo incluya.
 */
export async function crearAuth(): Promise<AuthService> {
  if (import.meta.env.VITE_AUTH === 'firebase') {
    const { crearFirebaseAuth } = await import('./firebase/FirebaseAuth');
    return crearFirebaseAuth();
  }
  return new DemoAuth();
}

export * from './tipos';
