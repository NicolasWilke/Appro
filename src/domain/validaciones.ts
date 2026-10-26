import type { RegionConfig } from '@/config/region';

export function esMailCorporativo(email: string, region: RegionConfig): boolean {
  const dominio = email.trim().toLowerCase().split('@')[1];
  if (!dominio || !dominio.includes('.')) return false;
  return !region.dominiosPersonales.includes(dominio);
}

export const esMailValido = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
