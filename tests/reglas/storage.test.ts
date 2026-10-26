import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { getBytes, ref, uploadBytes, deleteObject } from 'firebase/storage';

let env: RulesTestEnvironment;
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-appro',
    storage: { rules: readFileSync('firebase/storage.rules', 'utf8'), host: '127.0.0.1', port: 9199 },
  });
});
afterAll(async () => { await env.cleanup(); });

const storage = (uid: string) => env.authenticatedContext(uid).storage();

describe('logos', () => {
  it('el dueño sube una imagen chica', async () => {
    await assertSucceeds(uploadBytes(ref(storage('prov1'), 'logos/prov1/logo'), PNG, { contentType: 'image/png' }));
  });
  it('nadie sube al espacio de otro', async () => {
    await assertFails(uploadBytes(ref(storage('prov2'), 'logos/prov1/logo'), PNG, { contentType: 'image/png' }));
  });
  it('solo imágenes PNG, JPG o WebP', async () => {
    await assertFails(uploadBytes(ref(storage('prov1'), 'logos/prov1/logo'), PNG, { contentType: 'application/pdf' }));
    await assertFails(uploadBytes(ref(storage('prov1'), 'logos/prov1/logo'), PNG, { contentType: 'image/svg+xml' }));
  });
  it('máximo 2 MB', async () => {
    await assertFails(uploadBytes(ref(storage('prov1'), 'logos/prov1/logo'), new Uint8Array(2 * 1024 * 1024 + 1), { contentType: 'image/png' }));
  });
  it('los registrados lo ven; sin sesión no', async () => {
    await assertSucceeds(uploadBytes(ref(storage('prov1'), 'logos/prov1/logo'), PNG, { contentType: 'image/png' }));
    await assertSucceeds(getBytes(ref(storage('comp1'), 'logos/prov1/logo')));
    await assertFails(getBytes(ref(env.unauthenticatedContext().storage(), 'logos/prov1/logo')));
  });
  it('solo el dueño lo borra', async () => {
    await assertSucceeds(uploadBytes(ref(storage('prov1'), 'logos/prov1/logo'), PNG, { contentType: 'image/png' }));
    await assertFails(deleteObject(ref(storage('prov2'), 'logos/prov1/logo')));
    await assertSucceeds(deleteObject(ref(storage('prov1'), 'logos/prov1/logo')));
  });
  it('fuera de logos/ no se puede escribir', async () => {
    await assertFails(uploadBytes(ref(storage('prov1'), 'otra/cosa'), PNG, { contentType: 'image/png' }));
  });
});
