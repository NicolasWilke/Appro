import { Link } from 'react-router-dom';
import { matriz as armarMatriz } from '@/domain/rfq';
import type { Cotizacion, PedidoCotizacion, Proveedor } from '@/domain/types';
import { fmt } from '@/i18n';
import { Estrellas, Pill } from '@/ui/primitivas';
import { promedio } from '../red/TarjetaProveedor';
import { ListaEnlaces } from './Enlaces';
import { Equivalente } from './Equivalente';
import { monedaDe } from '@/domain/moneda';

/**
 * Cuadro comparativo: ítems en filas, proveedores en columnas. Marca el menor precio por ítem,
 * el total más bajo y la entrega más rápida. Con `onAsignar`, cada celda se puede elegir para adjudicar.
 */
export function Matriz({ pedido, cotis, provs, asignacion, onAsignar }: {
  pedido: PedidoCotizacion;
  cotis: Cotizacion[];
  provs: Proveedor[];
  asignacion?: Record<string, string>;
  onAsignar?: (itemId: string, proveedorId: string) => void;
}) {
  const m = armarMatriz(pedido, cotis);
  const mon = monedaDe(pedido);
  const prov = (id: string) => provs.find((p) => p.id === id);
  const elegida = (itemId: string, provId: string) => asignacion?.[itemId] === provId;

  return (
    <>
    <div className="tabla-envoltura matriz-tabla">
      <table className="tabla tabla--matriz">
        <thead>
          <tr>
            <th scope="col">Ítem</th>
            <th scope="col" className="num">Cantidad</th>
            {cotis.map((c) => {
              const p = prov(c.proveedorId);
              return (
                <th key={c.id} scope="col" className="matriz__prov">
                  {p ? <Link to={`/red/${p.id}`} className="tabla__tit">{p.empresa}</Link> : c.proveedorId}
                  {p && promedio(p) > 0 && <span className="bloque-linea"><Estrellas valor={promedio(p)} /></span>}
                  <span className="matriz__etqs">
                    {m.totalMasBajo.includes(c.proveedorId) && <Pill tono="ok">Total más bajo</Pill>}
                    {m.entregaMasRapida.includes(c.proveedorId) && <Pill tono="sello">Entrega más rápida</Pill>}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {m.filas.map(({ item, celdas }) => (
            <tr key={item.id}>
              <th scope="row">
                <span className="tabla__tit">{item.nombre}</span>
                {item.descripcion && <span className="tenue bloque-linea">{item.descripcion}</span>}
              </th>
              <td className="num mono">{fmt.numero(item.cantidad)} <span className="tenue">{item.unidad}</span></td>
              {celdas.map((x, n) => {
                const c = cotis[n];
                const sel = elegida(item.id, c.proveedorId);
                return (
                  <td key={c.id} className={`num ${sel ? 'is-elegida' : ''} ${x?.mejor ? 'is-mejor' : ''}`}>
                    {x ? (
                      <label className="matriz__celda">
                        {onAsignar && <input type="radio" name={`adj-${item.id}`} checked={sel} onChange={() => onAsignar(item.id, c.proveedorId)} aria-label={`Adjudicar ${item.nombre} a ${prov(c.proveedorId)?.empresa ?? c.proveedorId}`} />}
                        <span>
                          <span className="mono">{fmt.importe(x.unitarioNeto, mon)}</span> {x.mejor && <Pill tono="ok">Menor</Pill>}
                          <span className="tenue bloque-linea mono">{fmt.importe(x.neto, mon)} neto</span>
                        </span>
                      </label>
                    ) : '—'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><th scope="row" colSpan={2}>Neto</th>{m.totales.map((t) => <td key={t.proveedorId} className="num mono">{fmt.importe(t.neto, mon)}</td>)}</tr>
          <tr><th scope="row" colSpan={2}>IVA</th>{m.totales.map((t) => <td key={t.proveedorId} className="num mono">{fmt.importe(t.iva, mon)}</td>)}</tr>
          <tr className="tabla__total"><th scope="row" colSpan={2}>Total con IVA</th>{m.totales.map((t) => <td key={t.proveedorId} className={`num mono ${m.totalMasBajo.includes(t.proveedorId) ? 'is-mejor' : ''}`}>{fmt.importe(t.total, mon)}</td>)}</tr>
          {mon === 'USD' && (
            <tr><th scope="row" colSpan={2}>Total en pesos<span className="tenue bloque-linea">Dólar oficial BNA vendedor del día en que cotizó</span></th>{m.totales.map((t) => {
              const c = cotis.find((x) => x.proveedorId === t.proveedorId);
              return <td key={t.proveedorId} className="num">{c?.tipoCambio ? <Equivalente monto={t.total} moneda="USD" tc={c.tipoCambio} corto /> : <span className="tenue">—</span>}</td>;
            })}</tr>
          )}
          <tr><th scope="row" colSpan={2}>Plazo de entrega</th>{cotis.map((c) => <td key={c.id} className={`num mono ${m.entregaMasRapida.includes(c.proveedorId) ? 'is-mejor' : ''}`}>{c.plazoDias} d</td>)}</tr>
          <tr><th scope="row" colSpan={2}>Oferta válida hasta</th>{cotis.map((c) => <td key={c.id} className="num">{c.vigencia ? fmt.fecha(c.vigencia) : '—'}</td>)}</tr>
          <tr><th scope="row" colSpan={2}>Pago</th>{cotis.map((c) => <td key={c.id}>{c.pago}</td>)}</tr>
          <tr><th scope="row" colSpan={2}>Aclaraciones y archivos</th>{cotis.map((c) => (
            <td key={c.id} className="matriz__notas">
              {c.nota && <span className="bloque-linea">{c.nota}</span>}
              {c.adjuntos.length > 0 && <ListaEnlaces enlaces={c.adjuntos} />}
              {!c.nota && !c.adjuntos.length && <span className="tenue">—</span>}
            </td>
          ))}</tr>
        </tfoot>
      </table>
    </div>
    {/* En el celular la tabla no entra: una tarjeta por proveedor, ordenadas por total. */}
    <ol className="matriz-tarjetas">
      {[...m.totales].sort((a, b) => a.total - b.total).map((t) => {
        const n = cotis.findIndex((c) => c.proveedorId === t.proveedorId);
        const c = cotis[n];
        const p = prov(c.proveedorId);
        const todas = m.filas.every(({ item }) => elegida(item.id, c.proveedorId));
        return (
          <li key={c.id} className={`matriz-tarjeta ${m.totalMasBajo.includes(c.proveedorId) ? 'is-mejor' : ''}`}>
            <header className="matriz-tarjeta__cab">
              <div>
                {p ? <Link to={`/red/${p.id}`} className="tabla__tit">{p.empresa}</Link> : c.proveedorId}
                {p && promedio(p) > 0 && <span className="bloque-linea"><Estrellas valor={promedio(p)} /></span>}
              </div>
              <span className="matriz__etqs">
                {m.totalMasBajo.includes(c.proveedorId) && <Pill tono="ok">Total más bajo</Pill>}
                {m.entregaMasRapida.includes(c.proveedorId) && <Pill tono="sello">Entrega más rápida</Pill>}
              </span>
            </header>
            <dl className="matriz-tarjeta__datos">
              <div><dt>Total con IVA</dt><dd className="mono"><strong>{fmt.importe(t.total, mon)}</strong>{mon === 'USD' && c.tipoCambio && <Equivalente monto={t.total} moneda="USD" tc={c.tipoCambio} corto />}</dd></div>
              <div><dt>Entrega</dt><dd className="mono">{c.plazoDias} días</dd></div>
              <div><dt>Pago</dt><dd>{c.pago}</dd></div>
              <div><dt>Válida hasta</dt><dd>{c.vigencia ? fmt.fecha(c.vigencia) : '—'}</dd></div>
            </dl>
            <details>
              <summary>Precio por ítem</summary>
              <ul className="matriz-tarjeta__items">
                {m.filas.map(({ item, celdas }) => {
                  const x = celdas[n];
                  return (
                    <li key={item.id}>
                      <span>{item.nombre} <span className="tenue">· {fmt.numero(item.cantidad)} {item.unidad}</span></span>
                      <span className="mono">{x ? fmt.importe(x.unitarioNeto, mon) : '—'} {x?.mejor && <Pill tono="ok">Menor</Pill>}</span>
                    </li>
                  );
                })}
              </ul>
              {c.nota && <p className="tenue">{c.nota}</p>}
              {c.adjuntos.length > 0 && <ListaEnlaces enlaces={c.adjuntos} />}
            </details>
            {onAsignar && (
              <button type="button" className={`btn btn--chico ${todas ? 'btn--pri' : 'btn--sec'}`} onClick={() => m.filas.forEach(({ item, celdas }) => { if (celdas[n]) onAsignar(item.id, c.proveedorId); })}>
                {todas ? 'Elegida para adjudicar' : 'Elegir esta oferta'}
              </button>
            )}
          </li>
        );
      })}
    </ol>
    </>
  );
}
