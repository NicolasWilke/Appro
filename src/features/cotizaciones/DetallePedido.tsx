import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSesion } from '@/app/session';
import { useQuery, useRepo } from '@/data/DataProvider';
import { rubro } from '@/domain/catalogos';
import { desvioVsIndice } from '@/domain/indice';
import type { Proveedor } from '@/domain/types';
import { fmt, t } from '@/i18n';
import { Estrellas, Pill, Seccion, Vacio } from '@/ui/primitivas';
import { useToast } from '@/ui/Toast';
import { promedio } from '../red/TarjetaProveedor';
import { LecturaIndice } from './LecturaIndice';
import { CotizarModal } from './modales';

export function DetallePedido() {
  const { id = '' } = useParams();
  const { rol, usuarioId } = useSesion();
  const repo = useRepo();
  const avisar = useToast();
  const [cotizando, setCotizando] = useState(false);
  const { data, cargando } = useQuery(async (r) => {
    const pedido = await r.obtenerPedido(id);
    if (!pedido) return null;
    const [cotis, provs, indice, comprador] = await Promise.all([r.cotizacionesDe(id), r.listarProveedores(), r.indicePrecios(), r.obtenerPersona(pedido.compradorId)]);
    const avisos = await r.avisosDePedido(id);
    return { pedido, cotis, provs, ref: indice.series.find((s) => s.rubro === pedido.rubro), comprador, avisos };
  }, [id]);

  if (cargando) return <div className="envoltura pagina" />;
  if (!data) return <div className="envoltura pagina"><Vacio titulo="Este pedido no existe" accion={{ a: '/cotizaciones', texto: 'Ver pedidos' }} /></div>;

  const { pedido, cotis, provs, ref, comprador, avisos } = data;
  const esDueno = rol === 'comprador' && pedido.compradorId === usuarioId;
  const visibles = esDueno ? cotis : cotis.filter((c) => c.proveedorId === usuarioId);
  const prov = (pid: string) => provs.find((p) => p.id === pid) as Proveedor;
  const mejor = cotis.length ? Math.min(...cotis.map((c) => c.precioUnitario)) : 0;
  const yaCotice = cotis.some((c) => c.proveedorId === usuarioId);

  return (
    <div className="envoltura pagina">
      <Link to="/cotizaciones" className="enlace">← Pedidos</Link>
      <header className="pedido">
        <div>
          <p className="eyebrow"><span className="mono">{pedido.id}</span> · {rubro(pedido.rubro).nombre}</p>
          <h1>{pedido.titulo}</h1>
          {comprador && comprador.rol === 'comprador' && (
            <p>Publicado por <Link to={`/red/${comprador.id}`}>{comprador.semiAnonimo && !esDueno ? `${comprador.cargo} de ${comprador.empresa}` : `${comprador.nombre} ${comprador.apellido}, ${comprador.empresa}`}</Link></p>
          )}
        </div>
        <div>{pedido.estado === 'adjudicado' ? <Pill tono="ok">{t.estado.adjudicado}</Pill> : <Pill tono="senal">Recibe cotizaciones hasta {fmt.fecha(pedido.cierre)}</Pill>}</div>
      </header>
      <dl className="ficha-tecnica">
        <div><dt>Cantidad</dt><dd className="mono">{fmt.numero(pedido.cantidad)} {pedido.unidad}</dd></div>
        <div><dt>Entrega</dt><dd>{pedido.entrega}</dd></div>
        <div><dt>Pago</dt><dd>{pedido.pago}</dd></div>
        <div><dt>Zona</dt><dd>{pedido.zona}</dd></div>
        {ref && <div><dt>Mediana del índice</dt><dd className="mono">{fmt.moneda(ref.actual)} <span className="tenue">{ref.unidad}</span></dd></div>}
      </dl>

      {rol === 'proveedor' && pedido.estado === 'abierto' && !yaCotice && (
        <div className="llamado">
          <p>Respondé en el formato del pedido. El comprador compara precio, plazo y condiciones lado a lado.</p>
          <button className="btn btn--pri" onClick={() => setCotizando(true)}>{t.acciones.cotizar}</button>
        </div>
      )}

      <Seccion titulo={esDueno ? `Comparador · ${cotis.length} cotizaciones` : 'Tu cotización'}>
        {!esDueno && rol === 'proveedor' && <p className="tenue">Las cotizaciones de otros proveedores no se muestran. Lo que sí ves es la mediana del índice del rubro.</p>}
        {!esDueno && rol === 'comprador' && <p className="tenue">Este pedido es de otro comprador. Solo quien lo publicó ve las cotizaciones.</p>}
        {visibles.length === 0 && (esDueno || rol === 'proveedor') && <Vacio titulo="Todavía no hay cotizaciones">{esDueno ? 'Los proveedores del rubro reciben el pedido en su resumen.' : 'Mandá la tuya antes del cierre.'}</Vacio>}
        {visibles.length > 0 && (
          <div className="tabla-envoltura">
            <table className="tabla tabla--comparador">
              <thead>
                <tr><th>Proveedor</th><th className="num">Precio unitario</th><th>Contra el índice</th><th className="num">Total</th><th className="num">Plazo</th><th>Pago</th>{esDueno && <th />}</tr>
              </thead>
              <tbody>
                {visibles.map((c) => {
                  const p = prov(c.proveedorId);
                  const ganadora = pedido.adjudicadaA === c.proveedorId;
                  return (
                    <tr key={c.id} className={ganadora ? 'is-ganadora' : ''}>
                      <td>
                        <Link to={`/red/${p.id}`} className="tabla__tit">{p.empresa}</Link>
                        <span className="tenue bloque-linea">{p.nombre} {p.apellido} {promedio(p) > 0 && <Estrellas valor={promedio(p)} />}</span>
                        {c.nota && <span className="tenue bloque-linea">{c.nota}</span>}
                      </td>
                      <td className="num mono">{fmt.moneda(c.precioUnitario)} {esDueno && c.precioUnitario === mejor && cotis.length > 1 && <Pill tono="ok">Menor</Pill>}</td>
                      <td>{ref ? <LecturaIndice desvio={desvioVsIndice(c.precioUnitario, ref.actual)} /> : '—'}</td>
                      <td className="num mono">{fmt.moneda(c.precioUnitario * pedido.cantidad)}</td>
                      <td className="num mono">{c.plazoDias} d</td>
                      <td>{c.pago}</td>
                      {esDueno && (
                        <td>
                          {pedido.estado === 'abierto'
                            ? <button className="btn btn--sec btn--chico" onClick={async () => { await repo.adjudicar(pedido.id, c.id); avisar(`Adjudicado a ${p.empresa}. Cuando termine la entrega vas a poder dejar una reseña.`); }}>Adjudicar</button>
                            : ganadora && <Pill tono="ok">Elegida</Pill>}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Seccion>
      {esDueno && (
        <Seccion titulo={`Aviso a proveedores · ${avisos.length}`} extra={<Link to="/mails" className="enlace">Ver los mails</Link>}>
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
