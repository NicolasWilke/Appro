import { useEffect, useState } from 'react';
import { dolarOficial } from '@/data/dolar';
import { equivalente, otraMoneda } from '@/domain/moneda';
import type { Moneda, TipoCambio } from '@/domain/types';
import { fmt } from '@/i18n';

/** Dólar oficial del día para la pantalla; null mientras carga o si la fuente no responde. */
export function useDolar(activo = true) {
  const [tc, setTc] = useState<TipoCambio | null>(null);
  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    dolarOficial().then((x) => { if (vivo) setTc(x); });
    return () => { vivo = false; };
  }, [activo]);
  return tc;
}

/** "≈ $ 1.045.000 al dólar oficial BNA vendedor de $ 1.045 (31/10)". */
export function Equivalente({ monto, moneda, tc, corto = false }: { monto: number; moneda: Moneda; tc: TipoCambio | null | undefined; corto?: boolean }) {
  if (!tc || !(monto > 0)) return null;
  const otra = otraMoneda(moneda);
  const valor = fmt.importe(equivalente(monto, moneda, tc), otra);
  if (corto) return <span className="tenue bloque-linea mono" title={`${tc.fuente}: ${fmt.importe(tc.valor, 'ARS')} el ${fmt.fecha(tc.fecha)}`}>≈ {valor}</span>;
  return <span className="tenue">≈ <strong className="mono">{valor}</strong> al dólar oficial BNA vendedor de {fmt.importe(tc.valor, 'ARS')} ({fmt.fecha(tc.fecha)})</span>;
}
