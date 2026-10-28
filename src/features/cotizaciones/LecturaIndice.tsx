import { leerDesvio } from '@/domain/indice';
import { fmt } from '@/i18n';
import { Pill } from '@/ui/primitivas';

const TEXTO = { debajo: 'debajo del índice', 'en-rango': 'en rango', arriba: 'arriba del índice' } as const;
const TONO = { debajo: 'ok', 'en-rango': 'neutro', arriba: 'mal' } as const;

export function LecturaIndice({ desvio }: { desvio: number }) {
  const l = leerDesvio(desvio);
  return <Pill tono={TONO[l]}><span className="mono">{fmt.pct(desvio)}</span> {TEXTO[l]}</Pill>;
}
