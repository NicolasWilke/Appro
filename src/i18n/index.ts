import { REGION } from '@/config/region';
import { esAR } from './es-AR';

export const t = esAR;

const moneda = new Intl.NumberFormat(REGION.locale, { style: 'currency', currency: REGION.moneda, maximumFractionDigits: 0 });
const numero = new Intl.NumberFormat(REGION.locale, { maximumFractionDigits: 0 });
const dec1 = new Intl.NumberFormat(REGION.locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const usdSimbolo = new Intl.NumberFormat(REGION.locale, { style: 'currency', currency: 'USD', currencyDisplay: 'symbol', maximumFractionDigits: 2 });
const usd = new Intl.NumberFormat(REGION.locale, { style: 'currency', currency: 'USD', currencyDisplay: 'code', maximumFractionDigits: 0 });

export const fmt = {
  moneda: (n: number) => moneda.format(n),
  usd: (n: number) => usd.format(n),
  /** Importe en la moneda del pedido: pesos sin decimales, dólares con centavos (US$ 1.234,50). */
  importe: (n: number, m: 'ARS' | 'USD' = 'ARS') => (m === 'USD' ? usdSimbolo.format(n) : moneda.format(n)),
  numero: (n: number) => numero.format(n),
  pct: (n: number, signo = true) => `${signo && n > 0 ? '+' : ''}${dec1.format(n)}%`,
  fecha: (iso: string) => {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}${y !== String(new Date().getFullYear()) ? `/${y.slice(2)}` : ''}`;
  },
  diasHasta: (iso: string) => Math.ceil((new Date(iso + 'T23:59:59').getTime() - Date.now()) / 86400000),
};
