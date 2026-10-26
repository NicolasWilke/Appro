import { useAuth } from '@/auth/AuthProvider';
import type { Rol } from '@/domain/types';

/**
 * Rol e id del usuario con sesión. Solo se usa dentro de rutas protegidas (ver RequiereSesion),
 * así que siempre hay cuenta. Un usuario tiene un solo rol por cuenta.
 */
export function useSesion(): { rol: Rol; usuarioId: string } {
  const { cuenta } = useAuth();
  if (!cuenta) throw new Error('useSesion sin sesión: la ruta tiene que estar dentro de RequiereSesion');
  return { rol: cuenta.perfil.rol, usuarioId: cuenta.uid };
}
