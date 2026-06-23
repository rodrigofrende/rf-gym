const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined

function hasFirebaseConfig(): boolean {
  return Boolean(apiKey?.trim() && projectId?.trim())
}

/** Config de runtime leída de import.meta.env (VITE_*). Centralizada acá. */
export const env = {
  firebase: {
    apiKey: apiKey ?? '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
    projectId: projectId ?? '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
    appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
  },
  useEmulator: import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true',
  googleLoginEnabled: import.meta.env.VITE_ENABLE_GOOGLE_LOGIN === 'true',
  // Demo en memoria: activo si se fuerza con VITE_DEMO_MODE o si no hay credenciales.
  demoMode: import.meta.env.VITE_DEMO_MODE === 'true' || !hasFirebaseConfig(),
}
