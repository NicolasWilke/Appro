import {
  createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, updateProfile, type User,
} from 'firebase/auth';
import { arrayUnion, doc, getDoc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { firebase, USA_STORAGE } from '@/firebase/app';
import { blobADataUrl } from '../imagen';
import { fijarEmpresaDeSesion } from '@/data/firestore/sesionEmpresa';
import { FalloAuth, type AltaCuenta, type AltaMiembro, type AuthService, type InvitacionEquipo, type CambiosPerfil, type CodigoFallo, type ContactoCuenta, type Cuenta, type PerfilCuenta } from '../tipos';

/**
 * Autenticación y perfiles con Firebase.
 *   users/{uid}                    perfil público (PerfilCuenta sin uid)
 *   users/{uid}/privado/contacto   email y teléfono (ContactoCuenta)
 *   logos/{uid}/logo-{fecha}       foto o logo (Storage)
 *   miembros/{uid}                 usuario del equipo de un proveedor Empresa: actúa por empresaId, sin perfil propio
 * Quién lee qué lo deciden firebase/firestore.rules y firebase/storage.rules.
 */

const CODIGOS: Record<string, CodigoFallo> = {
  'auth/email-already-in-use': 'mail-en-uso',
  'auth/invalid-credential': 'credenciales',
  'auth/wrong-password': 'credenciales',
  'auth/user-not-found': 'credenciales',
  'auth/invalid-email': 'credenciales',
  'auth/weak-password': 'password-debil',
  'auth/too-many-requests': 'demasiados-intentos',
  'auth/network-request-failed': 'red',
  'permission-denied': 'sin-permiso',
  'storage/unauthorized': 'sin-permiso',
};

function traducir(e: unknown): FalloAuth {
  if (e instanceof FalloAuth) return e;
  const codigo = (e as { code?: string })?.code ?? '';
  if (!CODIGOS[codigo]) console.error('[firebase]', e);
  return new FalloAuth(CODIGOS[codigo] ?? 'desconocido');
}

export function crearFirebaseAuth(): AuthService {
  return new FirebaseAuth();
}

class FirebaseAuth implements AuthService {
  readonly modo = 'firebase' as const;
  readonly logoEnPerfil = !USA_STORAGE;
  private auth = firebase().auth;
  private db = firebase().db;
  private storage = firebase().storage;
  /** Durante el alta, Firebase avisa la sesión antes de que exista el perfil: esa notificación se ignora. */
  private registrando = false;
  private oyentes = new Set<(c: Cuenta | null) => void>();
  private ultima: Cuenta | null = null;
  /** true cuando ya se sabe si hay sesión (y, si la hay, ya se leyó el perfil). */
  private resuelto = false;

  constructor() {
    onAuthStateChanged(this.auth, async (u) => {
      if (this.registrando) return;
      this.publicar(u ? await this.leerCuenta(u).catch(() => null) : null);
    });
  }

  private publicar(c: Cuenta | null) {
    fijarEmpresaDeSesion(c?.miembro ? c.uid : null);
    this.ultima = c;
    this.resuelto = true;
    this.oyentes.forEach((fn) => fn(c));
  }

  private async leerCuenta(u: User): Promise<Cuenta | null> {
    const [perfil, contacto] = await Promise.all([
      getDoc(doc(this.db, 'users', u.uid)),
      getDoc(doc(this.db, 'users', u.uid, 'privado', 'contacto')),
    ]);
    if (!perfil.exists()) {
      const miembro = await getDoc(doc(this.db, 'miembros', u.uid)).catch(() => null);
      if (miembro?.exists()) return this.leerCuentaDeEquipo(u, miembro.data() as { empresaId: string; nombre: string });
      // Cuenta sin perfil (alta interrumpida): no puede usar la red.
      await signOut(this.auth);
      return null;
    }
    const datos = perfil.data() as Omit<PerfilCuenta, 'uid'>;
    return {
      uid: u.uid,
      email: u.email ?? '',
      perfil: { ...datos, uid: u.uid, sector: datos.sector ?? '', logoUrl: datos.logoUrl ?? null },
      contacto: (contacto.data() as ContactoCuenta | undefined) ?? { email: u.email ?? '', telefono: '' },
    };
  }

  /** Miembro de un equipo: la cuenta es la de la empresa. Si la empresa bajó de plan, las reglas no lo dejan leer. */
  private async leerCuentaDeEquipo(u: User, m: { empresaId: string; nombre: string }, cerrarSiFalla = true): Promise<Cuenta> {
    try {
      const [perfil, contacto] = await Promise.all([
        getDoc(doc(this.db, 'users', m.empresaId)),
        getDoc(doc(this.db, 'users', m.empresaId, 'privado', 'contacto')),
      ]);
      if (!perfil.exists()) throw new FalloAuth('sin-equipo');
      const datos = perfil.data() as Omit<PerfilCuenta, 'uid'>;
      return {
        uid: m.empresaId,
        email: u.email ?? '',
        perfil: { ...datos, uid: m.empresaId, sector: datos.sector ?? '', logoUrl: datos.logoUrl ?? null },
        contacto: (contacto.data() as ContactoCuenta | undefined) ?? { email: '', telefono: '' },
        miembro: { uid: u.uid, nombre: m.nombre },
      };
    } catch {
      if (cerrarSiFalla) await signOut(this.auth);
      throw new FalloAuth('sin-equipo');
    }
  }

  private async refrescar() {
    const u = this.auth.currentUser;
    this.publicar(u ? await this.leerCuenta(u) : null);
  }

  private yo(): User {
    const u = this.auth.currentUser;
    if (!u) throw new FalloAuth('sin-permiso');
    return u;
  }

  observar(fn: (c: Cuenta | null) => void) {
    this.oyentes.add(fn);
    if (this.resuelto) fn(this.ultima);
    return () => { this.oyentes.delete(fn); };
  }

  async registrar(alta: AltaCuenta) {
    this.registrando = true;
    let usuario: User | null = null;
    try {
      const cred = await createUserWithEmailAndPassword(this.auth, alta.email.trim(), alta.password);
      usuario = cred.user;
      const { password: _p, email, telefono, ...perfil } = alta;
      await setDoc(doc(this.db, 'users', usuario.uid), { ...perfil, logoUrl: null, creado: serverTimestamp(), actualizado: serverTimestamp() });
      await setDoc(doc(this.db, 'users', usuario.uid, 'privado', 'contacto'), { email: email.trim(), telefono: telefono.trim() });
      await updateProfile(usuario, { displayName: alta.contactoNombre });
      const cuenta = await this.leerCuenta(usuario);
      this.publicar(cuenta);
      return cuenta!;
    } catch (e) {
      // Si falló después de crear el usuario, no dejamos una cuenta sin perfil.
      if (usuario) await usuario.delete().catch(() => signOut(this.auth));
      throw traducir(e);
    } finally {
      this.registrando = false;
    }
  }

  async ingresar(email: string, password: string) {
    try {
      const cred = await signInWithEmailAndPassword(this.auth, email.trim(), password);
      const cuenta = await this.leerCuenta(cred.user);
      // La contraseña era correcta pero no hay perfil ni equipo (alta interrumpida o lo quitaron del equipo).
      if (!cuenta) throw new FalloAuth('sin-perfil');
      return cuenta;
    } catch (e) {
      throw traducir(e);
    }
  }

  async salir() {
    await signOut(this.auth);
  }

  async pedirBaja() {
    const u = this.yo();
    try {
      await setDoc(doc(this.db, 'bajas', u.uid), { pedida: serverTimestamp() });
    } catch (e) {
      throw traducir(e);
    }
    await signOut(this.auth);
  }

  async restablecerPassword(email: string) {
    try {
      await sendPasswordResetEmail(this.auth, email.trim(), { url: `${window.location.origin}/ingresar` });
    } catch (e) {
      const f = traducir(e);
      // No revelamos si el mail tiene cuenta.
      if (f.codigo !== 'credenciales') throw f;
    }
  }

  async actualizarPerfil(cambios: CambiosPerfil, contacto?: Partial<ContactoCuenta>) {
    const u = this.yo();
    try {
      if (Object.keys(cambios).length) await updateDoc(doc(this.db, 'users', u.uid), { ...cambios, actualizado: serverTimestamp() });
      if (contacto && Object.keys(contacto).length) {
        const actual = this.ultima?.contacto ?? { email: u.email ?? '', telefono: '' };
        await setDoc(doc(this.db, 'users', u.uid, 'privado', 'contacto'), { ...actual, ...contacto });
      }
      if (cambios.contactoNombre) await updateProfile(u, { displayName: cambios.contactoNombre });
    } catch (e) {
      throw traducir(e);
    }
    await this.refrescar();
  }

  async subirLogo(imagen: Blob) {
    const u = this.yo();
    const anterior = this.ultima?.perfil.logoUrl;
    if (!this.storage) {
      // Plan Spark: sin Storage, la imagen (ya achicada) va dentro del perfil.
      try {
        const url = await blobADataUrl(imagen);
        await updateDoc(doc(this.db, 'users', u.uid), { logoUrl: url, actualizado: serverTimestamp() });
        await this.refrescar();
        return url;
      } catch (e) {
        throw traducir(e);
      }
    }
    try {
      const destino = ref(this.storage, `logos/${u.uid}/logo-${Date.now()}`);
      await uploadBytes(destino, imagen, { contentType: imagen.type || 'image/png', cacheControl: 'public, max-age=31536000' });
      const url = await getDownloadURL(destino);
      await updateDoc(doc(this.db, 'users', u.uid), { logoUrl: url, actualizado: serverTimestamp() });
      if (anterior?.startsWith('http')) await deleteObject(ref(this.storage, anterior)).catch(() => undefined);
      await this.refrescar();
      return url;
    } catch (e) {
      throw traducir(e);
    }
  }

  async quitarLogo() {
    const u = this.yo();
    const anterior = this.ultima?.perfil.logoUrl;
    try {
      await updateDoc(doc(this.db, 'users', u.uid), { logoUrl: null, actualizado: serverTimestamp() });
      if (this.storage && anterior?.startsWith('http')) await deleteObject(ref(this.storage, anterior)).catch(() => undefined);
    } catch (e) {
      throw traducir(e);
    }
    await this.refrescar();
  }

  async aceptarProveedor(proveedorUid: string) {
    const u = this.yo();
    try {
      await setDoc(doc(this.db, 'users', u.uid, 'aceptados', proveedorUid), { aceptado: serverTimestamp() });
    } catch (e) {
      // Proveedores de ejemplo (sin cuenta en Firebase): las reglas lo rechazan y no hay nada que habilitar.
      if (traducir(e).codigo !== 'sin-permiso') throw traducir(e);
    }
  }

  async leerInvitacion(codigo: string): Promise<InvitacionEquipo | null> {
    try {
      const d = await getDoc(doc(this.db, 'invitaciones', codigo.trim()));
      if (!d.exists()) return null;
      const x = d.data();
      const vence = new Date((x.creada?.toDate?.() ?? new Date()).getTime() + 7 * 86400000);
      if (vence <= new Date()) return null;
      return { codigo: d.id, empresaId: x.empresaId, empresa: x.empresa, vence: vence.toISOString().slice(0, 10) };
    } catch {
      return null;
    }
  }

  async unirseAEquipo(codigo: string, alta: AltaMiembro) {
    const inv = await this.leerInvitacion(codigo);
    if (!inv) throw new FalloAuth('invitacion-invalida');
    this.registrando = true;
    let usuario: User | null = null;
    let unido = false;
    try {
      const cred = await createUserWithEmailAndPassword(this.auth, alta.email.trim(), alta.password);
      usuario = cred.user;
      // Las reglas exigen las tres cosas juntas: el miembro, su lugar en la lista y la invitación consumida.
      const lote = writeBatch(this.db);
      lote.set(doc(this.db, 'miembros', usuario.uid), {
        empresaId: inv.empresaId, nombre: alta.nombre.trim(), email: usuario.email ?? alta.email.trim(), invitacion: inv.codigo, desde: serverTimestamp(),
      });
      lote.set(doc(this.db, 'equipos', inv.empresaId), { miembros: arrayUnion(usuario.uid) }, { merge: true });
      lote.delete(doc(this.db, 'invitaciones', inv.codigo));
      try { await lote.commit(); } catch (e) {
        throw traducir(e).codigo === 'sin-permiso' ? new FalloAuth('invitacion-invalida') : e;
      }
      unido = true;
      await updateProfile(usuario, { displayName: alta.nombre.trim() }).catch(() => undefined);
      // Recién sumado, la primera lectura puede llegar antes que el cambio de sesión: se reintenta.
      const datos = { empresaId: inv.empresaId, nombre: alta.nombre.trim() };
      let cuenta: Cuenta | null = null;
      for (let intento = 0; intento < 3 && !cuenta; intento++) {
        if (intento) await new Promise((r) => setTimeout(r, 800 * intento));
        cuenta = await this.leerCuentaDeEquipo(usuario, datos, false).catch(() => null);
      }
      if (!cuenta) throw new FalloAuth('desconocido');
      this.publicar(cuenta);
      return cuenta;
    } catch (e) {
      // Si ya quedó en el equipo, el usuario no se borra: puede iniciar sesión normalmente.
      if (usuario && !unido) await usuario.delete().catch(() => signOut(this.auth));
      if (unido) { this.publicar(await this.leerCuenta(usuario!).catch(() => null)); throw new Error('Ya sos parte del equipo, pero no pudimos abrir tu sesión. Iniciá sesión con tu mail y contraseña.'); }
      throw traducir(e);
    } finally {
      this.registrando = false;
    }
  }

  async contactoDe(uid: string) {
    try {
      const d = await getDoc(doc(this.db, 'users', uid, 'privado', 'contacto'));
      return (d.data() as ContactoCuenta | undefined) ?? null;
    } catch {
      return null; // sin permiso o inexistente
    }
  }
}

