import type { ValorReferencia } from '@/domain/types';
import { tieneValor } from '@/domain/valores';
import { fmt } from '@/i18n';

/** Barra mínimo–máximo con la mediana marcada. Escala propia de cada fila. */
export function RangoValor({ v, compacto = false }: { v: Pick<ValorReferencia, 'min' | 'mediana' | 'max'>; compacto?: boolean }) {
  if (!tieneValor(v)) return <p className="rango rango--vacio">Valor a definir</p>;
  const pos = v.max > v.min ? ((v.mediana - v.min) / (v.max - v.min)) * 100 : 50;
  return (
    <div className={`rango ${compacto ? 'rango--compacto' : ''}`}>
      <div className="rango__barra" aria-hidden="true"><span className="rango__mediana" style={{ left: `${pos}%` }} /></div>
      <div className="rango__nums mono">
        <span>{fmt.moneda(v.min)}</span>
        <strong>{fmt.moneda(v.mediana)}</strong>
        <span>{fmt.moneda(v.max)}</span>
      </div>
    </div>
  );
}
