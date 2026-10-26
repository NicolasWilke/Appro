import type { Region, RegionId, Rubro, RubroId } from './types';

export const RUBROS: Rubro[] = [
  { id: 'packaging', nombre: 'Packaging flexible', unidad: 'kg' },
  { id: 'frio', nombre: 'Logística refrigerada', unidad: 'posiciones pallet/mes' },
  { id: 'mantenimiento', nombre: 'Mantenimiento industrial', unidad: 'horas técnico' },
  { id: 'etiquetas', nombre: 'Etiquetas e impresión', unidad: 'millares' },
  { id: 'quimicos', nombre: 'Insumos químicos', unidad: 'litros' },
  { id: 'cargas', nombre: 'Transporte de cargas', unidad: 'km' },
  { id: 'seguridad', nombre: 'Seguridad privada', unidad: 'horas vigilador' },
];

export const REGIONES: Region[] = [
  { id: 'ros', nombre: 'Rosario y Gran Rosario' },
  { id: 'amba', nombre: 'AMBA' },
  { id: 'cba', nombre: 'Córdoba' },
  { id: 'noa', nombre: 'NOA' },
  { id: 'costa', nombre: 'Costa Atlántica' },
];

export const rubro = (id: RubroId) => RUBROS.find((r) => r.id === id)!;
export const region = (id: RegionId) => REGIONES.find((r) => r.id === id)!;

export const CONDICIONES_PAGO = ['Contado', '30 días fecha factura', '60 días fecha factura', '90 días fecha factura'];
