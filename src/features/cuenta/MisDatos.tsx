import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { FalloAuth, MENSAJES_FALLO } from '@/auth/tipos';
import { REGION } from '@/config/region';
import { useRepo } from '@/data/DataProvider';
import { descargar } from '@/ui/descargar';
import { Modal } from '@/ui/Modal';
import { Seccion } from '@/ui/primitivas';
import { useToast } from '@/ui/Toast';

const mensaje = (e: unknown) => (e instanceof FalloAuth ? MENSAJES_FALLO[e.codigo] : e instanceof Error ? e.message : MENSAJES_FALLO.desconocido);

/**
 * Derechos de acceso y supresión (Ley 25.326) sin tener que escribirle a nadie:
 * descargar lo que la red guarda de la cuenta y pedir la baja.
 */
export function MisDatos() {
  const { auth, cuenta } = useAuth();
  const repo = useRepo();
  const avisar = useToast();
  const ir = useNavigate();
  const [bajando, setBajando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const c = cuenta!;
  const miembro = c.miembro;

  async function bajarDatos() {
    setOcupado(true);
    try {
      const uid = c.uid;
      const esComprador = c.perfil.rol === 'comprador';
      const [persona, solicitudes, pedidos, favoritos, valores] = await Promise.all([
        repo.obtenerPersona(uid),
        esComprador ? repo.solicitudesRecibidas(uid) : repo.solicitudesEnviadas(uid),
        esComprador ? repo.listarPedidos({ compradorId: uid, visorId: uid }) : Promise.resolve([]),
        esComprador ? repo.favoritos(uid) : Promise.resolve([]),
        repo.solicitudesValor(esComprador ? { compradorId: uid } : { proveedorId: uid }),
      ]);
      const datos = {
        exportado: new Date().toISOString(),
        usuario: { email: c.email, ...(miembro ? { miembroDeEquipo: miembro.nombre } : {}) },
        perfil: c.perfil,
        contacto: c.contacto,
        enLaRed: persona,
        solicitudesDeContacto: solicitudes,
        ...(esComprador ? { pedidosDeCotizacion: pedidos, proveedoresFavoritos: favoritos } : {}),
        pedidosDeValor: valores,
      };
      descargar(`mis-datos-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(datos, null, 2), 'application/json;charset=utf-8');
    } catch (e) {
      avisar(mensaje(e), 'error');
    } finally {
      setOcupado(false);
    }
  }

  async function darDeBaja() {
    setOcupado(true);
    try {
      await auth.pedirBaja();
      ir('/');
      avisar(auth.modo === 'demo' ? 'Borramos tu cuenta de esta demo.' : 'Listo. Tu cuenta y tus datos se borran en la próxima media hora.', 'info');
    } catch (e) {
      avisar(mensaje(e), 'error');
      setOcupado(false);
    }
  }

  return (
    <Seccion titulo="Tus datos">
      <p className="tenue">Por la {REGION.leyDatos} podés llevarte una copia de tus datos o borrar tu cuenta cuando quieras.</p>
      <div className="acciones-sol">
        <button className="btn btn--sec" disabled={ocupado} onClick={bajarDatos}>Descargar mis datos</button>
        <button className="btn btn--ter" disabled={ocupado} onClick={() => setBajando(true)}>{miembro ? 'Borrar mi usuario' : 'Eliminar mi cuenta'}</button>
      </div>
      {bajando && (
        <Modal titulo={miembro ? 'Borrar tu usuario' : 'Eliminar tu cuenta'} onCerrar={() => setBajando(false)}>
          {miembro ? (
            <p>Salís del equipo de <strong>{c.perfil.empresa}</strong> y se borra tu usuario. La cuenta de la empresa sigue igual.</p>
          ) : (
            <>
              <p>Se borran tu perfil, tu contacto, tus solicitudes, {c.perfil.rol === 'comprador' ? 'tus pedidos de cotización con sus ofertas' : 'tus ofertas en pedidos abiertos, tu plan y tu equipo'}, las reseñas y tu usuario.</p>
              <p className="tenue">{c.perfil.rol === 'proveedor' && 'Las ofertas que ya mandaste a pedidos cerrados quedan en el historial de quien las recibió, sin tu perfil. '}No se puede deshacer.</p>
            </>
          )}
          <div className="acciones-sol">
            <button className="btn btn--pri" disabled={ocupado} onClick={darDeBaja}>{miembro ? 'Borrar mi usuario' : 'Eliminar mi cuenta'}</button>
            <button className="btn btn--ter" onClick={() => setBajando(false)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </Seccion>
  );
}
