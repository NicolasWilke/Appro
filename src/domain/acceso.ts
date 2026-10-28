import type { RegionConfig } from '@/config/region';
import { validarCuit } from './cuit';
import type { RegionId, Rol, RubroId } from './types';
import { esMailCorporativo, esMailValido } from './validaciones';

/**
 * Quién ve los datos de contacto (mail y teléfono) de quién.
 * - El comprador ve el contacto de los proveedores.
 * - El proveedor ve el contacto de un comprador solo si ese comprador aceptó su solicitud.
 * - Entre pares del mismo rol, no.
 */
export function puedeVerContacto(lector: { uid: string; rol: Rol }, duenio: { uid: string; rol: Rol }, duenioAceptoAlLector = false): boolean {
  if (lector.uid === duenio.uid) return true;
  if (lector.rol === 'comprador' && duenio.rol === 'proveedor') return true;
  if (lector.rol === 'proveedor' && duenio.rol === 'comprador') return duenioAceptoAlLector;
  return false;
}

export const PASSWORD_MIN = 6;

export interface DatosAlta {
  rol: Rol;
  empresa: string;
  contactoNombre: string;
  email: string;
  telefono: string;
  categoria: RubroId | '';
  sector: string;
  ubicacion: string;
  cuit: string;
  password: string;
}

export type CampoAlta = Exclude<keyof DatosAlta, 'rol'>;

/** Errores por campo. Vacío = se puede crear la cuenta. */
export function validarAlta(d: DatosAlta): Partial<Record<CampoAlta, string>> {
  const e: Partial<Record<CampoAlta, string>> = {};
  if (d.empresa.trim().length < 2) e.empresa = 'Indicá el nombre de la empresa.';
  if (d.contactoNombre.trim().split(/\s+/).length < 2) e.contactoNombre = 'Nombre y apellido.';
  if (!esMailValido(d.email)) e.email = 'Revisá el mail.';
  if (d.telefono.replace(/\D/g, '').length < 8) e.telefono = 'Revisá el teléfono, con característica.';
  if (!d.categoria) e.categoria = 'Elegí una categoría.';
  if (d.ubicacion.trim().length < 2) e.ubicacion = 'Indicá ciudad y provincia.';
  const cuit = validarCuit(d.cuit);
  if (!cuit.valido) e.cuit = cuit.motivo;
  if (d.password.length < PASSWORD_MIN) e.password = `Mínimo ${PASSWORD_MIN} caracteres.`;
  return e;
}

/** Los compradores con mail personal pueden registrarse, pero no reciben la marca de mail corporativo. */
export const mailCorporativo = (email: string, region: RegionConfig) => esMailValido(email) && esMailCorporativo(email, region);

export function separarNombre(completo: string): { nombre: string; apellido: string } {
  const partes = completo.trim().split(/\s+/);
  if (partes.length < 2) return { nombre: partes[0] ?? '', apellido: '' };
  return { nombre: partes.slice(0, -1).join(' '), apellido: partes[partes.length - 1] };
}

const ZONAS: [RegExp, RegionId][] = [
  [/rosario|santa fe|funes|rafaela|venado/i, 'ros'],
  [/c[oó]rdoba|villa mar[ií]a|r[ií]o cuarto/i, 'cba'],
  [/tucum[aá]n|salta|jujuy|santiago del estero|catamarca/i, 'noa'],
  [/mar del plata|necochea|pinamar|villa gesell|costa/i, 'costa'],
];

/** Región de trabajo a partir de la ubicación escrita. Si no se reconoce, AMBA. */
export function regionDesdeUbicacion(ubicacion: string): RegionId {
  return ZONAS.find(([re]) => re.test(ubicacion))?.[1] ?? 'amba';
}
