import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSesion } from '@/app/session';
import { useQuery } from '@/data/DataProvider';
import { REGIONES, RUBROS, region as regionDe, rubro } from '@/domain/catalogos';
import type { FuenteValor, RegionId, RubroId, TipoValor } from '@/domain/types';
import { ajustar, estimarTotal, factorInflacion, tieneValor, valoresPara } from '@/domain/valores';
import { fmt } from '@/i18n';
import { Chip, Pill, Vacio, type TonoPill } from '@/ui/primitivas';
import { RangoValor } from './RangoValor';

const TIPOS: [TipoValor | '', string][] = [['', 'Todos'], ['hora', 'Por hora'], ['unidad', 'Por unidad'], ['proyecto', 'Por trabajo']];
const FUENTE: Record<FuenteValor, { texto: string; tono: TonoPill }> = {
  cotizaciones: { texto: 'Cotizaciones de la red', tono: 'sello' },
  arancel: { texto: 'Arancel profesional', tono: 'neutro' },
  convenio: { texto: 'Convenio colectivo', tono: 'neutro' },
  estimado: { texto: 'Estimado', tono: 'senal' },
};
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const mes = (iso = '') => (iso ? `${MES[Number(iso.slice(5, 7)) - 1]}-${iso.slice(2, 4)}` : '');

export function ValoresReferencia() {
  const { usuarioId } = useSesion();
  const { data } = useQuery((r) => r.valoresReferencia(), []);
  const { data: admin } = useQuery((r) => r.esAdmin(usuarioId), [usuarioId]);
  const [rub, setRub] = useState<RubroId | ''>('');
  const [reg, setReg] = useState<RegionId | ''>('');
  const [tipo, setTipo] = useState<TipoValor | ''>('');
  const [ajustado, setAjustado] = useState(true);
  const [calcId, setCalcId] = useState('');
  const [cantidad, setCantidad] = useState('100');

  const filas = useMemo(() => {
    if (!data) return [];
    const ultimo = data.mesesIso[data.mesesIso.length - 1];
    return valoresPara(data.valores, { rubro: rub || undefined, region: reg || undefined, tipo: tipo || undefined }).map((v) => {
      const factor = ajustado ? factorInflacion(v.fecha, data.mesesIso, data.inflacion) : 1;
      return { original: v, v: ajustar(v, factor), factor, viejo: !!v.fecha && !!ultimo && v.fecha !== ultimo };
    });
  }, [data, rub, reg, tipo, ajustado]);

  if (!data) return <div className="envoltura pagina" />;
  // Sin serie de inflación cargada (base recién creada) no se ofrece el ajuste.
  const hayFechas = data.mesesIso.length > 0 && data.valores.some((v) => v.fecha && tieneValor(v));
  const conValor = filas.filter((f) => tieneValor(f.v));
  const calc = conValor.find((f) => f.v.id === calcId) ?? conValor.find((f) => f.v.principal) ?? conValor[0];
  const cant = Number(cantidad) || 0;
  const total = calc ? estimarTotal(calc.v, cant) : null;

  return (
    <div className="envoltura pagina">
      <header className="pagina__cab">
        <p className="eyebrow">Valores de referencia</p>
        <h1>Cuánto se paga por hora, por unidad o por trabajo</h1>
        {admin && <p><Link to="/admin/valores" className="btn btn--sec btn--chico">Editar valores</Link></p>}
        <p className="tenue">Rangos para armar un requerimiento o evaluar una cotización. Son una referencia, no un precio máximo ni mínimo: cada trabajo tiene sus condiciones.</p>
      </header>

      <div className="filtros">
        <label className="campo campo--inline" htmlFor="v-region">
          <span>Región</span>
          <select id="v-region" value={reg} onChange={(e) => setReg(e.target.value as RegionId | '')}>
            <option value="">Todas</option>
            {REGIONES.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </label>
        <div className="segmento" role="group" aria-label="Tipo de valor">
          {TIPOS.map(([t, txt]) => <button key={txt} type="button" aria-pressed={tipo === t} className={tipo === t ? 'is-activo' : ''} onClick={() => setTipo(t)}>{txt}</button>)}
        </div>
        {hayFechas && <label className="opcion opcion--inline">
          <input type="checkbox" checked={ajustado} onChange={(e) => setAjustado(e.target.checked)} />
          <span>Llevar a pesos de {mes(data.mesesIso[data.mesesIso.length - 1])} por inflación</span>
        </label>}
      </div>
      <div className="chips chips--filtro">
        <Chip activo={!rub} onClick={() => setRub('')}>Todos los rubros</Chip>
        {RUBROS.map((r) => <Chip key={r.id} activo={rub === r.id} onClick={() => setRub(r.id)}>{r.nombre}</Chip>)}
      </div>

      <div className="valores">
        <div className="valores__lista">
          {filas.length === 0 && <Vacio titulo="No hay valores con esos filtros">Probá con todas las regiones o con otro tipo.</Vacio>}
          {filas.map(({ v, original, factor, viejo }) => (
            <article key={v.id} className={`valor ${calc?.v.id === v.id ? 'is-sel' : ''}`}>
              <div className="valor__cab">
                <div>
                  <h3>{v.concepto}</h3>
                  <p className="tenue">{rubro(v.rubro).nombre} · {v.region === 'nacional' ? 'Nacional' : regionDe(v.region).nombre}</p>
                </div>
                <span className="valor__unidad mono">por {v.unidad}</span>
              </div>
              <RangoValor v={v} />
              {(v.fuente || tieneValor(v)) && (
                <div className="valor__pie">
                  <span className="valor__fuente">
                    {v.fuente && <Pill tono={FUENTE[v.fuente].tono}>{FUENTE[v.fuente].texto}</Pill>}
                    {v.fuenteDetalle && <span className="tenue">{v.fuenteDetalle}</span>}
                    {v.fecha && <span className="tenue">{v.muestras ? `${v.muestras} cotizaciones · ` : ''}actualizado {mes(v.fecha)}{viejo && ajustado ? ` · ajustado ${fmt.pct((factor - 1) * 100)}` : ''}</span>}
                  </span>
                  {tieneValor(v) && <button type="button" className="enlace" onClick={() => setCalcId(v.id)}>Calcular un requerimiento</button>}
                </div>
              )}
              {viejo && !ajustado && original.fecha && <p className="nota">Valor de {mes(original.fecha)} sin ajustar.</p>}
            </article>
          ))}
        </div>

        {!calc && filas.length > 0 && (
          <aside className="calculadora">
            <h2>Estimá tu requerimiento</h2>
            <p className="tenue">La calculadora se habilita cuando haya valores cargados para estos filtros.</p>
          </aside>
        )}
        {calc && total && (
          <aside className="calculadora">
            <h2>Estimá tu requerimiento</h2>
            <label className="campo" htmlFor="calc-concepto">
              <span>Concepto</span>
              <select id="calc-concepto" value={calc.v.id} onChange={(e) => setCalcId(e.target.value)}>
                {conValor.map((f) => <option key={f.v.id} value={f.v.id}>{f.v.concepto} · {f.v.region === 'nacional' ? 'Nacional' : regionDe(f.v.region).nombre}</option>)}
              </select>
            </label>
            <label className="campo" htmlFor="calc-cant">
              <span>Cantidad ({calc.v.unidad === 'hora' ? 'horas' : calc.v.unidad})</span>
              <input id="calc-cant" type="number" min={0} className="mono" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
            </label>
            <div className="calculadora__total">
              <span className="etq">Rango esperado</span>
              <strong className="mono">{fmt.moneda(total.min)} – {fmt.moneda(total.max)}</strong>
              <span className="tenue">Mediana {fmt.moneda(total.mediana)} · sin IVA</span>
            </div>
            <Link to="/cotizaciones" className="btn btn--pri">Publicar un pedido con esta referencia</Link>
            <p className="nota">Los proveedores ven el mismo rango. Una cotización por encima no está mal si incluye más servicio; preguntá qué incluye antes de descartarla.</p>
          </aside>
        )}
      </div>
    </div>
  );
}
