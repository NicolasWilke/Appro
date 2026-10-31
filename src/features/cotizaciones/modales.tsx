import { useState } from 'react';
import { useQuery, useRepo } from '@/data/DataProvider';
import { CONDICIONES_PAGO } from '@/domain/catalogos';
import { desvioVsIndice } from '@/domain/indice';
import { IVAS, horaDeCierre, linea } from '@/domain/rfq';
import type { Enlace, ItemCotizado, PedidoCotizacion } from '@/domain/types';
import { fmt } from '@/i18n';
import { Modal } from '@/ui/Modal';
import { useToast } from '@/ui/Toast';
import { EditorEnlaces } from './Enlaces';
import { Equivalente, useDolar } from './Equivalente';
import { monedaDe } from '@/domain/moneda';
import { LecturaIndice } from './LecturaIndice';

const aNumero = (s: string) => Number(s.replace(/\./g, '').replace(',', '.'));
const enDias = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

/** El proveedor cotiza cada ítem: precio, descuento e IVA. Los ítems y cantidades no se tocan. */
export function CotizarModal({ pedido, proveedorId, onCerrar }: { pedido: PedidoCotizacion; proveedorId: string; onCerrar: () => void }) {
  const repo = useRepo();
  const avisar = useToast();
  const { data: indice } = useQuery((r) => r.indicePrecios(), []);
  const mon = monedaDe(pedido);
  // El índice está en pesos: solo sirve de referencia en pedidos en pesos.
  const ref = pedido.items.length === 1 && mon === 'ARS' ? indice?.series.find((s) => s.rubro === pedido.rubro) : undefined;
  const dolar = useDolar();
  const [precios, setPrecios] = useState(() => Object.fromEntries(pedido.items.map((i) => [i.id, { precio: '', descuento: '0', iva: '21' }])));
  const [plazo, setPlazo] = useState('15');
  const [vigencia, setVigencia] = useState(enDias(15));
  const [pago, setPago] = useState(pedido.pago);
  const [nota, setNota] = useState('');
  const [adjuntos, setAdjuntos] = useState<Enlace[]>([]);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const items: ItemCotizado[] = pedido.items.map((i) => ({
    itemId: i.id, precioUnitario: aNumero(precios[i.id].precio), descuento: aNumero(precios[i.id].descuento) || 0, iva: Number(precios[i.id].iva),
  }));
  const lineas = pedido.items.map((i, n) => (items[n].precioUnitario > 0 ? linea(i, items[n]) : null));
  const neto = lineas.reduce((s, l) => s + (l?.neto ?? 0), 0);
  const iva = lineas.reduce((s, l) => s + (l?.iva ?? 0), 0);
  const completos = lineas.every(Boolean);
  const set = (id: string, k: 'precio' | 'descuento' | 'iva', v: string) => setPrecios({ ...precios, [id]: { ...precios[id], [k]: v } });

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await repo.cotizar({
        pedidoId: pedido.id, proveedorId, items, precioUnitario: lineas[0]?.unitarioNeto ?? 0,
        plazoDias: Number(plazo), vigencia, pago, nota: nota.trim(), adjuntos,
        ...(dolar ? { tipoCambio: dolar } : {}),
      });
      avisar(pedido.sobreCerrado
        ? `Oferta enviada y sellada. El comprador ve que cotizaste, pero tus precios recién al cierre (${fmt.fecha(pedido.cierre)} ${horaDeCierre(pedido.cierraEn)}).`
        : 'Oferta enviada. El comprador la ve en el comparador, en el mismo formato que las demás.');
      onCerrar();
    } catch (err) { setError((err as Error).message); } finally { setEnviando(false); }
  };

  return (
    <Modal titulo={`Cotizar ${pedido.id}`} onCerrar={onCerrar} ancho={820}>
      <form className="form" onSubmit={enviar}>
        <p><strong>{pedido.titulo}</strong></p>
        <p className="tenue">{pedido.entrega} · Pago pedido: {pedido.pago} · Cierra {fmt.fecha(pedido.cierre)} {horaDeCierre(pedido.cierraEn)}</p>
        <div className="tabla-envoltura">
          <table className="tabla tabla--cotizar">
            <thead><tr><th>Ítem</th><th className="num">Cantidad</th><th className="num">Precio unitario{mon === 'USD' ? ' (US$)' : ''}</th><th className="num">Desc. %</th><th>IVA</th><th className="num">Subtotal neto</th></tr></thead>
            <tbody>
              {pedido.items.map((i, n) => (
                <tr key={i.id}>
                  <td><span className="tabla__tit">{i.nombre}</span>{i.descripcion && <span className="tenue bloque-linea">{i.descripcion}</span>}</td>
                  <td className="num mono">{fmt.numero(i.cantidad)} <span className="tenue">{i.unidad}</span></td>
                  <td className="num"><input aria-label={`Precio unitario de ${i.nombre}`} inputMode="decimal" className="mono entrada-num" value={precios[i.id].precio} onChange={(e) => set(i.id, 'precio', e.target.value)} placeholder={ref ? fmt.numero(ref.actual) : '0'} /></td>
                  <td className="num"><input aria-label={`Descuento de ${i.nombre}`} inputMode="decimal" className="mono entrada-num entrada-num--chica" value={precios[i.id].descuento} onChange={(e) => set(i.id, 'descuento', e.target.value)} /></td>
                  <td><select className="entrada-iva" aria-label={`IVA de ${i.nombre}`} value={precios[i.id].iva} onChange={(e) => set(i.id, 'iva', e.target.value)}>{IVAS.map((x) => <option key={x} value={x}>{fmt.numero(x)} %</option>)}</select></td>
                  <td className="num mono">{lineas[n] ? fmt.importe(lineas[n]!.neto, mon) : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={5}>Neto</td><td className="num mono">{fmt.importe(neto, mon)}</td></tr>
              <tr><td colSpan={5}>IVA</td><td className="num mono">{fmt.importe(iva, mon)}</td></tr>
              <tr className="tabla__total"><td colSpan={5}>Total{!completos && <span className="tenue"> · faltan precios</span>}</td><td className="num mono">{fmt.importe(neto + iva, mon)}</td></tr>
            </tfoot>
          </table>
        </div>
        {mon === 'USD' && <p className="nota">Este pedido se cotiza en <strong>dólares</strong>.{neto > 0 && <> <Equivalente monto={neto + iva} moneda="USD" tc={dolar} /></>}{!dolar && ' El equivalente en pesos aparece cuando carga el dólar del día.'}</p>}
        {ref && lineas[0] && (
          <p className="nota">Mediana del índice: <strong className="mono">{fmt.moneda(ref.actual)}</strong>. Tu precio neto queda <LecturaIndice desvio={desvioVsIndice(lineas[0].unitarioNeto, ref.actual)} /></p>
        )}
        <div className="form__fila">
          <label className="campo" htmlFor="cot-plazo"><span>Plazo de entrega (días)</span><input id="cot-plazo" type="number" min={0} max={365} value={plazo} onChange={(e) => setPlazo(e.target.value)} /></label>
          <label className="campo" htmlFor="cot-vig"><span>Oferta válida hasta</span><input id="cot-vig" type="date" min={enDias(0)} value={vigencia} onChange={(e) => setVigencia(e.target.value)} /></label>
        </div>
        <label className="campo" htmlFor="cot-pago">
          <span>Condición de pago</span>
          <select id="cot-pago" value={pago} onChange={(e) => setPago(e.target.value)}>{[...new Set([pedido.pago, ...CONDICIONES_PAGO])].map((c) => <option key={c}>{c}</option>)}</select>
        </label>
        <label className="campo" htmlFor="cot-nota">
          <span>Aclaraciones (opcional)</span>
          <input id="cot-nota" maxLength={500} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej.: 50% anticipo, 50% contra entrega" />
        </label>
        {pedido.documentos.length > 0 && (
          <p className="nota">El comprador pide: <strong>{pedido.documentos.join(', ')}</strong>. Sumalos como enlaces acá abajo.</p>
        )}
        <EditorEnlaces id="cot-adj" valor={adjuntos} onCambio={setAdjuntos} ayuda="Tu cotización formal en PDF o los certificados, compartidos desde Drive o Dropbox." />
        {error && <p className="error" role="alert">{error}</p>}
        <p className="tenue">Al enviar, la oferta queda guardada y no se puede editar.</p>
        <div className="form__acciones">
          <button type="button" className="btn btn--ter" onClick={onCerrar}>Cancelar</button>
          <button className="btn btn--pri" disabled={!completos || enviando}>{enviando ? 'Enviando…' : 'Enviar oferta'}</button>
        </div>
      </form>
    </Modal>
  );
}
