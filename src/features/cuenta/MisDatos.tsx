import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { FalloAuth, MENSAJES_FALLO } from '@/auth/tipos';
import { MARCA } from '@/config/marca';
import { REGION } from '@/config/region';
import { useRepo } from '@/data/DataProvider';
import { informeHtml } from '@/domain/informeDatos';
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

  async function juntarDatos() {
    const uid = c.uid;
    const esComprador = c.perfil.rol === 'comprador';
    const [persona, solicitudes, pedidos, favoritos, valores] = await Promise.all([
      repo.obtenerPersona(uid),
      esComprador ? repo.solicitudesRecibidas(uid) : repo.solicitudesEnviadas(uid),
      esComprador ? repo.listarPedidos({ compradorId: uid, visorId: uid }) : Promise.resolve([]),
      esComprador ? repo.favoritos(uid) : Promise.resolve([]),
      repo.solicitudesValor(esComprador ? { compradorId: uid } : { proveedorId: uid }),
    ]);
    return {
      exportado: new Date().toISOString(),
      usuario: { email: c.email, ...(miembro ? { miembroDeEquipo: miembro.nombre } : {}) },
      perfil: c.perfil,
      contacto: c.contacto,
      enLaRed: persona,
      solicitudesDeContacto: solicitudes,
      ...(esComprador ? { pedidosDeCotizacion: pedidos, proveedoresFavoritos: favoritos } : {}),
      pedidosDeValor: valores,
    };
  }

  const hoy = () => new Date().toISOString().slice(0, 10);

  /** Versión para leer: se abre en otra pestaña con el diálogo de imprimir, donde se elige "Guardar como PDF". */
  async function bajarLegible() {
    // La pestaña se abre en el clic, antes de esperar los datos: si no, el navegador la bloquea.
    const ventana = window.open('', '_blank');
    ventana?.document.write('<p style="font-family:system-ui;padding:24px">Preparando tus datos…</p>');
    setOcupado(true);
    try {
      const html = informeHtml(await juntarDatos(), { marca: MARCA.nombre, ley: REGION.leyDatos });
      if (ventana && !ventana.closed) {
        ventana.document.open();
        ventana.document.write(html);
        ventana.document.close();
        ventana.focus();
        setTimeout(() => ventana.print(), 300);
      } else {
        // Ventanas emergentes bloqueadas: queda el archivo para abrir con doble clic.
        descargar(`mis-datos-${hoy()}.html`, html, 'text/html;charset=utf-8');
      }
    } catch (e) {
      ventana?.close();
      avisar(mensaje(e), 'error');
    } finally {
      setOcupado(false);
    }
  }

  /** Versión técnica, para llevar los datos a otro sistema. */
  async function bajarJson() {
    setOcupado(true);
    try {
      descargar(`mis-datos-${hoy()}.json`, JSON.stringify(await juntarDatos(), null, 2), 'application/json;charset=utf-8');
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
        <button className="btn btn--sec" disabled={ocupado} onClick={bajarLegible}>Ver o guardar en PDF</button>
        <button className="btn btn--ter" disabled={ocupado} onClick={bajarJson}>Descargar para otro sistema (.json)</button>
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
