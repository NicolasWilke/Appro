import { recibeOfertas } from '@/domain/rfq';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSesion } from '@/app/session';
import { useContacto, useResponderSolicitud } from '@/auth/AuthProvider';
import { REGION } from '@/config/region';
import { useQuery, useRepo } from '@/data/DataProvider';
import { REGIONES, region } from '@/domain/catalogos';
import { estadoVisibleParaProveedor, habilitaCanalDirecto } from '@/domain/reglas';
import type { Comprador, Proveedor } from '@/domain/types';
import { fmt, t } from '@/i18n';
import { Avatar, Chip, Copiable, Estrellas, Pill, Sello, Seccion, Vacio } from '@/ui/primitivas';
import { useToast } from '@/ui/Toast';
import { FichaComprador } from './FichaComprador';
import { PedirContacto } from './PedirContacto';
import { promedio } from './TarjetaProveedor';

export function Perfil() {
  const { id = '' } = useParams();
  const { data, cargando } = useQuery((r) => r.obtenerPersona(id), [id]);
  if (cargando) return <div className="envoltura pagina" />;
  if (!data) return <div className="envoltura pagina"><Vacio titulo="Este perfil no existe o se dio de baja" accion={{ a: '/red', texto: 'Volver a la red' }} /></div>;
  return data.rol === 'comprador' ? <PerfilComprador c={data} /> : <PerfilProveedor p={data} />;
}

function PerfilComprador({ c }: { c: Comprador }) {
  const { rol, usuarioId } = useSesion();
  const [abierto, setAbierto] = useState(false);
  const { data: enviadas } = useQuery((r) => rol === 'proveedor' ? r.solicitudesEnviadas(usuarioId) : Promise.resolve([]), [rol, usuarioId]);
  const { data: pedidos } = useQuery((r) => r.listarPedidos({ compradorId: c.id, visorId: usuarioId }), [c.id, usuarioId]);
  const sol = enviadas?.find((s) => s.compradorId === c.id && s.estado !== 'rechazada') ?? enviadas?.find((s) => s.compradorId === c.id);
  const directo = habilitaCanalDirecto(sol);
  const esYo = rol === 'comprador' && usuarioId === c.id;
  const contacto = useContacto(c, directo);

  let accion = null;
  if (rol === 'proveedor') {
    if (!sol || estadoVisibleParaProveedor(sol.estado) === 'cerrada') accion = <button className="btn btn--pri" onClick={() => setAbierto(true)}>{t.acciones.pedirContacto}</button>;
    else accion = <Pill tono={directo ? 'ok' : 'senal'}>Solicitud {t.estado[estadoVisibleParaProveedor(sol.estado)].toLowerCase()}</Pill>;
  }

  return (
    <div className="envoltura pagina perfil">
      <div className="perfil__principal">
        <FichaComprador c={c} nombreVisible={!c.semiAnonimo || directo || esYo} accion={accion} conSello enlace={false} />
        {rol === 'comprador' && !esYo && <p className="nota">Estás viendo este perfil como comprador. Los proveedores ven además el botón para pedir contacto; su mail y teléfono, solo si los acepta.</p>}
      </div>
      <div className="perfil__lateral">
        {contacto && !esYo && (
          <Seccion titulo="Contacto">
            {sol && directo && <p className="tenue">Aceptó tu solicitud del {fmt.fecha(sol.creada)}.</p>}
            <Copiable etiqueta="Mail" texto={contacto.email} />
            {contacto.telefono && <Copiable etiqueta="Teléfono" texto={contacto.telefono} />}
          </Seccion>
        )}
        {sol && estadoVisibleParaProveedor(sol.estado) === 'cerrada' && (
          <p className="nota">Tu solicitud anterior se cerró. No mostramos rechazos: podés volver a intentar con otra propuesta.</p>
        )}
        <Seccion titulo="Pedidos de cotización abiertos">
          {pedidos?.filter((p) => recibeOfertas(p)).map((p) => (
            <Link key={p.id} to={`/cotizaciones/${p.id}`} className="fila-pedido">
              <span className="mono tenue">{p.id}</span>
              <span>{p.titulo}</span>
              <span className="tenue">Cierra {fmt.fecha(p.cierre)}</span>
            </Link>
          ))}
          {pedidos && pedidos.filter((p) => recibeOfertas(p)).length === 0 && <p className="tenue">No tiene pedidos abiertos ahora.</p>}
        </Seccion>
        {c.circulos.length > 0 && (
          <Seccion titulo="Círculos">
            <div className="chips">{c.circulos.map((x) => <Chip key={x}>{x}</Chip>)}</div>
            <p className="tenue">Grupos cerrados entre compradores. Los proveedores no entran.</p>
          </Seccion>
        )}
      </div>
      {abierto && <PedirContacto comprador={c} proveedorId={usuarioId} onCerrar={() => setAbierto(false)} />}
    </div>
  );
}

function PerfilProveedor({ p }: { p: Proveedor }) {
  const { rol, usuarioId } = useSesion();
  const responder = useResponderSolicitud();
  const avisar = useToast();
  const { data: recibidas } = useQuery((r) => rol === 'comprador' ? r.solicitudesRecibidas(usuarioId) : Promise.resolve([]), [rol, usuarioId]);
  const sol = recibidas?.find((s) => s.proveedorId === p.id);
  const contacto = useContacto(p);
  const esYo = usuarioId === p.id;
  const prom = promedio(p);
  const sub = (k: 'entrega' | 'calidad' | 'facturacion') => p.resenas.length ? p.resenas.reduce((a, r) => a + r[k], 0) / p.resenas.length : 0;

  return (
    <div className="envoltura pagina perfil">
      <div className="perfil__principal">
        <article className="vitrina">
          <Sello className="vitrina__sello">Constancia<br />{REGION.autoridadFiscal}</Sello>
          <div className="vitrina__cab">
            <Avatar p={p} grande />
            <div>
              <p className="eyebrow">Proveedor verificado · desde {p.desde}</p>
              <h1>{p.empresa}</h1>
              <p>{p.nombre} {p.apellido} · {p.cargo}</p>
              <p className="tenue mono">{REGION.idFiscal.nombre} {p.idFiscal} · {p.ciudad}{p.empleados && ` · ${p.empleados} empleados`}</p>
              {rol === 'comprador' && <BotonFavorito proveedorId={p.id} empresa={p.empresa} />}
            </div>
          </div>
          {p.certificaciones.length > 0 && <div className="chips">{p.certificaciones.map((x) => <Pill key={x} tono="sello">{x}</Pill>)}</div>}
          {p.catalogo.length > 0 && (
            <>
              <h2 className="sub">Qué ofrece</h2>
              <ul className="lista-check">{p.catalogo.map((x) => <li key={x}>{x}</li>)}</ul>
            </>
          )}
          <h2 className="sub">Cobertura operativa</h2>
          <ul className="cobertura">
            {REGIONES.map((r) => {
              const v = p.cobertura[r.id] ?? 0;
              return (
                <li key={r.id}>
                  <span>{r.nombre}</span>
                  <span className="cobertura__barra"><span style={{ width: `${v}%` }} /></span>
                  <span className="mono tenue">{v ? `${v}%` : '—'}</span>
                </li>
              );
            })}
          </ul>
        </article>
      </div>
      <div className="perfil__lateral">
        {rol === 'comprador' && sol?.estado === 'pendiente' && (
          <Seccion titulo="Te pidió contacto">
            <blockquote className="motivo">{sol.motivo}</blockquote>
            <div className="acciones-sol">
              <button className="btn btn--pri" onClick={async () => { await responder(sol, 'aceptada'); avisar(`Aceptaste. ${p.nombre} ya puede escribirte por mail y agendar.`); }}>{t.acciones.aceptar}</button>
              <button className="btn btn--sec" onClick={() => responder(sol, 'postergada')}>{t.acciones.postergar}</button>
              <button className="btn btn--ter" onClick={() => responder(sol, 'rechazada')}>{t.acciones.rechazar}</button>
            </div>
          </Seccion>
        )}
        {contacto && !esYo && (
          <Seccion titulo="Contacto">
            <Copiable etiqueta="Mail" texto={contacto.email} />
            {contacto.telefono && <Copiable etiqueta="Teléfono" texto={contacto.telefono} />}
          </Seccion>
        )}
        {rol === 'proveedor' && !esYo && <p className="nota">Entre proveedores no se muestran datos de contacto.</p>}
        <Seccion titulo="Reseñas de compradores verificados" extra={prom > 0 ? <span><Estrellas valor={prom} /> <span className="mono">{prom.toFixed(1)}</span></span> : undefined}>
          {p.resenas.length === 0 && <p className="tenue">Todavía no tiene reseñas. Solo pueden reseñar compradores con una relación comercial registrada en la red.</p>}
          {p.resenas.length > 0 && (
            <dl className="subnotas">
              <div><dt>Entrega</dt><dd className="mono">{sub('entrega').toFixed(1)}</dd></div>
              <div><dt>Calidad</dt><dd className="mono">{sub('calidad').toFixed(1)}</dd></div>
              <div><dt>Facturación</dt><dd className="mono">{sub('facturacion').toFixed(1)}</dd></div>
            </dl>
          )}
          {p.resenas.map((r) => (
            <figure key={r.autor + r.fecha} className="resena">
              <blockquote>{r.texto}</blockquote>
              <figcaption>{r.autor} · {r.empresa} · <span className="tenue">{fmt.fecha(r.fecha)}</span></figcaption>
            </figure>
          ))}
        </Seccion>
        <p className="tenue">Región principal: {region(p.region).nombre}</p>
      </div>
    </div>
  );
}

/** Marca al proveedor como favorito del comprador, para invitarlo rápido a pedidos privados. */
function BotonFavorito({ proveedorId, empresa }: { proveedorId: string; empresa: string }) {
  const { usuarioId } = useSesion();
  const repo = useRepo();
  const avisar = useToast();
  const { data: favs } = useQuery((r) => r.favoritos(usuarioId), [usuarioId]);
  if (!favs) return null;
  const es = favs.includes(proveedorId);
  const alternar = async () => {
    await repo.marcarFavorito(usuarioId, proveedorId, !es);
    avisar(es ? `${empresa} ya no está en tus favoritos.` : `${empresa} quedó en tus favoritos: lo vas a ver primero al invitar a un pedido privado.`);
  };
  return (
    <button className={`btn btn--chico ${es ? 'btn--sec' : 'btn--ter'} favorito`} aria-pressed={es} onClick={alternar}>
      <span aria-hidden="true">{es ? '★' : '☆'}</span> {es ? 'En favoritos' : 'Agregar a favoritos'}
    </button>
  );
}
