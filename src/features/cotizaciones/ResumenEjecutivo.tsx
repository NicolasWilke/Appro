import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSesion } from '@/app/session';
import { useQuery } from '@/data/DataProvider';
import { rubro } from '@/domain/catalogos';
import { ahorro, horaDeCierre, matriz, preciosVisibles, totales } from '@/domain/rfq';
import type { Comprador, Cotizacion } from '@/domain/types';
import { fmt } from '@/i18n';
import { Vacio } from '@/ui/primitivas';

const hoy = () => new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

/**
 * Resumen ejecutivo de un pedido, en 4 secciones fijas, listo para imprimir o guardar como PDF
 * desde el navegador. Solo lo ve el comprador, y solo cuando los precios ya se abrieron.
 */
export function ResumenEjecutivo() {
  const { id = '' } = useParams();
  const { usuarioId } = useSesion();
  const [soloFinalistas, setSoloFinalistas] = useState(false);
  const { data, cargando } = useQuery(async (r) => {
    const pedido = await r.obtenerPedido(id);
    if (!pedido || pedido.compradorId !== usuarioId) return null;
    const [cotis, provs, comprador, avisos] = await Promise.all([r.cotizacionesDe(id), r.listarProveedores(), r.obtenerPersona(usuarioId), r.avisosDePedido(id)]);
    return { pedido, cotis, provs, comprador: comprador as Comprador, avisos };
  }, [id, usuarioId]);

  if (cargando) return <div className="envoltura pagina" />;
  if (!data) return <div className="envoltura pagina"><Vacio titulo="Solo quien publicó el pedido ve su resumen" accion={{ a: '/cotizaciones', texto: 'Ver pedidos' }} /></div>;
  const { pedido, cotis, provs, comprador, avisos } = data;
  if (!preciosVisibles(pedido)) {
    return <div className="envoltura pagina"><Vacio titulo="El resumen está disponible después del cierre" accion={{ a: `/cotizaciones/${pedido.id}`, texto: 'Volver al pedido' }}>Es sobre cerrado: los precios se abren el {fmt.fecha(pedido.cierre)} a las {horaDeCierre(pedido.cierraEn)}.</Vacio></div>;
  }

  const asig = pedido.adjudicacion ?? {};
  const ganadores = pedido.adjudicados ?? [];
  const porTotal = [...cotis].sort((a, b) => totales(pedido, a).total - totales(pedido, b).total);
  const finalistas = [...new Set([...ganadores, ...porTotal.slice(0, 3).map((c) => c.proveedorId)])];
  const columnas: Cotizacion[] = soloFinalistas ? porTotal.filter((c) => finalistas.includes(c.proveedorId)) : porTotal;
  const m = matriz(pedido, columnas);
  const a = ahorro(pedido, cotis, asig);
  const empresa = (pid: string) => provs.find((p) => p.id === pid)?.empresa ?? pid;
  const prov = (pid: string) => provs.find((p) => p.id === pid);

  const asunto = `Resumen ejecutivo ${pedido.id}: ${pedido.titulo}`;
  const cuerpo = [
    `Resumen ejecutivo del pedido ${pedido.id} (${pedido.titulo}).`, '',
    `Ofertas recibidas: ${cotis.length}.`,
    ganadores.length ? `Adjudicado a: ${ganadores.map(empresa).join(', ')}, por ${fmt.moneda(a.adjudicado)} con IVA.` : 'Todavía sin adjudicar.',
    a.monto > 0 && ganadores.length ? `Ahorro contra la oferta más alta: ${fmt.moneda(a.monto)} (${fmt.pct(a.pct, false)}).` : '',
    '', 'El detalle completo va en el PDF adjunto.',
  ].filter((x, i, xs) => x !== '' || xs[i - 1] !== '').join('\n');

  return (
    <div className="envoltura pagina resumen">
      <div className="resumen__barra no-imprimir">
        <Link to={`/cotizaciones/${pedido.id}`} className="enlace">← Volver al pedido</Link>
        <div className="resumen__acciones">
          <label className="opcion opcion--inline"><input type="checkbox" checked={soloFinalistas} onChange={(e) => setSoloFinalistas(e.target.checked)} /><span>Solo los 3 finalistas</span></label>
          <button className="btn btn--sec btn--chico" onClick={() => window.print()}>Imprimir o guardar PDF</button>
          <a className="btn btn--pri btn--chico" href={`mailto:?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`}>Enviar por correo</a>
        </div>
        <p className="tenue resumen__ayuda">Para mandarlo por correo, primero guardalo como PDF y después adjuntalo al mail que se abre.</p>
      </div>

      <article className="hoja">
        <header className="hoja__cab">
          <div>
            <p className="etq">Resumen ejecutivo</p>
            <h1>{pedido.titulo}</h1>
            <p className="tenue">{rubro(pedido.rubro).nombre}{pedido.descripcion ? ` · ${pedido.descripcion}` : ''}</p>
          </div>
          <p className="hoja__id mono">#{pedido.id}</p>
        </header>

        <section className="hoja__sec">
          <h2>1. Información de control</h2>
          <dl className="hoja__datos">
            <div><dt>Comprador</dt><dd>{comprador.empresa}</dd></div>
            <div><dt>Usuario</dt><dd>{comprador.nombre} {comprador.apellido}, {comprador.cargo}</dd></div>
            <div><dt>Cierre de ofertas</dt><dd>{fmt.fecha(pedido.cierre)} {horaDeCierre(pedido.cierraEn)}</dd></div>
            <div><dt>Reporte generado</dt><dd>{hoy()}</dd></div>
            <div><dt>Modalidad</dt><dd>{pedido.privado ? 'Privada, por invitación' : 'Pública'}{pedido.sobreCerrado ? ' · sobre cerrado' : ''}</dd></div>
            <div><dt>Entrega y pago pedidos</dt><dd>{pedido.entrega} · {pedido.pago}</dd></div>
          </dl>
        </section>

        <section className="hoja__sec">
          <h2>2. Participación</h2>
          <div className="hoja__kpis">
            <div className="kpi"><span className="kpi__k">{pedido.privado ? 'Proveedores invitados' : 'Proveedores notificados'}</span><span className="kpi__v mono">{pedido.privado ? pedido.invitados.length : avisos.length}</span></div>
            <div className="kpi"><span className="kpi__k">Ofertas recibidas</span><span className="kpi__v mono">{cotis.length}</span></div>
            <div className="kpi"><span className="kpi__k">Ahorro estimado</span><span className="kpi__v mono">{ganadores.length ? fmt.moneda(a.monto) : '—'}</span><span className="tenue">{ganadores.length ? `${fmt.pct(a.pct, false)} contra la oferta más alta` : 'Se calcula al adjudicar'}</span></div>
          </div>
        </section>

        <section className="hoja__sec">
          <h2>3. Matriz de comparación{soloFinalistas && cotis.length > columnas.length ? ` · ${columnas.length} finalistas de ${cotis.length}` : ''}</h2>
          {columnas.length === 0 ? <p className="tenue">No llegaron ofertas.</p> : (
            <table className="hoja__tabla">
              <thead>
                <tr><th>Ítem</th><th className="num">Cantidad</th>{columnas.map((c) => <th key={c.id} className="num">{empresa(c.proveedorId)}</th>)}</tr>
              </thead>
              <tbody>
                {m.filas.map(({ item, celdas }) => (
                  <tr key={item.id}>
                    <td>{item.nombre}</td>
                    <td className="num">{fmt.numero(item.cantidad)} {item.unidad}</td>
                    {celdas.map((x, n) => (
                      <td key={columnas[n].id} className={`num ${x?.mejor ? 'is-mejor' : ''} ${asig[item.id] === columnas[n].proveedorId ? 'is-elegida' : ''}`}>
                        {x ? fmt.moneda(x.unitarioNeto) : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={2}>Neto</td>{m.totales.map((t) => <td key={t.proveedorId} className="num">{fmt.moneda(t.neto)}</td>)}</tr>
                <tr><td colSpan={2}>IVA</td>{m.totales.map((t) => <td key={t.proveedorId} className="num">{fmt.moneda(t.iva)}</td>)}</tr>
                <tr className="hoja__total"><td colSpan={2}>Total con IVA</td>{m.totales.map((t) => <td key={t.proveedorId} className={`num ${m.totalMasBajo.includes(t.proveedorId) ? 'is-mejor' : ''}`}>{fmt.moneda(t.total)}</td>)}</tr>
                <tr><td colSpan={2}>Plazo de entrega</td>{columnas.map((c) => <td key={c.id} className="num">{c.plazoDias} días</td>)}</tr>
              </tfoot>
            </table>
          )}
          <p className="hoja__nota">Precios unitarios netos de descuento, sin IVA. En verde, el menor precio de cada fila y el total más bajo{ganadores.length ? '; con borde, lo adjudicado' : ''}.</p>
        </section>

        <section className="hoja__sec">
          <h2>4. Adjudicación y términos comerciales</h2>
          {ganadores.length === 0 && <p className="tenue">El pedido todavía no se adjudicó.</p>}
          {ganadores.map((pid) => {
            const c = cotis.find((x) => x.proveedorId === pid);
            const items = pedido.items.filter((i) => asig[i.id] === pid);
            const p = prov(pid);
            return (
              <dl key={pid} className="hoja__datos hoja__ganador">
                <div><dt>Proveedor</dt><dd><strong>{empresa(pid)}</strong>{p ? ` · ${p.nombre} ${p.apellido}, ${p.cargo}` : ''}</dd></div>
                <div><dt>Ítems</dt><dd>{items.length === pedido.items.length ? 'Todo el pedido' : items.map((i) => i.nombre).join(', ')}</dd></div>
                {c && <div><dt>Monto con IVA</dt><dd>{fmt.moneda(totales(pedido, c, items.map((i) => i.id)).total)}</dd></div>}
                {c && <div><dt>Entrega</dt><dd>{c.plazoDias} días</dd></div>}
                {c && <div><dt>Vigencia de la oferta</dt><dd>{c.vigencia ? fmt.fecha(c.vigencia) : '—'}</dd></div>}
                {c && <div><dt>Pago</dt><dd>{c.pago}</dd></div>}
              </dl>
            );
          })}
          {pedido.comentarioAdjudicacion && <div className="hoja__comentario"><p className="etq">Comentarios del comprador</p><p>{pedido.comentarioAdjudicacion}</p></div>}
        </section>
        <footer className="hoja__pie">Generado con Proveo el {hoy()}. Los precios de proveedores no adjudicados son confidenciales: no compartas este reporte fuera de tu empresa.</footer>
      </article>
    </div>
  );
}
