import { describe, expect, it } from 'vitest';
import { puedeVerContacto, regionDesdeUbicacion, separarNombre, validarAlta, type DatosAlta } from './acceso';

const comp = { uid: 'c1', rol: 'comprador' as const };
const comp2 = { uid: 'c2', rol: 'comprador' as const };
const prov = { uid: 'p1', rol: 'proveedor' as const };
const prov2 = { uid: 'p2', rol: 'proveedor' as const };

describe('puedeVerContacto', () => {
  it('el comprador ve al proveedor', () => expect(puedeVerContacto(comp, prov)).toBe(true));
  it('el proveedor ve al comprador solo si lo aceptó', () => {
    expect(puedeVerContacto(prov, comp)).toBe(false);
    expect(puedeVerContacto(prov, comp, true)).toBe(true);
  });
  it('entre proveedores no, ni aunque se marque aceptado', () => expect(puedeVerContacto(prov, prov2, true)).toBe(false));
  it('entre compradores no', () => expect(puedeVerContacto(comp, comp2)).toBe(false));
  it('cada uno ve el suyo', () => expect(puedeVerContacto(prov, prov)).toBe(true));
});

const ok: DatosAlta = {
  rol: 'proveedor', empresa: 'Servicios del Sur S.A.', contactoNombre: 'Juan Pérez', email: 'juan@sur.com.ar',
  telefono: '+54 9 11 1234-5678', categoria: 'seguridad', sector: 'Servicios industriales', ubicacion: 'Neuquén, Argentina',
  cuit: '30-71234567-1', password: 'secreta',
};

describe('validarAlta', () => {
  it('acepta un alta completa', () => expect(validarAlta(ok)).toEqual({}));
  it('marca cada campo que falta', () => {
    const e = validarAlta({ ...ok, empresa: '', contactoNombre: 'Juan', email: 'x', telefono: '123', categoria: '', ubicacion: '', cuit: '30-71234567-2', password: '123' });
    expect(Object.keys(e).sort()).toEqual(['categoria', 'contactoNombre', 'cuit', 'email', 'empresa', 'password', 'telefono', 'ubicacion']);
  });
  it('el sector es opcional', () => expect(validarAlta({ ...ok, sector: '' })).toEqual({}));
});

describe('ayudas de alta', () => {
  it('separa nombre y apellido', () => {
    expect(separarNombre('Juan Pérez')).toEqual({ nombre: 'Juan', apellido: 'Pérez' });
    expect(separarNombre('María José  Fernández')).toEqual({ nombre: 'María José', apellido: 'Fernández' });
  });
  it('deduce la región', () => {
    expect(regionDesdeUbicacion('Rosario, Santa Fe')).toBe('ros');
    expect(regionDesdeUbicacion('Córdoba capital')).toBe('cba');
    expect(regionDesdeUbicacion('Neuquén, Argentina')).toBe('amba');
  });
});
