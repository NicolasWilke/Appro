import { sumarMeses } from '@/domain/indicadores';
import type { PuntoSerie } from '@/domain/types';

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const mesCorto = (p: string) => `${MES[Number(p.slice(5, 7)) - 1]} ${p.slice(2, 4)}`;

/** Línea mensual de un indicador. Los meses sin dato quedan como hueco; lo pactado o proyectado va punteado. */
export function LineaSerie({ serie, extra = [], titulo }: { serie: PuntoSerie[]; extra?: PuntoSerie[]; titulo: string }) {
  const todos = [...serie, ...extra];
  if (todos.length < 2) return <p className="tenue">Hace falta más de un mes con dato para graficar.</p>;
  const desde = todos[0].periodo;
  const meses: string[] = [];
  for (let p = desde; p <= todos[todos.length - 1].periodo; p = sumarMeses(p, 1)) meses.push(p);
  const W = 640, H = 200, iz = 12, de = 12, ar = 16, ab = 26;
  const vs = todos.map((p) => p.valor);
  const [min, max] = [Math.min(...vs), Math.max(...vs)];
  const x = (p: string) => iz + (meses.indexOf(p) / Math.max(meses.length - 1, 1)) * (W - iz - de);
  const y = (v: number) => ar + (1 - (v - min) / (max - min || 1)) * (H - ar - ab);
  const tramo = (ps: PuntoSerie[]) => ps.map((p, i) => {
    const salto = i > 0 && meses.indexOf(p.periodo) - meses.indexOf(ps[i - 1].periodo) > 1;
    return `${i === 0 || salto ? 'M' : 'L'}${x(p.periodo).toFixed(1)},${y(p.valor).toFixed(1)}`;
  }).join(' ');
  const publicados = serie.filter((p) => !p.pactado);
  const futuros = [publicados[publicados.length - 1], ...serie.filter((p) => p.pactado), ...extra].filter(Boolean);
  const cada = Math.ceil(meses.length / 8);
  return (
    <figure className="grafico grafico--serie">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={titulo}>
        <path d={tramo(publicados)} className="grafico__linea" />
        {futuros.length > 1 && <path d={tramo(futuros)} className="grafico__linea grafico__linea--futuro" />}
        {todos.map((p) => <circle key={p.periodo} cx={x(p.periodo)} cy={y(p.valor)} r={3} className={p.pactado || extra.includes(p) ? 'grafico__punto--futuro' : 'grafico__punto'} />)}
        {meses.map((m, i) => (i % cada === 0 || i === meses.length - 1) && <text key={m} x={x(m)} y={H - 6} textAnchor="middle" className="grafico__eje">{mesCorto(m)}</text>)}
      </svg>
    </figure>
  );
}
