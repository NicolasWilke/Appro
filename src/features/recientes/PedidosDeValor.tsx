import { useState } from 'react';
import { useSesion } from '@/app/session';
import { useQuery, useRepo } from '@/data/DataProvider';
import { venceEn } from '@/domain/antecedentes';
import type { SolicitudValor } from '@/domain/types';
import { fmt } from '@/i18n';
import { Pill, Seccion } from '@/ui/primitivas';
import { useToast } from '@/ui/Toast';

/** Panel del proveedor: compradores que vieron una compra que ganó y le piden su valor vigente. */
export function PedidosDeValor() {
  const { usuarioId } = useSesion();
  const { data } = useQuery(async (r) => {
    const [sols, comps] = await Promise.all([r.solicitudesValor({ proveedorId: usuarioId }), r.listarCompradores()]);
    return { sols, comps };
  }, [usuarioId]);
  if (!data || !data.sols.length) return null;
  const pendientes = data.sols.filter((s) => s.estado === 'pendiente');
  const empresa = (id: string) => data.comps.find((c) => c.id === id)?.empresa ?? 'Un comprador de la red';
  return (
    <Seccion titulo="Pedidos de valor" extra={pendientes.length ? <Pill tono="senal">{pendientes.length} por responder</Pill> : undefined}>
      <p className="tenue">Te los mandan compradores que vieron en Compras recientes algo que ganaste. Tu precio adjudicado no lo vio nadie: informás el valor que quieras, solo a quien lo pidió.</p>
      <div className="pila">
        {data.sols.map((s) => <Pedido key={s.id} s={s} empresa={empresa(s.compradorId)} />)}
      </div>
    </Seccion>
  );
}

function Pedido({ s, empresa }: { s: SolicitudValor; empresa: string }) {
  const repo = useRepo();
  const avisar = useToast();
  const [precio, setPrecio] = useState('');
  const [vigencia, setVigencia] = useState('');
  const [nota, setNota] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const responder = async (r: Parameters<typeof repo.responderValor>[1]) => {
    setError('');
    setEnviando(true);
    try {
      await repo.responderValor(s.id, r);
      avisar(r ? `Le mandaste tu valor a ${empresa}.` : 'Listo, no se le informa ningún valor.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo responder.');
      setEnviando(false);
    }
  };
  return (
    <article className="solicitud">
      <div className="solicitud__cab">
        <div>
          <strong>{s.nombre}</strong>
          <span className="tenue bloque-linea">{empresa} · {fmt.numero(s.cantidad)} {s.unidad} · {fmt.fecha(s.creada)}</span>
        </div>
        {s.estado === 'pendiente'
          ? <Pill tono="senal">Respondé hasta el {fmt.fecha(venceEn(s.creada))}</Pill>
          : <Pill tono={s.estado === 'respondida' ? 'ok' : 'neutro'}>{s.estado === 'respondida' ? 'Respondida' : 'No cotizaste'}</Pill>}
      </div>
      {s.estado === 'respondida' && <p className="tenue">Informaste <strong className="mono">{fmt.moneda(s.precioUnitario!)}</strong> sin IVA, vale hasta el {fmt.fecha(s.vigencia!)}.</p>}
      {s.mensaje && <blockquote className="motivo">{s.mensaje}</blockquote>}
      {s.estado === 'pendiente' && (
        <div className="antecedente__form">
          <div className="form__fila">
            <label className="campo" htmlFor={`pv-${s.id}`}>
              <span>Valor unitario sin IVA</span>
              <input id={`pv-${s.id}`} type="number" min={0} value={precio} onChange={(e) => setPrecio(e.target.value)} />
            </label>
            <label className="campo" htmlFor={`vg-${s.id}`}>
              <span>Vale hasta</span>
              <input id={`vg-${s.id}`} type="date" value={vigencia} onChange={(e) => setVigencia(e.target.value)} />
            </label>
          </div>
          <label className="campo" htmlFor={`nt-${s.id}`}>
            <span>Nota (opcional)</span>
            <input id={`nt-${s.id}`} maxLength={500} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej.: entrega en 5 días hábiles." />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="form__acciones">
            <button className="btn btn--ter btn--chico" disabled={enviando} onClick={() => responder(null)}>No cotizar</button>
            <button className="btn btn--pri btn--chico" disabled={!(Number(precio) > 0) || !vigencia || enviando} onClick={() => responder({ precioUnitario: Number(precio), vigencia, nota })}>Enviar valor</button>
          </div>
        </div>
      )}
    </article>
  );
}
