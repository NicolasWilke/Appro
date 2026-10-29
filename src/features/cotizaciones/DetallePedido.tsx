import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSesion } from '@/app/session';
import { useQuery, useRepo } from '@/data/DataProvider';
import { rubro } from '@/domain/catalogos';
import {
  adjudicadosDe, ahorro, cerrado, horaDeCierre, preciosVisibles, puedeCotizar, recibeOfertas, sugerirAdjudicacion, totales,
} from '@/domain/rfq';
import type { Cotizacion, PedidoCotizacion, Proveedor } from '@/domain/types';
import { fmt, t } from '@/i18n';
import { Pill, Seccion, Vacio } from '@/ui/primitivas';
import { useToast } from '@/ui/Toast';
import { ListaEnlaces } from './Enlaces';
import { Matriz } from './Matriz';
import { CotizarModal } from './modales';
import { Resenar } from './Resenar';

const cuando = (p: PedidoCotizacion) => `${fmt.fecha(p.cierre)} a las ${horaDeCierre(p.cierraEn)}`;

export function DetallePedido() {
  const { id = '' } = useParams();
  const { rol, usuarioId } = useSesion();
  const [cotizando, setCotizando] = useState(false);
  const { data, cargando } = useQuery(async (r) => {
    const pedido = await r.obtenerPedido(id);
    if (!pedido) return null;
    const [cotis, provs, comprador] = await Promise.all([r.cotizacionesDe(id), r.listarProveedores(), r.obtenerPersona(pedido.compradorId)]);
    const esDueno = pedido.compradorId === usuarioId;
    const [avisos, resenas] = await Promise.all([
      esDueno ? r.avisosDePedido(id) : [],
      pedido.estado === 'adjudicado' && esDueno ? r.resenasDePedido(id) : [],
    ]);
    return { pedido, cotis, provs, comprador, avisos, resenas };
  }, [id, usuarioId]);

  if (cargando) return <div className="envoltura pagina" />;
  if (!data) return <div className="envoltura pagina"><Vacio titulo="Este pedido no existe o es privado" accion={{ a: '/cotizaciones', texto: 'Ver pedidos' }} /></div>;

  const { pedido, cotis, provs, comprador, avisos, resenas } = data;
  const esDueno = rol === 'comprador' && pedido.compradorId === usuarioId;
  const mia = cotis.find((c) => c.proveedorId === usuarioId);
  const abierto = recibeOfertas(pedido);
  const prov = (pid: string) => provs.find((p) => p.id === pid);

  return (
    <div className="envoltura pagina">
      <Link to="/cotizaciones" className="enlace">← Pedidos</Link>
      <header className="pedido">
        <div>
          <p className="eyebrow"><span className="mono">{pedido.id}</span> · {rubro(pedido.rubro).nombre}{pedido.privado && ' · Privado'}</p>
          <h1>{pedido.titulo}</h1>
          {comprador && comprador.rol === 'comprador' && (
            <p>Publicado por <Link to={`/red/${comprador.id}`}>{comprador.semiAnonimo && !esDueno ? `${comprador.cargo} de ${comprador.empresa}` : `${comprador.nombre} ${comprador.apellido}, ${comprador.empresa}`}</Link></p>
          )}
        </div>
        <div>
          {pedido.estado === 'adjudicado' ? <Pill tono="ok">{t.estado.adjudicado}</Pill>
            : abierto ? <Pill tono="senal">Recibe ofertas hasta el {cuando(pedido)}</Pill>
            : <Pill tono="sello">Cerrado · en evaluación</Pill>}
        </div>
      </header>
      {pedido.descripcion && <p className="pedido__desc">{pedido.descripcion}</p>}
      <dl className="ficha-tecnica">
        <div><dt>Entrega</dt><dd>{pedido.entrega}</dd></div>
        <div><dt>Pago</dt><dd>{pedido.pago}</dd></div>
        {pedido.zona && <div><dt>Zona</dt><dd>{pedido.zona}</dd></div>}
        <div><dt>Cierre</dt><dd>{cuando(pedido)}</dd></div>
        <div><dt>Precios</dt><dd>{pedido.sobreCerrado ? 'Sobre cerrado: se abren al cierre' : 'Visibles al llegar'}</dd></div>
        <div><dt>Ofertas recibidas</dt><dd className="mono">{pedido.ofertas}</dd></div>
      </dl>

      <Seccion titulo={`Ítems · ${pedido.items.length}`}>
        <div className="tabla-envoltura">
          <table className="tabla tabla--items">
            <thead><tr><th>#</th><th>Ítem</th><th>Descripción técnica</th><th className="num">Cantidad</th></tr></thead>
            <tbody>
              {pedido.items.map((i, n) => (
                <tr key={i.id}><td className="mono tenue">{n + 1}</td><td className="tabla__tit">{i.nombre}</td><td>{i.descripcion || <span className="tenue">—</span>}</td><td className="num mono">{fmt.numero(i.cantidad)} <span className="tenue">{i.unidad}</span></td></tr>
              ))}
            </tbody>
          </table>
        </div>
        {(pedido.documentos.length > 0 || pedido.adjuntos.length > 0) && (
          <div className="pedido__docs">
            {pedido.documentos.length > 0 && <div><p className="etq">Documentos que hay que presentar</p><ul>{pedido.documentos.map((d) => <li key={d}>{d}</li>)}</ul></div>}
            {pedido.adjuntos.length > 0 && <div><p className="etq">Archivos del comprador</p><ListaEnlaces enlaces={pedido.adjuntos} /></div>}
          </div>
        )}
      </Seccion>

      {rol === 'proveedor' && (
        <VistaProveedor pedido={pedido} mia={mia} provs={provs} usuarioId={usuarioId} abierto={abierto} onCotizar={() => setCotizando(true)} />
      )}
      {rol === 'comprador' && !esDueno && (
        <p className="nota">Este pedido es de otro comprador. Solo quien lo publicó ve las ofertas.</p>
      )}
      {esDueno && <VistaComprador pedido={pedido} cotis={cotis} provs={provs} />}

      {esDueno && pedido.estado === 'adjudicado' && (pedido.adjudicados ?? []).map((pid) => (
        <Resenar key={pid} pedidoId={pedido.id} proveedorId={pid} empresa={prov(pid)?.empresa ?? 'el proveedor'} resena={resenas.find((r) => r.proveedorId === pid || (!r.proveedorId && pid === pedido.adjudicadaA)) ?? null} />
      ))}
      {esDueno && (
        <Seccion titulo={`${pedido.privado ? 'Invitaciones' : 'Aviso a proveedores'} · ${avisos.length}`} extra={<Link to="/mails" className="enlace">Ver los mails</Link>}>
          {avisos.length === 0 && <p className="tenue">Los avisos de este pedido salieron antes de que existiera el registro. En los pedidos nuevos vas a ver acá a quién le llegó.</p>}
          {avisos.length > 0 && (
            <ul className="avisos">
              {avisos.map((a) => (
                <li key={a.proveedorId}>
                  <Link to={`/red/${a.proveedorId}`}>{a.empresa}</Link>
                  <Pill tono={a.via === 'mail' ? 'ok' : 'neutro'}>{a.via === 'mail' ? 'Mail enviado' : 'En su resumen diario'}</Pill>
                </li>
              ))}
            </ul>
          )}
          <p className="nota">El mail muestra tu nombre, cargo y empresa como en tu perfil. Tu mail y tu teléfono no se comparten hasta que aceptás una solicitud o elegís una cotización.</p>
        </Seccion>
      )}
      {cotizando && <CotizarModal pedido={pedido} proveedorId={usuarioId} onCerrar={() => setCotizando(false)} />}
    </div>
  );
}

function VistaProveedor({ pedido, mia, provs, usuarioId, abierto, onCotizar }: {
  pedido: PedidoCotizacion; mia?: Cotizacion; provs: Proveedor[]; usuarioId: string; abierto: boolean; onCotizar: () => void;
}) {
  const invitado = puedeCotizar(pedido, usuarioId);
  const gane = pedido.adjudicacion ? Object.entries(pedido.adjudicacion).filter(([, p]) => p === usuarioId).map(([i]) => i) : [];
  return (
    <>
      {!mia && abierto && invitado && (
        <div className="llamado">
          <p>Cotizá cada ítem en el formato del pedido.{pedido.sobreCerrado ? ' Es sobre cerrado: nadie ve tu precio antes del cierre.' : ''} Las ofertas de otros proveedores nunca se muestran.</p>
          <button className="btn btn--pri" onClick={onCotizar}>{t.acciones.cotizar}</button>
        </div>
      )}
      {!mia && !invitado && <p className="nota">Este pedido es privado: solo cotizan los proveedores invitados.</p>}
      {!mia && invitado && !abierto && <p className="nota">Este pedido cerró el {cuando(pedido)} y ya no recibe ofertas.</p>}
      {mia && (
        <Seccion titulo="Tu oferta" extra={pedido.estado === 'adjudicado' && (gane.length
          ? <Pill tono="ok">{gane.length === pedido.items.length ? 'Ganaste el pedido' : `Ganaste ${gane.length} de ${pedido.items.length} ítems`}</Pill>
          : <Pill>Adjudicado a otra propuesta</Pill>)}>
          <p className="tenue">Las ofertas de otros proveedores no se muestran. Tu oferta ya no se puede editar.</p>
          <Matriz pedido={pedido} cotis={[mia]} provs={provs} asignacion={pedido.adjudicacion} />
        </Seccion>
      )}
    </>
  );
}

function VistaComprador({ pedido, cotis, provs }: { pedido: PedidoCotizacion; cotis: Cotizacion[]; provs: Proveedor[] }) {
  const repo = useRepo();
  const avisar = useToast();
  const visibles = preciosVisibles(pedido);
  const [asignacion, setAsignacion] = useState<Record<string, string>>({});
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const prov = (pid: string) => provs.find((p) => p.id === pid);

  if (!visibles) {
    return (
      <Seccion titulo={`Ofertas · ${pedido.ofertas} recibidas`}>
        <div className="sobre">
          <p className="sobre__tit">Sobre cerrado hasta el {cuando(pedido)}</p>
          <p className="tenue">{pedido.ofertas === 0 ? 'Todavía no llegaron ofertas.' : pedido.ofertas === 1 ? 'Llegó 1 oferta.' : `Llegaron ${pedido.ofertas} ofertas.`} Los precios se abren solos al cierre; hasta entonces nadie los ve, ni vos.</p>
        </div>
      </Seccion>
    );
  }
  if (!cotis.length) {
    return <Seccion titulo="Ofertas"><Vacio titulo="No llegaron ofertas">{cerrado(pedido) ? 'El pedido cerró sin ofertas. Podés publicarlo de nuevo con más plazo o como privado, invitando proveedores.' : 'Los proveedores del rubro ya recibieron el pedido.'}</Vacio></Seccion>;
  }

  if (pedido.estado === 'adjudicado') {
    const asig = pedido.adjudicacion ?? {};
    const a = ahorro(pedido, cotis, asig);
    return (
      <Seccion titulo={`Comparador · ${cotis.length} ${cotis.length === 1 ? 'oferta' : 'ofertas'}`} extra={<Link to={`/cotizaciones/${pedido.id}/resumen`} className="btn btn--sec btn--chico">Resumen ejecutivo</Link>}>
        <div className="adjudicacion">
          {(pedido.adjudicados ?? []).map((pid) => {
            const items = pedido.items.filter((i) => asig[i.id] === pid);
            const c = cotis.find((x) => x.proveedorId === pid);
            return (
              <p key={pid}><Pill tono="ok">Adjudicado</Pill> <Link to={`/red/${pid}`}>{prov(pid)?.empresa ?? pid}</Link>: {items.length === pedido.items.length ? 'todo el pedido' : items.map((i) => i.nombre).join(', ')}
                {c && <span className="mono"> · {fmt.moneda(totales(pedido, c, items.map((i) => i.id)).total)}</span>}</p>
            );
          })}
          <p className="tenue">Adjudicado en total: <strong className="mono">{fmt.moneda(a.adjudicado)}</strong>{a.monto > 0 && <> · Ahorro contra la oferta más alta: <strong className="mono">{fmt.moneda(a.monto)}</strong> ({fmt.pct(a.pct, false)})</>}</p>
          {pedido.comentarioAdjudicacion && <p><span className="etq">Justificación</span> {pedido.comentarioAdjudicacion}</p>}
        </div>
        <Matriz pedido={pedido} cotis={cotis} provs={provs} asignacion={asig} />
      </Seccion>
    );
  }

  const completa = pedido.items.every((i) => asignacion[i.id]);
  const resumen = completa ? ahorro(pedido, cotis, asignacion) : null;
  const ganadores = adjudicadosDe(asignacion);
  const adjudicar = async () => {
    setError('');
    setEnviando(true);
    try {
      await repo.adjudicar(pedido.id, asignacion, comentario);
      avisar(ganadores.length === 1
        ? `Adjudicado a ${(prov(ganadores[0])?.empresa ?? '').replace(/\.$/, '')}. Cuando termine la entrega, calificalo desde este pedido.`
        : `Adjudicado entre ${ganadores.length} proveedores. Cuando terminen las entregas, calificalos desde este pedido.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo adjudicar.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Seccion titulo={`Comparador · ${cotis.length} ${cotis.length === 1 ? 'oferta' : 'ofertas'}`} extra={<Link to={`/cotizaciones/${pedido.id}/resumen`} className="btn btn--sec btn--chico">Resumen ejecutivo</Link>}>
      {pedido.estado === 'abierto' && !cerrado(pedido) && <p className="tenue">El pedido sigue abierto hasta el {cuando(pedido)}: pueden llegar más ofertas.</p>}
      <Matriz pedido={pedido} cotis={cotis} provs={provs} asignacion={asignacion} onAsignar={(itemId, pid) => setAsignacion({ ...asignacion, [itemId]: pid })} />
      <div className="adjudicar">
        <div className="adjudicar__atajos">
          <span className="etq">Adjudicar</span>
          <button type="button" className="btn btn--sec btn--chico" onClick={() => setAsignacion(sugerirAdjudicacion(pedido, cotis, 'total'))}>Todo al total más bajo</button>
          {pedido.items.length > 1 && <button type="button" className="btn btn--sec btn--chico" onClick={() => setAsignacion(sugerirAdjudicacion(pedido, cotis, 'item'))}>Cada ítem al menor precio</button>}
          {Object.keys(asignacion).length > 0 && <button type="button" className="btn btn--ter btn--chico" onClick={() => setAsignacion({})}>Limpiar</button>}
        </div>
        <p className="tenue">{completa
          ? `${ganadores.length === 1 ? `Todo a ${prov(ganadores[0])?.empresa}` : `Repartido entre ${ganadores.length} proveedores`}: ${fmt.moneda(resumen!.adjudicado)} con IVA${resumen!.monto > 0 ? `, ${fmt.moneda(resumen!.monto)} menos que la oferta más alta` : ''}.`
          : `Elegí una oferta por ítem en el cuadro (${Object.keys(asignacion).length} de ${pedido.items.length}) o usá un atajo.`}</p>
        <label className="campo" htmlFor="adj-comentario">
          <span>Justificación de la decisión (opcional, sale en el resumen ejecutivo)</span>
          <textarea id="adj-comentario" rows={2} maxLength={1000} value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Ej.: se prioriza el plazo de entrega para el film." />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="form__acciones">
          <button className="btn btn--pri" disabled={!completa || enviando} onClick={adjudicar}>{enviando ? 'Adjudicando…' : 'Adjudicar'}</button>
        </div>
      </div>
    </Seccion>
  );
}
