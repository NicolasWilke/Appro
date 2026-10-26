import { useState } from 'react';
import { useQuery } from '@/data/DataProvider';
import { rubro } from '@/domain/catalogos';
import { acumulada, variacionReal } from '@/domain/indice';
import type { RubroId } from '@/domain/types';
import { fmt } from '@/i18n';
import { Chip, Pill } from '@/ui/primitivas';
import { GraficoIndice } from './GraficoIndice';

export function IndicePrecios() {
  const { data } = useQuery((r) => r.indicePrecios(), []);
  const [sel, setSel] = useState<RubroId>('packaging');
  if (!data) return <div className="envoltura pagina" />;
  const s = data.series.find((x) => x.rubro === sel)!;
  const infl12 = acumulada(data.inflacion);
  const nom12 = acumulada(s.variaciones);
  const real12 = variacionReal(nom12, infl12);
  const mes = s.variaciones[s.variaciones.length - 1];
  const inflMes = data.inflacion[data.inflacion.length - 1];

  return (
    <div className="envoltura pagina">
      <header className="pagina__cab">
        <p className="eyebrow">Índice de precios por rubro · {data.meses[data.meses.length - 1]}</p>
        <h1>Cuánto cuesta lo que comprás, en términos reales</h1>
        <p className="tenue">Medianas de las cotizaciones recibidas en la red, anonimizadas, contra la inflación mensual. Datos ilustrativos en este prototipo.</p>
      </header>
      <div className="chips chips--filtro">
        {data.series.map((x) => <Chip key={x.rubro} activo={x.rubro === sel} onClick={() => setSel(x.rubro)}>{rubro(x.rubro).nombre}</Chip>)}
      </div>
      <div className="indice">
        <div className="indice__kpis">
          <div className="kpi"><span className="kpi__k">{s.item}</span><span className="kpi__v mono">{fmt.moneda(s.actual)}</span><span className="tenue">{s.unidad} · mediana de {s.muestras} cotizaciones</span></div>
          <div className="kpi"><span className="kpi__k">Último mes</span><span className="kpi__v mono">{fmt.pct(mes)}</span><span className="tenue">Inflación {fmt.pct(inflMes)}</span></div>
          <div className="kpi"><span className="kpi__k">12 meses, nominal</span><span className="kpi__v mono">{fmt.pct(nom12)}</span><span className="tenue">Inflación {fmt.pct(infl12)}</span></div>
          <div className="kpi"><span className="kpi__k">12 meses, real</span><span className="kpi__v mono">{fmt.pct(real12)}</span>
            <Pill tono={real12 > 1 ? 'mal' : real12 < -1 ? 'ok' : 'neutro'}>{real12 > 1 ? 'Se encareció' : real12 < -1 ? 'Se abarató' : 'Acompañó la inflación'}</Pill></div>
        </div>
        <div className="indice__grafico">
          <p className="leyenda"><span className="leyenda__precio" /> Precio del rubro <span className="leyenda__ipc" /> Inflación · base 100 = {data.meses[0]}</p>
          <GraficoIndice serie={s} inflacion={data.inflacion} meses={data.meses} />
        </div>
      </div>
      <div className="tabla-envoltura">
        <table className="tabla">
          <thead><tr><th>Rubro</th><th>Ítem de referencia</th><th className="num">Mediana</th><th className="num">Mes</th><th className="num">12 m nominal</th><th className="num">12 m real</th><th className="num">Muestras</th></tr></thead>
          <tbody>
            {data.series.map((x) => {
              const n = acumulada(x.variaciones);
              const r = variacionReal(n, infl12);
              return (
                <tr key={x.rubro} className={x.rubro === sel ? 'is-sel' : ''} onClick={() => setSel(x.rubro)}>
                  <td><button type="button" className="enlace" onClick={() => setSel(x.rubro)}>{rubro(x.rubro).nombre}</button></td>
                  <td>{x.item} <span className="tenue">{x.unidad}</span></td>
                  <td className="num mono">{fmt.moneda(x.actual)}</td>
                  <td className="num mono">{fmt.pct(x.variaciones[x.variaciones.length - 1])}</td>
                  <td className="num mono">{fmt.pct(n)}</td>
                  <td className={`num mono ${r > 1 ? 'txt-mal' : r < -1 ? 'txt-ok' : ''}`}>{fmt.pct(r)}</td>
                  <td className="num mono tenue">{x.muestras}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="nota">Cada celda necesita un mínimo de cotizaciones para publicarse, así ningún precio individual se puede identificar.</p>
    </div>
  );
}
