import { Link } from 'react-router-dom';
import { matriz as armarMatriz } from '@/domain/rfq';
import type { Cotizacion, PedidoCotizacion, Proveedor } from '@/domain/types';
import { fmt } from '@/i18n';
import { Estrellas, Pill } from '@/ui/primitivas';
import { promedio } from '../red/TarjetaProveedor';
import { ListaEnlaces } from './Enlaces';

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
  const prov = (id: string) => provs.find((p) => p.id === id);
  const elegida = (itemId: string, provId: string) => asignacion?.[itemId] === provId;

  return (
    <div className="tabla-envoltura">
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
                          <span className="mono">{fmt.moneda(x.unitarioNeto)}</span> {x.mejor && <Pill tono="ok">Menor</Pill>}
                          <span className="tenue bloque-linea mono">{fmt.moneda(x.neto)} neto</span>
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
          <tr><th scope="row" colSpan={2}>Neto</th>{m.totales.map((t) => <td key={t.proveedorId} className="num mono">{fmt.moneda(t.neto)}</td>)}</tr>
          <tr><th scope="row" colSpan={2}>IVA</th>{m.totales.map((t) => <td key={t.proveedorId} className="num mono">{fmt.moneda(t.iva)}</td>)}</tr>
          <tr className="tabla__total"><th scope="row" colSpan={2}>Total con IVA</th>{m.totales.map((t) => <td key={t.proveedorId} className={`num mono ${m.totalMasBajo.includes(t.proveedorId) ? 'is-mejor' : ''}`}>{fmt.moneda(t.total)}</td>)}</tr>
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
  );
}
