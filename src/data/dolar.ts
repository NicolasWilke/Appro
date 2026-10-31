import { leerDolar } from '@/domain/moneda';
import type { TipoCambio } from '@/domain/types';

/** Fuente pública y gratuita del dólar oficial del Banco Nación (vendedor). Se consulta desde el navegador. */
const FUENTE = 'https://dolarapi.com/v1/dolares/oficial';
let cache: { tc: TipoCambio; hora: number } | null = null;

/** Dólar oficial del día. Devuelve null si la fuente no responde: la app sigue funcionando sin equivalente. */
export async function dolarOficial(): Promise<TipoCambio | null> {
  if (cache && Date.now() - cache.hora < 30 * 60 * 1000) return cache.tc;
  try {
    const ctl = new AbortController();
    const corte = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch(FUENTE, { signal: ctl.signal });
    clearTimeout(corte);
    if (!r.ok) return null;
    const tc = leerDolar(await r.json());
    if (tc) cache = { tc, hora: Date.now() };
    return tc;
  } catch {
    return null;
  }
}
