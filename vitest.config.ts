import { defineConfig } from 'vitest/config'

/**
 * Vitest corre los tests de reglas de Firestore contra el emulador (necesita
 * Java + `firebase emulators:exec`, ver el script test:rules del package.json).
 * Los e2e los corre Playwright aparte (tests/e2e), no Vitest.
 */
export default defineConfig({
  test: {
    include: ['tests/rules/**/*.test.ts'],
    environment: 'node',
    testTimeout: 15_000,
  },
})
