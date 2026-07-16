import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, GoogleAuthProvider, type Auth } from 'firebase/auth'
import {
  initializeFirestore,
  connectFirestoreEmulator,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'
import { env } from '@/config/env'

// En modo demo NO inicializamos Firebase (evita el crash auth/invalid-api-key sin claves).
// Las ramas demo de los servicios nunca tocan estos placeholders.
let auth: Auth
let db: Firestore
let googleProvider: GoogleAuthProvider

if (!env.demoMode) {
  const app: FirebaseApp = initializeApp(env.firebase)
  auth = getAuth(app)
  // Cache local persistente: visitas repetidas sirven lecturas desde IndexedDB
  // (percepción de carga mucho más rápida en mobile) y toleran cortes de red.
  db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  })
  googleProvider = new GoogleAuthProvider()

  if (env.useEmulator) {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
    connectFirestoreEmulator(db, 'localhost', 8080)
  }
} else {
  auth = undefined as never
  db = undefined as never
  googleProvider = undefined as never
}

export { auth, db, googleProvider }
