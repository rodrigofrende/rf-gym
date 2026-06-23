import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, GoogleAuthProvider, type Auth } from 'firebase/auth'
import { initializeFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore'
import { env } from '@/config/env'

// En modo demo NO inicializamos Firebase (evita el crash auth/invalid-api-key sin claves).
// Las ramas demo de los servicios nunca tocan estos placeholders.
let auth: Auth
let db: Firestore
let googleProvider: GoogleAuthProvider

if (!env.demoMode) {
  const app: FirebaseApp = initializeApp(env.firebase)
  auth = getAuth(app)
  db = initializeFirestore(app, { ignoreUndefinedProperties: true })
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
