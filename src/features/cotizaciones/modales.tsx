import { useState } from 'react';
import { useQuery, useRepo } from '@/data/DataProvider';
import { CONDICIONES_PAGO, RUBROS, rubro } from '@/domain/catalogos';
import { desvioVsIndice } from '@/domain/indice';
import type { PedidoCotizacion, RubroId } from '@/domain/types';
import { fmt } from '@/i18n';
import { Modal } from '@/ui/Modal';
import { useToast } from '@/ui/Toast';
import { LecturaIndice } from './LecturaIndice';
import { Link } from 'react-router-dom';
import { ajustar, estimarTotal, factorInflacion, tieneValor, valorDelRubro } from '@/domain/valores';
import type { Comprador } from '@/domain/types';
import { RangoValor } from '../valores/RangoValor';

export function CotizarModal({ pedido, proveedorId, onCerrar }: { pedido: PedidoCotizacion; proveedorId: string; onCerrar: () => void }) {
  const repo = useRepo();
  const avisar = useToast();
  const { data: indice } = useQuery((r) => r.indicePrecios(), []);
  const ref = indice?.series.find((s) => s.rubro === pedido.rubro);
  const [precio, setPrecio] = useState('');
  const [plazo, setPlazo] = useState('15');
  const [pago, setPago] = useState(pedido.pago);
  const [nota, setNota] = useState('');
  const [error, setError] = useState('');
  const n = Number(precio.replace(/\./g, '').replace(',', '.'));

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await repo.cotizar({ pedidoId: pedido.id, proveedorId, precioUnitario: n, plazoDias: Number(plazo), pago, nota: nota.trim() });
      avisar('Cotización enviada. El comprador la ve en el comparador, en el mismo formato que las demás.');
      onCerrar();
    } catch (err) { setError((err as Error).message); }
  };

  return (
    <Modal titulo={`Cotizar ${pedido.id}`} onCerrar={onCerrar}>
      <form className="form" onSubmit={enviar}>
        <p><strong>{pedido.titulo}</strong></p>
        <p className="tenue">{fmt.numero(pedido.cantidad)} {pedido.unidad} · {pedido.entrega} · Pago pedido: {pedido.pago}</p>
        <div className="form__fila">
          <label className="campo" htmlFor="precio">
            <span>Precio unitario ({ref?.unidad ?? 'ARS'})</span>
            <input id="precio" inputMode="decimal" className="mono" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder={ref ? fmt.numero(ref.actual) : ''} />
          </label>
          <label className="campo" htmlFor="plazo">
            <span>Plazo de entrega (días)</span>
            <input id="plazo" type="number" min={1} value={plazo} onChange={(e) => setPlazo(e.target.value)} />
          </label>
        </div>
        <label className="campo" htmlFor="pago">
          <span>Condición de pago</span>
          <select id="pago" value={pago} onChange={(e) => setPago(e.target.value)}>{CONDICIONES_PAGO.map((c) => <option key={c}>{c}</option>)}</select>
        </label>
        <label className="campo" htmlFor="nota">
          <span>Aclaraciones (opcional)</span>
          <input id="nota" maxLength={140} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej.: incluye cilindros de impresión" />
        </label>
        {ref && n > 0 && (
          <p className="nota">
            Mediana del índice: <strong className="mono">{fmt.moneda(ref.actual)}</strong>. Tu precio queda <LecturaIndice desvio={desvioVsIndice(n, ref.actual)} />
            {' '}Total estimado: <strong className="mono">{fmt.moneda(n * pedido.cantidad)}</strong>.
          </p>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        <div className="form__acciones">
          <button type="button" className="btn btn--ter" onClick={onCerrar}>Cancelar</button>
          <button className="btn btn--pri" disabled={!(n > 0)}>Enviar cotización</button>
        </div>
      </form>
    </Modal>
  );
}

export function NuevoPedidoModal({ compradorId, onCerrar, onCreado }: { compradorId: string; onCerrar: () => void; onCreado: (id: string) => void }) {
  const repo = useRepo();
  const avisar = useToast();
  const [r, setR] = useState<RubroId>('packaging');
  const [f, setF] = useState({ titulo: '', cantidad: '', entrega: '', pago: '60 días fecha factura', zona: 'Rosario', cierre: '' });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const { data: ref } = useQuery(async (rp) => ({ ...(await rp.valoresReferencia()), yo: (await rp.obtenerPersona(compradorId)) as Comprador }), [compradorId]);
  const base = ref ? valorDelRubro(ref.valores, r, ref.yo?.region) : undefined;
  const valor = base && ref ? ajustar(base, factorInflacion(base.fecha, ref.mesesIso, ref.inflacion)) : undefined;
  const cant = Number(f.cantidad) || 0;
  const valido = f.titulo.trim().length > 5 && Number(f.cantidad) > 0 && f.cierre && f.entrega.trim();

  const publicar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valido) return;
    const p = await repo.publicarPedido({ compradorId, titulo: f.titulo.trim(), rubro: r, cantidad: Number(f.cantidad), unidad: rubro(r).unidad, entrega: f.entrega.trim(), pago: f.pago, zona: f.zona.trim(), cierre: f.cierre });
    const avisos = await repo.avisosDePedido(p.id);
    const mails = avisos.filter((a) => a.via === 'mail').length;
    const resumen = avisos.length - mails;
    avisar(avisos.length
      ? `Pedido ${p.id} publicado. Avisamos por mail a ${mails} ${mails === 1 ? 'proveedor' : 'proveedores'} de ${rubro(r).nombre.toLowerCase()}${resumen ? ` y ${resumen} lo ${resumen === 1 ? 'recibe' : 'reciben'} en su resumen diario` : ''}.`
      : `Pedido ${p.id} publicado. Todavía no hay proveedores verificados en ${rubro(r).nombre.toLowerCase()}; te avisamos cuando se sumen.`);
    onCreado(p.id);
  };

  return (
    <Modal titulo="Publicar pedido de cotización" onCerrar={onCerrar} ancho={620}>
      <form className="form" onSubmit={publicar}>
        <p className="tenue">La plantilla cambia según el rubro para que todas las respuestas lleguen en el mismo formato.</p>
        <label className="campo" htmlFor="np-rubro">
          <span>Rubro</span>
          <select id="np-rubro" value={r} onChange={(e) => setR(e.target.value as RubroId)}>{RUBROS.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}</select>
        </label>
        <label className="campo" htmlFor="np-titulo"><span>Qué necesitás</span><input id="np-titulo" value={f.titulo} onChange={set('titulo')} placeholder="Ej.: Film laminado BOPP/PE impreso para galletitas" /></label>
        <div className="form__fila">
          <label className="campo" htmlFor="np-cant"><span>Cantidad ({rubro(r).unidad})</span><input id="np-cant" type="number" min={1} className="mono" value={f.cantidad} onChange={set('cantidad')} /></label>
          <label className="campo" htmlFor="np-cierre"><span>Recibís cotizaciones hasta</span><input id="np-cierre" type="date" value={f.cierre} onChange={set('cierre')} /></label>
        </div>
        {valor && (
          <div className="referencia">
            <p className="referencia__tit"><span className="etq">Valor de referencia</span> {valor.concepto}, por {valor.unidad}</p>
            <RangoValor v={valor} compacto />
            {cant > 0 && tieneValor(valor) && (() => { const t = estimarTotal(valor, cant); return <p className="tenue">Para {fmt.numero(cant)} {rubro(r).unidad}: <strong className="mono">{fmt.moneda(t.min)} – {fmt.moneda(t.max)}</strong></p>; })()}
            <Link to="/valores" className="enlace" onClick={onCerrar}>Ver todos los valores de referencia</Link>
          </div>
        )}
        <label className="campo" htmlFor="np-entrega"><span>Entrega y plazos</span><input id="np-entrega" value={f.entrega} onChange={set('entrega')} placeholder="Ej.: En planta Rosario, 30 días" /></label>
        <div className="form__fila">
          <label className="campo" htmlFor="np-pago"><span>Condición de pago</span><select id="np-pago" value={f.pago} onChange={set('pago')}>{CONDICIONES_PAGO.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="campo" htmlFor="np-zona"><span>Zona</span><input id="np-zona" value={f.zona} onChange={set('zona')} /></label>
        </div>
        <div className="form__acciones">
          <button type="button" className="btn btn--ter" onClick={onCerrar}>Cancelar</button>
          <button className="btn btn--pri" disabled={!valido}>Publicar pedido</button>
        </div>
      </form>
    </Modal>
  );
}
