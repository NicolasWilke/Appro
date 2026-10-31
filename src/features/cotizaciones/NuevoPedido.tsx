import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSesion } from '@/app/session';
import { useQuery, useRepo } from '@/data/DataProvider';
import { CONDICIONES_PAGO, RUBROS, rubro } from '@/domain/catalogos';
import { DOCUMENTOS_SUGERIDOS, HORA_CIERRE, INVITADOS_MAX, ITEMS_MAX, cierreIso } from '@/domain/rfq';
import { ajustar, estimarTotal, factorInflacion, tieneValor, valorDelRubro } from '@/domain/valores';
import type { Comprador, Enlace, ItemPedido, Moneda, RubroId } from '@/domain/types';
import { fmt } from '@/i18n';
import { Seccion, Vacio } from '@/ui/primitivas';
import { useToast } from '@/ui/Toast';
import { RangoValor } from '../valores/RangoValor';
import { EditorEnlaces } from './Enlaces';

interface FilaItem { id: string; nombre: string; descripcion: string; cantidad: string; unidad: string }
const filaNueva = (n: number, unidad: string): FilaItem => ({ id: `i${n}`, nombre: '', descripcion: '', cantidad: '', unidad });
const manana = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);

/** Formulario completo del pedido: ítems, cierre con hora, privacidad, sobre cerrado, documentos y enlaces. */
export function NuevoPedido() {
  const { rol, usuarioId } = useSesion();
  const repo = useRepo();
  const ir = useNavigate();
  const avisar = useToast();
  const [r, setR] = useState<RubroId>('packaging');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [items, setItems] = useState<FilaItem[]>([filaNueva(1, rubro('packaging').unidad)]);
  const [proximo, setProximo] = useState(2);
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState(HORA_CIERRE);
  const [entrega, setEntrega] = useState('');
  const [pago, setPago] = useState('60 días fecha factura');
  const [zona, setZona] = useState<string | null>(null);
  const [sobreCerrado, setSobreCerrado] = useState(true);
  const [moneda, setMoneda] = useState<Moneda>('ARS');
  // Desde el directorio se llega con ?invitar=a,b,c: el pedido arranca privado con esos proveedores.
  const [params] = useSearchParams();
  const preinvitados = (params.get('invitar') ?? '').split(',').filter(Boolean).slice(0, INVITADOS_MAX);
  const [privado, setPrivado] = useState(preinvitados.length > 0);
  const [invitados, setInvitados] = useState<string[]>(preinvitados);
  const [verTodos, setVerTodos] = useState(false);
  const [documentos, setDocumentos] = useState<string[]>([]);
  const [otroDoc, setOtroDoc] = useState('');
  const [adjuntos, setAdjuntos] = useState<Enlace[]>([]);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const { data } = useQuery(async (rp) => ({
    ...(await rp.valoresReferencia()),
    yo: (await rp.obtenerPersona(usuarioId)) as Comprador,
    proveedores: await rp.listarProveedores(),
    favoritos: await rp.favoritos(usuarioId),
  }), [usuarioId]);

  const base = data ? valorDelRubro(data.valores, r, data.yo?.region) : undefined;
  const valor = base && data ? ajustar(base, factorInflacion(base.fecha, data.mesesIso, data.inflacion)) : undefined;
  const cant1 = Number(items[0]?.cantidad) || 0;
  const favoritos = useMemo(() => data?.favoritos ?? [], [data]);
  // Los favoritos van primero y se muestran aunque sean de otro rubro.
  const candidatos = useMemo(() => (data?.proveedores ?? [])
    .filter((p) => verTodos || p.rubros.includes(r) || favoritos.includes(p.id) || invitados.includes(p.id))
    .sort((a, b) => Number(favoritos.includes(b.id)) - Number(favoritos.includes(a.id))), [data, r, verTodos, favoritos, invitados]);
  const sumarFavoritos = () => setInvitados([...invitados, ...favoritos.filter((f) => !invitados.includes(f))].slice(0, INVITADOS_MAX));

  if (rol !== 'comprador') return <div className="envoltura pagina"><Vacio titulo="Solo los compradores publican pedidos" accion={{ a: '/cotizaciones', texto: 'Ver pedidos' }} /></div>;

  const cambiarItem = (i: number, k: keyof FilaItem, v: string) => setItems(items.map((x, n) => (n === i ? { ...x, [k]: v } : x)));
  const sumarItem = () => { setItems([...items, filaNueva(proximo, rubro(r).unidad)]); setProximo(proximo + 1); };
  const cambiarRubro = (nuevo: RubroId) => {
    // Las unidades que siguen siendo las del rubro anterior pasan a las del nuevo.
    setItems(items.map((x) => (x.unidad === rubro(r).unidad ? { ...x, unidad: rubro(nuevo).unidad } : x)));
    setR(nuevo);
  };
  const alternar = (lista: string[], x: string) => (lista.includes(x) ? lista.filter((y) => y !== x) : [...lista, x]);

  const publicar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const its: ItemPedido[] = items.map((x) => ({ id: x.id, nombre: x.nombre.trim(), descripcion: x.descripcion.trim(), cantidad: Number(x.cantidad), unidad: x.unidad.trim() }));
    setEnviando(true);
    try {
      const p = await repo.publicarPedido({
        compradorId: usuarioId, titulo: titulo.trim(), descripcion: descripcion.trim(), rubro: r, items: its,
        cantidad: its[0]?.cantidad ?? 0, unidad: its[0]?.unidad ?? '', entrega: entrega.trim(), pago, zona: (zona ?? data?.yo?.ciudad ?? '').trim(),
        cierre: fecha, cierraEn: fecha ? cierreIso(fecha, hora) : '', privado, invitados: privado ? invitados : [], sobreCerrado,
        documentos, adjuntos, moneda,
      });
      const avisos = await repo.avisosDePedido(p.id);
      avisar(privado
        ? `Pedido ${p.id} publicado. Les avisamos a ${avisos.length} ${avisos.length === 1 ? 'proveedor invitado' : 'proveedores invitados'}.`
        : avisos.length
          ? `Pedido ${p.id} publicado. Les llega a ${avisos.length} ${avisos.length === 1 ? 'proveedor' : 'proveedores'} de ${rubro(r).nombre.toLowerCase()}.`
          : `Pedido ${p.id} publicado. Todavía no hay proveedores verificados en ${rubro(r).nombre.toLowerCase()}; te avisamos cuando se sumen.`);
      ir(`/cotizaciones/${p.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo publicar el pedido.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="envoltura pagina">
      <Link to="/cotizaciones" className="enlace">← Pedidos</Link>
      <header className="pagina__cab">
        <p className="eyebrow">Nuevo pedido de cotización</p>
        <h1>Qué necesitás, en qué cantidades y hasta cuándo recibís ofertas</h1>
        <p className="tenue">Los proveedores cotizan cada ítem en el mismo formato, así podés compararlos lado a lado.</p>
      </header>
      <form className="form pedido-form" onSubmit={publicar}>
        <Seccion titulo="1. El pedido">
          <div className="form__fila">
            <label className="campo" htmlFor="np-rubro">
              <span>Rubro</span>
              <select id="np-rubro" value={r} onChange={(e) => cambiarRubro(e.target.value as RubroId)}>{RUBROS.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}</select>
            </label>
            <label className="campo" htmlFor="np-titulo"><span>Título</span><input id="np-titulo" maxLength={140} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej.: Insumos de empaque para la línea 2" /></label>
          </div>
          <label className="campo" htmlFor="np-desc">
            <span>Descripción general (opcional)</span>
            <textarea id="np-desc" rows={2} maxLength={1000} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Contexto, condiciones o lo que no puede faltar." />
          </label>
        </Seccion>

        <Seccion titulo={`2. Ítems · ${items.length}`} extra={items.length < ITEMS_MAX && <button type="button" className="btn btn--sec btn--chico" onClick={sumarItem}>Agregar ítem</button>}>
          <p className="tenue">El proveedor no puede cambiar los ítems ni las cantidades: solo pone precio, descuento e IVA a cada uno.</p>
          <ol className="items-editor">
            {items.map((x, i) => (
              <li key={x.id} className="items-editor__fila">
                <label className="campo" htmlFor={`it-${x.id}-nombre`}><span>Ítem {i + 1}</span><input id={`it-${x.id}-nombre`} maxLength={120} value={x.nombre} onChange={(e) => cambiarItem(i, 'nombre', e.target.value)} placeholder="Ej.: Cajas de cartón corrugado" /></label>
                <label className="campo" htmlFor={`it-${x.id}-cant`}><span>Cantidad</span><input id={`it-${x.id}-cant`} type="number" min={0} step="any" className="mono" value={x.cantidad} onChange={(e) => cambiarItem(i, 'cantidad', e.target.value)} /></label>
                <label className="campo" htmlFor={`it-${x.id}-unidad`}><span>Unidad</span><input id={`it-${x.id}-unidad`} maxLength={40} value={x.unidad} onChange={(e) => cambiarItem(i, 'unidad', e.target.value)} /></label>
                <label className="campo items-editor__desc" htmlFor={`it-${x.id}-desc`}><span>Descripción técnica (opcional)</span><input id={`it-${x.id}-desc`} maxLength={500} value={x.descripcion} onChange={(e) => cambiarItem(i, 'descripcion', e.target.value)} placeholder="Medidas, normas, marca o equivalente" /></label>
                {items.length > 1 && <button type="button" className="enlace items-editor__quitar" onClick={() => setItems(items.filter((_, n) => n !== i))}>Quitar</button>}
              </li>
            ))}
          </ol>
          {valor && moneda === 'ARS' && tieneValor(valor) && (
            <div className="referencia">
              <p className="referencia__tit"><span className="etq">Valor de referencia</span> {valor.concepto}, por {valor.unidad}</p>
              <RangoValor v={valor} compacto />
              {cant1 > 0 && tieneValor(valor) && items[0].unidad === rubro(r).unidad && (() => { const t = estimarTotal(valor, cant1); return <p className="tenue">Para {fmt.numero(cant1)} {rubro(r).unidad} del ítem 1: <strong className="mono">{fmt.moneda(t.min)} – {fmt.moneda(t.max)}</strong></p>; })()}
              <Link to="/valores" className="enlace">Ver todos los valores de referencia</Link>
            </div>
          )}
        </Seccion>

        <Seccion titulo="3. Entrega, pago y cierre">
          <label className="campo" htmlFor="np-entrega"><span>Entrega: dónde y en qué plazo</span><input id="np-entrega" maxLength={140} value={entrega} onChange={(e) => setEntrega(e.target.value)} placeholder="Ej.: En planta Rosario, entregas parciales en 20 días" /></label>
          <div className="form__fila">
            <label className="campo" htmlFor="np-pago"><span>Condición de pago</span><select id="np-pago" value={pago} onChange={(e) => setPago(e.target.value)}>{CONDICIONES_PAGO.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label className="campo" htmlFor="np-zona"><span>Zona</span><input id="np-zona" maxLength={80} value={zona ?? data?.yo?.ciudad ?? ''} onChange={(e) => setZona(e.target.value)} /></label>
          </div>
          <fieldset className="campo">
            <legend>Moneda de las ofertas</legend>
            <div className="opciones-fila" role="radiogroup" aria-label="Moneda de las ofertas">
              <label className="opcion"><input type="radio" name="moneda" checked={moneda === 'ARS'} onChange={() => setMoneda('ARS')} /><span><strong>Pesos</strong>Todos cotizan en pesos argentinos.</span></label>
              <label className="opcion"><input type="radio" name="moneda" checked={moneda === 'USD'} onChange={() => setMoneda('USD')} /><span><strong>Dólares</strong>Todos cotizan en dólares. Al lado de cada total ves el equivalente en pesos al dólar oficial BNA vendedor.</span></label>
            </div>
          </fieldset>
          <div className="form__fila">
            <label className="campo" htmlFor="np-cierre"><span>Recibís ofertas hasta el</span><input id="np-cierre" type="date" min={manana()} value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
            <label className="campo" htmlFor="np-hora"><span>A las (hora de Buenos Aires)</span><input id="np-hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} /></label>
          </div>
          <label className="opcion">
            <input type="checkbox" checked={sobreCerrado} onChange={(e) => setSobreCerrado(e.target.checked)} />
            <span><strong>Sobre cerrado</strong>Ves cuántas ofertas llegan, pero los precios se abren recién al cierre. Nadie, ni vos, ve precios antes. Es lo más transparente para compras corporativas.</span>
          </label>
        </Seccion>

        <Seccion titulo="4. Quiénes cotizan">
          <div className="opciones-fila" role="radiogroup" aria-label="Privacidad del pedido">
            <label className="opcion"><input type="radio" name="privacidad" checked={!privado} onChange={() => setPrivado(false)} /><span><strong>Público</strong>Lo recibe y lo puede cotizar cualquier proveedor verificado de {rubro(r).nombre.toLowerCase()}.</span></label>
            <label className="opcion"><input type="radio" name="privacidad" checked={privado} onChange={() => setPrivado(true)} /><span><strong>Privado</strong>Solo lo ven y lo cotizan los proveedores que invites.</span></label>
          </div>
          {privado && (
            <div className="invitados">
              <div className="invitados__cab">
                <span className="tenue">{invitados.length} de hasta {INVITADOS_MAX} invitados</span>
                {favoritos.length > 0 && <button type="button" className="btn btn--sec btn--chico" onClick={sumarFavoritos} disabled={favoritos.every((f) => invitados.includes(f))}>★ Invitar a mis {favoritos.length} favoritos</button>}
                <label className="opcion opcion--inline"><input type="checkbox" checked={verTodos} onChange={(e) => setVerTodos(e.target.checked)} /><span>Ver proveedores de todos los rubros</span></label>
              </div>
              {candidatos.length === 0 && <p className="tenue">No hay proveedores en {rubro(r).nombre.toLowerCase()} todavía. Marcá "Ver proveedores de todos los rubros".</p>}
              <div className="invitados__lista">
                {candidatos.map((p) => (
                  <label key={p.id} className="opcion opcion--inline">
                    <input type="checkbox" checked={invitados.includes(p.id)} disabled={!invitados.includes(p.id) && invitados.length >= INVITADOS_MAX} onChange={() => setInvitados(alternar(invitados, p.id))} />
                    <span>{favoritos.includes(p.id) ? `★ ${p.empresa}` : p.empresa} <span className="tenue">· {p.ciudad} · {p.rubros.map((x) => rubro(x).nombre).join(', ')}</span></span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </Seccion>

        <Seccion titulo="5. Documentación">
          <fieldset className="campo">
            <legend>Documentos que el proveedor tiene que presentar con su oferta</legend>
            <div className="opciones-grilla">
              {[...DOCUMENTOS_SUGERIDOS, ...documentos.filter((d) => !DOCUMENTOS_SUGERIDOS.includes(d))].map((d) => (
                <label key={d} className="opcion opcion--inline"><input type="checkbox" checked={documentos.includes(d)} onChange={() => setDocumentos(alternar(documentos, d))} /><span>{d}</span></label>
              ))}
            </div>
            <div className="enlaces__nuevo">
              <input aria-label="Otro documento" value={otroDoc} maxLength={120} onChange={(e) => setOtroDoc(e.target.value)} placeholder="Otro documento" />
              <button type="button" className="btn btn--sec btn--chico" disabled={!otroDoc.trim() || documentos.length >= 10}
                onClick={() => { if (!documentos.includes(otroDoc.trim())) setDocumentos([...documentos, otroDoc.trim()]); setOtroDoc(''); }}>Agregar</button>
            </div>
          </fieldset>
          <EditorEnlaces id="np-adj" valor={adjuntos} onCambio={setAdjuntos} ayuda="Planos, pliegos o normativas. Subilos a Drive o Dropbox, compartilos con enlace y pegalo acá." />
        </Seccion>

        {error && <p className="error" role="alert">{error}</p>}
        <div className="form__acciones">
          <Link to="/cotizaciones" className="btn btn--ter">Cancelar</Link>
          <button className="btn btn--pri" disabled={enviando}>{enviando ? 'Publicando…' : 'Publicar pedido'}</button>
        </div>
      </form>
    </div>
  );
}
