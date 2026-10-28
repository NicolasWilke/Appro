import { DemoAuth } from './DemoAuth';
import type { AuthService } from './tipos';

/**
 * Cuentas guardadas en el navegador. Para usar un backend real, se agrega otra
 * implementación de AuthService y se elige acá; las pantallas no cambian.
 */
export async function crearAuth(): Promise<AuthService> {
  return new DemoAuth();
}

export * from './tipos';
