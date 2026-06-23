import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  updatePassword,
  type User,
} from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'
import { env } from '@/config/env'
import { DEMO_IDENTITIES } from '@/demo/seed'
import { setOne } from '@/services/firestore'
import { paths } from '@/services/paths'

export type DemoIdentity = keyof typeof DEMO_IDENTITIES

interface AuthContextValue {
  user: User | null
  isInitialized: boolean
  loginEmail: (email: string, password: string) => Promise<void>
  registerEmail: (name: string, email: string, password: string) => Promise<User>
  changePassword: (password: string) => Promise<void>
  loginGoogle: () => Promise<void>
  logout: () => Promise<void>
  /** Solo en modo demo: cambia la identidad activa (super-admin ↔ admin ↔ socio). */
  setDemoIdentity?: (identity: DemoIdentity) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** Persiste el perfil global mínimo en `users/{uid}`. */
async function syncUserProfile(user: User) {
  await setOne(paths.user(user.uid), {
    uid: user.uid,
    displayName: user.displayName ?? '',
    email: user.email ?? '',
    photoURL: user.photoURL ?? '',
  })
}

function identityToUser(identity: DemoIdentity): User {
  const data = DEMO_IDENTITIES[identity]
  return { ...data } as unknown as User
}

/** Provider para modo demo: identidad en memoria, sin Firebase. */
function DemoAuthProvider({ children }: { children: ReactNode }) {
  // Arranca logueado como admin para entrar directo a la app (login bypasseado).
  const [identity, setIdentity] = useState<DemoIdentity | null>('admin')

  const value = useMemo<AuthContextValue>(
    () => ({
      user: identity ? identityToUser(identity) : null,
      isInitialized: true,
      loginEmail: async (email) => setIdentity(email.includes('tigerfit.com') ? 'socio' : 'admin'),
      registerEmail: async () => {
        setIdentity('socio')
        return identityToUser('socio')
      },
      changePassword: async () => undefined,
      loginGoogle: async () => setIdentity('admin'),
      logout: async () => setIdentity(null),
      setDemoIdentity: (next) => setIdentity(next),
    }),
    [identity],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** Provider real con Firebase Auth. */
function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setIsInitialized(true)
    })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isInitialized,
      loginEmail: async (email, password) => {
        await signInWithEmailAndPassword(auth, email, password)
      },
      registerEmail: async (name, email, password) => {
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(cred.user, { displayName: name })
        await syncUserProfile(cred.user)
        return cred.user
      },
      changePassword: async (password) => {
        if (!auth.currentUser) throw new Error('auth/no-current-user')
        await updatePassword(auth.currentUser, password)
      },
      loginGoogle: async () => {
        const cred = await signInWithPopup(auth, googleProvider)
        await syncUserProfile(cred.user)
      },
      logout: async () => {
        await signOut(auth)
      },
    }),
    [user, isInitialized],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return env.demoMode ? (
    <DemoAuthProvider>{children}</DemoAuthProvider>
  ) : (
    <FirebaseAuthProvider>{children}</FirebaseAuthProvider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
