import { useState } from 'react';
import { useQuery, useRepo } from '@/data/DataProvider';
import { PREGUNTA_MAX, PREGUNTA_MIN, RESPUESTA_MAX, puedeCotizar, recibeOfertas } from '@/domain/rfq';
import type { Consulta, PedidoCotizacion, Rol } from '@/domain/types';
import { fmt } from '@/i18n';
import { Pill, Seccion } from '@/ui/primitivas';
import { useToast } from '@/ui/Toast';

/**
 * Preguntas y respuestas del pedido. Son públicas para todos los que pueden verlo y anónimas:
 * nadie, ni el comprador, sabe qué proveedor preguntó.
 */
export function Consultas({ pedido, rol, usuarioId, esDueno }: { pedido: PedidoCotizacion; rol: Rol; usuarioId: string; esDueno: boolean }) {
  const { data: consultas = [] } = useQuery((r) => r.consultasDe(pedido.id), [pedido.id]);
  const abierto = recibeOfertas(pedido);
  const puedePreguntar = rol === 'proveedor' && abierto && puedeCotizar(pedido, usuarioId);
  const pendientes = consultas.filter((c) => !c.respuesta).length;

  if (!consultas.length && !puedePreguntar && !esDueno) return null;
  return (
    <Seccion titulo={`Consultas · ${consultas.length}`} extra={esDueno && pendientes > 0 ? <Pill tono="senal">{pendientes} sin responder</Pill> : undefined}>
      <p className="tenue">Las preguntas y respuestas las ven todos los proveedores del pedido. Nadie ve quién preguntó.</p>
      {consultas.length === 0 && <p className="tenue">Todavía no hay consultas.</p>}
      {consultas.length > 0 && (
        <ol className="consultas">
          {consultas.map((c) => <Item key={c.id} c={c} pedidoId={pedido.id} puedeResponder={esDueno} />)}
        </ol>
      )}
      {puedePreguntar && <Preguntar pedido={pedido} usuarioId={usuarioId} />}
      {rol === 'proveedor' && !abierto && <p className="tenue">El pedido cerró: ya no se pueden hacer consultas.</p>}
    </Seccion>
  );
}

function Item({ c, pedidoId, puedeResponder }: { c: Consulta; pedidoId: string; puedeResponder: boolean }) {
  const repo = useRepo();
  const avisar = useToast();
  const [texto, setTexto] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const responder = async () => {
    setError('');
    setEnviando(true);
    try {
      await repo.responderConsulta(pedidoId, c.id, texto);
      avisar('Respuesta publicada. La ven todos los proveedores del pedido.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo responder.');
    } finally {
      setEnviando(false);
    }
  };
  return (
    <li className="consulta">
      <p className="consulta__p"><span className="consulta__etq">Pregunta</span>{c.pregunta} <span className="tenue">· {fmt.fecha(c.creada)}</span></p>
      {c.respuesta
        ? <p className="consulta__r"><span className="consulta__etq">Respuesta</span>{c.respuesta} <span className="tenue">· {fmt.fecha(c.respondida!)}</span></p>
        : puedeResponder
          ? (
            <div className="consulta__form">
              <label className="campo" htmlFor={`resp-${c.id}`}>
                <span>Tu respuesta (la ven todos los proveedores)</span>
                <textarea id={`resp-${c.id}`} rows={2} maxLength={RESPUESTA_MAX} value={texto} onChange={(e) => setTexto(e.target.value)} />
              </label>
              {error && <p className="error" role="alert">{error}</p>}
              <button className="btn btn--sec btn--chico" disabled={!texto.trim() || enviando} onClick={responder}>{enviando ? 'Publicando…' : 'Responder'}</button>
            </div>
          )
          : <p className="consulta__r tenue">Sin respuesta todavía.</p>}
    </li>
  );
}

function Preguntar({ pedido, usuarioId }: { pedido: PedidoCotizacion; usuarioId: string }) {
  const repo = useRepo();
  const avisar = useToast();
  const [texto, setTexto] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const largo = texto.trim().length;
  const enviar = async () => {
    setError('');
    setEnviando(true);
    try {
      await repo.preguntar(pedido.id, texto, usuarioId);
      setTexto('');
      avisar('Consulta enviada. Sale sin tu nombre.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar la consulta.');
    } finally {
      setEnviando(false);
    }
  };
  return (
    <div className="consulta__form">
      <label className="campo" htmlFor="consulta-nueva">
        <span>Hacé una consulta (sale sin tu nombre)</span>
        <textarea id="consulta-nueva" rows={2} maxLength={PREGUNTA_MAX} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ej.: ¿Aceptan entregas parciales?" />
      </label>
      <p className="tenue">{largo < PREGUNTA_MIN ? `Mínimo ${PREGUNTA_MIN} caracteres.` : `${largo} de ${PREGUNTA_MAX}`}</p>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn btn--sec btn--chico" disabled={largo < PREGUNTA_MIN || enviando} onClick={enviar}>{enviando ? 'Enviando…' : 'Enviar consulta'}</button>
    </div>
  );
}
