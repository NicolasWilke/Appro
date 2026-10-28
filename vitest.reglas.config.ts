import { defineConfig } from 'vitest/config';

// Tests de reglas de Firebase. Necesitan los emuladores corriendo:
// npm run test:reglas los levanta, corre los tests y los apaga.
export default defineConfig({
  test: { environment: 'node', include: ['tests/reglas/**/*.test.ts'], testTimeout: 20000, hookTimeout: 30000, fileParallelism: false },
});
