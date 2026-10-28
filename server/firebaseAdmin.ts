import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Acceso de administrador a Firebase para los scripts del servidor (salta las reglas).
 * Credenciales: GOOGLE_APPLICATION_CREDENTIALS con la ruta al JSON de la cuenta de servicio
 * (Consola → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada).
 * Con FIRESTORE_EMULATOR_HOST definido, trabaja contra el emulador y no hace falta clave.
 */
const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.GCLOUD_PROJECT;
if (!projectId) {
  console.error('Definí FIREBASE_PROJECT_ID con el id de tu proyecto (por ejemplo, appro-xxxxx).');
  process.exit(1);
}
const emulador = !!process.env.FIRESTORE_EMULATOR_HOST;
if (!emulador && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Definí GOOGLE_APPLICATION_CREDENTIALS con la ruta al JSON de la cuenta de servicio.');
  process.exit(1);
}

const app = initializeApp(emulador ? { projectId } : { projectId, credential: applicationDefault() });
export const db = getFirestore(app);
export const auth = getAuth(app);
export const PROYECTO = projectId;
