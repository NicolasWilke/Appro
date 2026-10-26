import {
  createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail,
  signInWithEmailAndPassword, signOut, updateProfile, type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { CONFIG, firebase } from '@/firebase/app';
import { FalloAuth, type AltaCuenta, type AuthService, type CambiosPerfil, type CodigoFallo, type ContactoCuenta, type Cuenta, type PerfilCuenta } from '../tipos';

/**
 * Autenticación y perfiles con Firebase.
 *   users/{uid}                    perfil público (PerfilCuenta sin uid)
 *   users/{uid}/privado/contacto   email y teléfono (ContactoCuenta)
 *   logos/{uid}/logo-{fecha}       foto o logo (Storage)
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
  if (!CONFIG.apiKey || !CONFIG.projectId) {
    throw new Error('Faltan las claves de Firebase. Copiá .env.example a .env.local y completá VITE_FIREBASE_*.');
  }
  return new FirebaseAuth();
}

class FirebaseAuth implements AuthService {
  readonly modo = 'firebase' as const;
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
      this.publicar(u ? await this.leerCuenta(u) : null);
    });
  }

  private publicar(c: Cuenta | null) {
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
      if (!cuenta) throw new FalloAuth('credenciales');
      return cuenta;
    } catch (e) {
      throw traducir(e);
    }
  }

  async salir() {
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
    try {
      const destino = ref(this.storage, `logos/${u.uid}/logo-${Date.now()}`);
      await uploadBytes(destino, imagen, { contentType: imagen.type || 'image/png', cacheControl: 'public, max-age=31536000' });
      const url = await getDownloadURL(destino);
      await updateDoc(doc(this.db, 'users', u.uid), { logoUrl: url, actualizado: serverTimestamp() });
      if (anterior) await deleteObject(ref(this.storage, anterior)).catch(() => undefined);
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
      if (anterior) await deleteObject(ref(this.storage, anterior)).catch(() => undefined);
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

  async contactoDe(uid: string) {
    try {
      const d = await getDoc(doc(this.db, 'users', uid, 'privado', 'contacto'));
      return (d.data() as ContactoCuenta | undefined) ?? null;
    } catch {
      return null; // sin permiso o inexistente
    }
  }
}

