import { puedeVerContacto } from '@/domain/acceso';
import { blobADataUrl } from './imagen';
import { FalloAuth, type AltaCuenta, type AuthService, type CambiosPerfil, type ContactoCuenta, type Cuenta, type PerfilCuenta } from './tipos';

/**
 * Autenticación simulada para la demo: cuentas y sesión en localStorage de este navegador.
 * Aplica la misma política de contacto que las reglas de Firestore. No es segura y no manda mails:
 * en producción se usa FirebaseAuth.
 */
const CLAVE = 'appro:cuentas:v1';
export const PASSWORD_DEMO = 'demo1234';

interface Registro { uid: string; hash: string; perfil: PerfilCuenta; contacto: ContactoCuenta }
interface Estado { cuentas: Record<string, Registro>; sesion: string | null; /** comprador → proveedores aceptados */ aceptados?: Record<string, string[]> }

// Dos cuentas de ejemplo enlazadas con personas del set de datos de la demo.
const EJEMPLOS: Omit<Registro, 'hash'>[] = [
  {
    uid: 'laura-gimenez',
    perfil: { uid: 'laura-gimenez', rol: 'comprador', empresa: 'Alimentos del Litoral S.A.', contactoNombre: 'Laura Giménez', categoria: 'packaging', sector: 'Alimentos', ubicacion: 'Rosario, Santa Fe', cuit: '30-71234567-1', logoUrl: null },
    contacto: { email: 'lgimenez@alimentoslitoral.com.ar', telefono: '+54 341 555-0142' },
  },
  {
    uid: 'ramiro-ortiz',
    perfil: { uid: 'ramiro-ortiz', rol: 'proveedor', empresa: 'Envases Paraná S.R.L.', contactoNombre: 'Ramiro Ortiz', categoria: 'packaging', sector: 'Envases flexibles', ubicacion: 'Villa Gobernador Gálvez, Santa Fe', cuit: '30-68123987-8', logoUrl: null },
    contacto: { email: 'rortiz@envasesparana.com.ar', telefono: '+54 341 555-0198' },
  },
];
export const CUENTAS_EJEMPLO = EJEMPLOS.map((e) => ({ email: e.contacto.email, rol: e.perfil.rol, nombre: e.perfil.contactoNombre, empresa: e.perfil.empresa }));

async function hashear(texto: string): Promise<string> {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`appro-demo:${texto}`));
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return `plano:${texto}`; // contexto sin crypto.subtle (http): solo demo
  }
}

const clave = (email: string) => email.trim().toLowerCase();

export class DemoAuth implements AuthService {
  readonly modo = 'demo' as const;
  readonly logoEnPerfil = true;
  private estado: Estado = { cuentas: {}, sesion: null };
  private oyentes = new Set<(c: Cuenta | null) => void>();
  private listo: Promise<void>;

  constructor() {
    this.listo = this.cargar();
  }

  private async cargar() {
    try {
      const crudo = localStorage.getItem(CLAVE);
      if (crudo) this.estado = JSON.parse(crudo) as Estado;
    } catch { /* sin almacenamiento: arranca vacío */ }
    const hash = await hashear(PASSWORD_DEMO);
    for (const e of EJEMPLOS) {
      if (!this.estado.cuentas[clave(e.contacto.email)]) this.estado.cuentas[clave(e.contacto.email)] = { ...e, hash };
    }
    this.guardar();
  }

  private guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(this.estado)); } catch { /* sin persistencia */ }
  }

  private registroPorUid(uid: string) {
    return Object.values(this.estado.cuentas).find((r) => r.uid === uid) ?? null;
  }

  private actual(): Cuenta | null {
    const r = this.estado.sesion ? this.registroPorUid(this.estado.sesion) : null;
    if (!r) return null;
    const email = Object.keys(this.estado.cuentas).find((k) => this.estado.cuentas[k] === r)!;
    return { uid: r.uid, email, perfil: { ...r.perfil }, contacto: { ...r.contacto } };
  }

  private emitir() {
    const c = this.actual();
    this.oyentes.forEach((fn) => fn(c));
  }

  observar(fn: (c: Cuenta | null) => void) {
    this.oyentes.add(fn);
    this.listo.then(() => fn(this.actual()));
    return () => { this.oyentes.delete(fn); };
  }

  async registrar(alta: AltaCuenta) {
    await this.listo;
    const k = clave(alta.email);
    if (this.estado.cuentas[k]) throw new FalloAuth('mail-en-uso');
    if (alta.password.length < 6) throw new FalloAuth('password-debil');
    const uid = `u-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const { password, email, telefono, ...resto } = alta;
    this.estado.cuentas[k] = { uid, hash: await hashear(password), perfil: { ...resto, uid, logoUrl: null }, contacto: { email: email.trim(), telefono: telefono.trim() } };
    this.estado.sesion = uid;
    this.guardar();
    this.emitir();
    return this.actual()!;
  }

  async ingresar(email: string, password: string) {
    await this.listo;
    const r = this.estado.cuentas[clave(email)];
    if (!r || r.hash !== await hashear(password)) throw new FalloAuth('credenciales');
    this.estado.sesion = r.uid;
    this.guardar();
    this.emitir();
    return this.actual()!;
  }

  async salir() {
    this.estado.sesion = null;
    this.guardar();
    this.emitir();
  }

  async restablecerPassword(_email: string) {
    // En la demo no sale ningún mail. Firebase manda el enlace real.
    await new Promise((ok) => setTimeout(ok, 400));
  }

  private mio() {
    const r = this.estado.sesion ? this.registroPorUid(this.estado.sesion) : null;
    if (!r) throw new FalloAuth('sin-permiso');
    return r;
  }

  async actualizarPerfil(cambios: CambiosPerfil, contacto?: Partial<ContactoCuenta>) {
    const r = this.mio();
    r.perfil = { ...r.perfil, ...cambios };
    if (contacto) r.contacto = { ...r.contacto, ...contacto };
    this.guardar();
    this.emitir();
  }

  async subirLogo(imagen: Blob) {
    const r = this.mio();
    r.perfil.logoUrl = await blobADataUrl(imagen);
    this.guardar();
    this.emitir();
    return r.perfil.logoUrl;
  }

  async quitarLogo() {
    this.mio().perfil.logoUrl = null;
    this.guardar();
    this.emitir();
  }

  async aceptarProveedor(proveedorUid: string) {
    const yo = this.mio();
    if (yo.perfil.rol !== 'comprador') throw new FalloAuth('sin-permiso');
    const lista = ((this.estado.aceptados ??= {})[yo.uid] ??= []);
    if (!lista.includes(proveedorUid)) lista.push(proveedorUid);
    this.guardar();
  }

  async contactoDe(uid: string) {
    const yo = this.estado.sesion ? this.registroPorUid(this.estado.sesion) : null;
    const otro = this.registroPorUid(uid);
    const acepto = !!otro && !!yo && (this.estado.aceptados?.[otro.uid] ?? []).includes(yo.uid);
    if (!yo || !otro || !puedeVerContacto(yo.perfil, otro.perfil, acepto)) return null;
    return { ...otro.contacto };
  }
}
