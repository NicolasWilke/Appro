import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRepo } from '@/data/DataProvider';
import { puedeVerContacto } from '@/domain/acceso';
import type { Persona } from '@/domain/types';
import { crearAuth } from '.';
import type { AuthService, ContactoCuenta, Cuenta } from './tipos';

interface EstadoAuth { auth: AuthService; cuenta: Cuenta | null }
const Ctx = createContext<EstadoAuth | null>(null);

/**
 * Sesión de la app. Mientras pedidos, cotizaciones y la red sigan en el repositorio de la demo,
 * cada cuenta se refleja ahí como una persona con el mismo id (sincronizarCuenta).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const repo = useRepo();
  const [auth, setAuth] = useState<AuthService | null>(null);
  const [cuenta, setCuenta] = useState<Cuenta | null | undefined>(undefined);
  const [fallo, setFallo] = useState<string | null>(null);

  useEffect(() => {
    let desuscribir = () => {};
    let vigente = true;
    crearAuth().then((a) => {
      if (!vigente) return;
      setAuth(a);
      desuscribir = a.observar(async (c) => {
        // Si la ficha de la red no se puede guardar (por ejemplo, reglas sin publicar), la sesión igual entra.
        if (c) await repo.sincronizarCuenta({ ...c.perfil, email: c.contacto.email, telefono: c.contacto.telefono })
          .catch((e) => console.error('[APPRO] No se pudo guardar la ficha de la red:', e));
        setCuenta(c);
      });
    }, (e: Error) => setFallo(e.message));
    return () => { vigente = false; desuscribir(); };
  }, [repo]);

  if (fallo) return <div className="envoltura pagina"><p className="error">No se pudo iniciar la autenticación: {fallo}</p></div>;
  if (!auth || cuenta === undefined) return <div className="arranque" aria-busy="true" />;
  return <Ctx.Provider value={{ auth, cuenta }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useAuth fuera de AuthProvider');
  return s;
}

/**
 * Mail y teléfono de otra persona, solo si la política lo permite.
 * `aceptadoLocal`: la solicitud de este proveedor figura aceptada en los datos de la demo.
 * Para cuentas reales manda lo que respondan las reglas; el dato local solo cubre a las personas de ejemplo.
 */
export function useContacto(p: Persona | null | undefined, aceptadoLocal = false): ContactoCuenta | null {
  const { auth, cuenta } = useAuth();
  const posible = !!p && !!cuenta && puedeVerContacto(cuenta.perfil, { uid: p.id, rol: p.rol }, true);
  const respaldo = !!p && !!cuenta && puedeVerContacto(cuenta.perfil, { uid: p.id, rol: p.rol }, aceptadoLocal);
  const [contacto, setContacto] = useState<ContactoCuenta | null>(null);
  useEffect(() => {
    if (!posible || !p) { setContacto(null); return; }
    let vigente = true;
    const local = respaldo ? p.contacto : null;
    auth.contactoDe(p.id).then((c) => vigente && setContacto(c ?? local), () => vigente && setContacto(local));
    return () => { vigente = false; };
  }, [auth, posible, respaldo, p]);
  return posible ? contacto : null;
}

/** Responder una solicitud de contacto: al aceptar, también habilita el contacto en las reglas. */
export function useResponderSolicitud() {
  const { auth } = useAuth();
  const repo = useRepo();
  return async (s: { id: string; proveedorId: string }, estado: 'aceptada' | 'postergada' | 'rechazada') => {
    if (estado === 'aceptada') await auth.aceptarProveedor(s.proveedorId);
    await repo.responderSolicitud(s.id, estado);
  };
}
