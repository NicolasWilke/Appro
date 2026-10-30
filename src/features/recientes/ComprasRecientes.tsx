import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSesion } from '@/app/session';
import { useQuery, useRepo } from '@/data/DataProvider';
import { RUBROS, rubro } from '@/domain/catalogos';
import { MENSAJE_VALOR_MAX, PLAZO_RESPUESTA_HABILES, VENTANA_DIAS, antiguedad, cantidadComparable, rangoCantidad, venceEn } from '@/domain/antecedentes';
import type { Antecedente, Proveedor, RubroId, SolicitudValor } from '@/domain/types';
import { fmt } from '@/i18n';
import { Chip, Pill, Seccion, Vacio, type TonoPill } from '@/ui/primitivas';
import { useToast } from '@/ui/Toast';

const SEMAFORO: Record<ReturnType<typeof antiguedad>['estado'], TonoPill> = { vigente: 'ok', 'por-vencer': 'senal', vencida: 'neutro' };
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const mes = (iso: string) => `${MESES[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

/**
 * Compras recientes: qué se adjudicó en la red en los últimos 90 días y a quién, sin precio ni comprador.
 * Si a otro comprador le sirve, le pide al proveedor su valor vigente en vez de armar un pedido desde cero.
 */
export function ComprasRecientes() {
  const { rol, usuarioId } = useSesion();
  const [rub, setRub] = useState<RubroId | undefined>();
  const [texto, setTexto] = useState('');
  const { data } = useQuery(async (r) => {
    if (rol !== 'comprador') return null;
    const [antecedentes, provs, mias] = await Promise.all([r.antecedentes(), r.listarProveedores(), r.solicitudesValor({ compradorId: usuarioId })]);
    return { antecedentes, provs, mias };
  }, [rol, usuarioId]);

  if (rol !== 'comprador') {
    return <div className="envoltura pagina"><Vacio titulo="Compras recientes es una herramienta para compradores">Los proveedores reciben acá los pedidos de valor desde su panel.</Vacio></div>;
  }
  if (!data) return <div className="envoltura pagina" />;
  const { antecedentes, provs, mias } = data;
  const q = texto.trim().toLowerCase();
  const lista = antecedentes.filter((a) => (!rub || a.rubro === rub) && (!q || `${a.nombre} ${a.descripcion} ${a.zona}`.toLowerCase().includes(q)));
  const prov = (id: string) => provs.find((p) => p.id === id);

  return (
    <div className="envoltura pagina">
      <header className="pagina__cab">
        <p className="eyebrow">Compras recientes</p>
        <h1>Lo que ya se compró en la red, para no empezar de cero</h1>
        <p className="tenue">Ítems adjudicados en los últimos {VENTANA_DIAS} días. El precio adjudicado nunca se muestra: si te sirve, pedile al proveedor su valor vigente. Tiene {PLAZO_RESPUESTA_HABILES} días hábiles para responder.</p>
      </header>
      <div className="filtros">
        <label className="campo campo--inline" htmlFor="rec-buscar">
          <span>Buscar</span>
          <input id="rec-buscar" type="search" placeholder="Producto, servicio o zona" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </label>
      </div>
      <div className="chips chips--filtro">
        <Chip activo={!rub} onClick={() => setRub(undefined)}>Todos los rubros</Chip>
        {RUBROS.map((r) => <Chip key={r.id} activo={rub === r.id} onClick={() => setRub(r.id)}>{r.nombre}</Chip>)}
      </div>
      {lista.length === 0 && <Vacio titulo="No hay compras recientes con esos filtros">Probá con todos los rubros o con otra palabra.</Vacio>}
      <div className="grilla-3">
        {lista.map((a) => <TarjetaAntecedente key={a.id} a={a} prov={prov(a.proveedorId)} pedida={mias.find((s) => s.antecedenteId === a.id && s.estado === 'pendiente')} />)}
      </div>
      <MisSolicitudes mias={mias} prov={prov} />
    </div>
  );
}

function TarjetaAntecedente({ a, prov, pedida }: { a: Antecedente; prov?: Proveedor; pedida?: SolicitudValor }) {
  const [abierto, setAbierto] = useState(false);
  const ant = antiguedad(a);
  const [min, max] = rangoCantidad(a.cantidad);
  return (
    <article className="tarjeta antecedente">
      <div className="antecedente__cab">
        <span className="eyebrow">{rubro(a.rubro).nombre}</span>
        <Pill tono={SEMAFORO[ant.estado]}>{ant.estado === 'por-vencer' ? `Sale en ${ant.quedan} días` : 'Vigente'}</Pill>
      </div>
      <h3>{a.nombre}</h3>
      {a.descripcion && <p className="tenue">{a.descripcion}</p>}
      <dl className="antecedente__datos">
        <div><dt>Cantidad</dt><dd className="mono">{fmt.numero(min)} a {fmt.numero(max)} {a.unidad}</dd></div>
        <div><dt>Adjudicado</dt><dd>{mes(a.adjudicado)}</dd></div>
        <div><dt>Zona</dt><dd>{a.zona}</dd></div>
        <div><dt>Comprador</dt><dd>{a.sectorComprador ? `Del sector ${a.sectorComprador.toLowerCase()}` : 'De la red'}</dd></div>
      </dl>
      <p>Proveedor: {prov ? <Link to={`/red/${prov.id}`}>{prov.empresa}</Link> : 'Proveedor de la red'} <Pill tono="neutro">Precio reservado</Pill></p>
      {pedida
        ? <p className="tenue">Ya le pediste el valor el {fmt.fecha(pedida.creada)}. Responde hasta el {fmt.fecha(venceEn(pedida.creada))}.</p>
        : abierto
          ? <SolicitarValor a={a} onListo={() => setAbierto(false)} />
          : <button className="btn btn--pri btn--chico" onClick={() => setAbierto(true)}>Solicitar valor</button>}
    </article>
  );
}

function SolicitarValor({ a, onListo }: { a: Antecedente; onListo: () => void }) {
  const { usuarioId } = useSesion();
  const repo = useRepo();
  const avisar = useToast();
  const [cantidad, setCantidad] = useState(String(a.cantidad));
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const n = Number(cantidad);
  const enviar = async () => {
    setError('');
    setEnviando(true);
    try {
      await repo.solicitarValor(a.id, usuarioId, n, mensaje);
      avisar(`Pedido enviado. El proveedor tiene hasta el ${fmt.fecha(venceEn(new Date().toISOString().slice(0, 10)))} para responder.`);
      onListo();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar el pedido.');
      setEnviando(false);
    }
  };
  return (
    <div className="antecedente__form">
      <label className="campo" htmlFor={`cant-${a.id}`}>
        <span>Cantidad que necesitás ({a.unidad})</span>
        <input id={`cant-${a.id}`} type="number" min={1} value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
      </label>
      {n > 0 && !cantidadComparable(a.cantidad, n) && <p className="nota">Es bastante distinta de la cantidad adjudicada: el valor puede cambiar. Si es mucho más, conviene un pedido de cotización.</p>}
      <label className="campo" htmlFor={`msj-${a.id}`}>
        <span>Mensaje para el proveedor (opcional)</span>
        <textarea id={`msj-${a.id}`} rows={2} maxLength={MENSAJE_VALOR_MAX} value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="Ej.: entrega en Rosario, pago a 30 días." />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="form__acciones">
        <button className="btn btn--ter btn--chico" onClick={onListo}>Cancelar</button>
        <button className="btn btn--pri btn--chico" disabled={!(n > 0) || enviando} onClick={enviar}>{enviando ? 'Enviando…' : 'Pedir valor vigente'}</button>
      </div>
    </div>
  );
}

const ESTADO: Record<SolicitudValor['estado'], [string, TonoPill]> = { pendiente: ['Esperando respuesta', 'senal'], respondida: ['Respondida', 'ok'], declinada: ['No cotizó', 'neutro'] };

function MisSolicitudes({ mias, prov }: { mias: SolicitudValor[]; prov: (id: string) => Proveedor | undefined }) {
  if (!mias.length) return null;
  return (
    <Seccion titulo={`Tus pedidos de valor · ${mias.length}`}>
      <div className="pila">
        {mias.map((s) => (
          <article key={s.id} className="solicitud">
            <div className="solicitud__cab">
              <div>
                <strong>{s.nombre}</strong>
                <span className="tenue bloque-linea">{prov(s.proveedorId)?.empresa ?? 'Proveedor'} · {fmt.numero(s.cantidad)} {s.unidad} · pedido el {fmt.fecha(s.creada)}</span>
              </div>
              <Pill tono={ESTADO[s.estado][1]}>{ESTADO[s.estado][0]}</Pill>
            </div>
            {s.estado === 'respondida' && (
              <p><strong className="mono">{fmt.moneda(s.precioUnitario!)}</strong> por {s.unidad.replace(/s$/, '')}, sin IVA · vale hasta el {fmt.fecha(s.vigencia!)}{s.nota && <> · {s.nota}</>}</p>
            )}
            {s.estado === 'pendiente' && <p className="tenue">Responde hasta el {fmt.fecha(venceEn(s.creada))}.</p>}
          </article>
        ))}
      </div>
    </Seccion>
  );
}
