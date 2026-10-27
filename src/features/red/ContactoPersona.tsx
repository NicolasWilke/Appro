import { useContacto } from '@/auth/AuthProvider';
import type { Persona } from '@/domain/types';
import { Copiable } from '@/ui/primitivas';

/** Mail y teléfono de una persona, si la política de contacto lo permite. */
export function ContactoPersona({ p, aceptado = false }: { p: Persona; aceptado?: boolean }) {
  const c = useContacto(p, aceptado);
  if (!c) return null;
  return (
    <>
      <Copiable etiqueta="Mail" texto={c.email} />
      {c.telefono && <Copiable etiqueta="Teléfono" texto={c.telefono} />}
    </>
  );
}
