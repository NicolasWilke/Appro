const PESOS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
const PREFIJOS = ['20', '23', '24', '27', '30', '33', '34'];

export const limpiarCuit = (valor: string) => valor.replace(/\D/g, '');

export function formatearCuit(valor: string): string {
  const d = limpiarCuit(valor).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 10) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`;
}

export function digitoVerificador(diez: string): number | null {
  const suma = PESOS.reduce((acc, p, i) => acc + p * Number(diez[i]), 0);
  const resto = 11 - (suma % 11);
  if (resto === 11) return 0;
  if (resto === 10) return null;
  return resto;
}

export type ResultadoCuit = { valido: true } | { valido: false; motivo: string };

/** Valida formato, prefijo de tipo y dígito verificador. No consulta el padrón. */
export function validarCuit(valor: string): ResultadoCuit {
  const d = limpiarCuit(valor);
  if (d.length !== 11) return { valido: false, motivo: 'Tiene que tener 11 dígitos.' };
  if (!PREFIJOS.includes(d.slice(0, 2))) return { valido: false, motivo: 'El prefijo no corresponde a una persona ni a una empresa.' };
  const dv = digitoVerificador(d.slice(0, 10));
  if (dv === null || dv !== Number(d[10])) return { valido: false, motivo: 'El dígito verificador no coincide. Revisá el número.' };
  return { valido: true };
}

export const esEmpresa = (valor: string) => ['30', '33', '34'].includes(limpiarCuit(valor).slice(0, 2));
