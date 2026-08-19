import { APP_VERSION } from '@/config/app'

/**
 * Alertas de errores de producción vía ntfy: push al celular del dueño de la
 * plataforma cuando a un usuario real le explota algo. "Sentry de bolsillo":
 * sin backend ni dependencias, un POST al topic personal.
 *
 * El topic viaja en el bundle público (inevitable sin backend): es un canal de
 * avisos personales sin datos sensibles, no un canal de negocio. Si algún día
 * se spamea, se rota el nombre acá y en la app ntfy.
 */
const NTFY_URL = 'https://ntfy.sh/rf-fit-errores-x7k2m9'

// Anti-spam: por sesión, máximo de envíos y dedupe por mensaje.
const MAX_PER_SESSION = 5
const seen = new Set<string>()
let sent = 0

// Ruido conocido que no amerita despertar a nadie.
const IGNORED = [
  /ResizeObserver loop/i,
  // Scripts cross-origin (extensiones, etc.): el navegador oculta el detalle.
  /^Script error\.?$/i,
  // Chunks renombrados por un deploy en el medio de una sesión abierta.
  /dynamically imported module|Importing a module script failed/i,
]

function report(
  kind: string,
  message: string,
  detail?: string,
  options?: { priority?: 'high' | 'default'; tags?: string },
) {
  if (!import.meta.env.PROD || window.location.hostname === 'localhost') return
  if (sent >= MAX_PER_SESSION) return
  const msg = message || 'Error sin mensaje'
  if (IGNORED.some((re) => re.test(msg))) return
  const key = `${kind}:${msg.slice(0, 180)}`
  if (seen.has(key)) return
  seen.add(key)
  sent++

  let gymId: string | null = null
  try {
    gymId = localStorage.getItem('gym:activeGymId')
  } catch {
    /* modo privado */
  }

  const body = [
    msg.slice(0, 500),
    detail?.slice(0, 500),
    `path: ${window.location.pathname}`,
    gymId ? `gym: ${gymId}` : null,
    `v${APP_VERSION} · ${navigator.userAgent.slice(0, 140)}`,
  ]
    .filter(Boolean)
    .join('\n')

  // Fire-and-forget; keepalive para que sobreviva si la página se está cerrando.
  fetch(NTFY_URL, {
    method: 'POST',
    body,
    headers: {
      Title: `RF FIT ${options?.priority === 'default' ? 'aviso' : 'error'} (${kind})`,
      Priority: options?.priority ?? 'high',
      Tags: options?.tags ?? 'rotating_light',
    },
    keepalive: true,
  }).catch(() => undefined)
}

/**
 * Fallos de negocio ya mostrados al usuario (login, check-in, claim). No son
 * crashes: prioridad baja, sin PII (nada de emails/contraseñas). Sirve para
 * enterarte antes de que te lo reporten.
 */
export function reportOperational(kind: string, message: string, detail?: string) {
  report(kind, message, detail, { priority: 'default', tags: 'warning' })
}

/** Engancha los handlers globales. Llamar una sola vez, al arrancar la app. */
export function initErrorReporting() {
  window.addEventListener('error', (e) => {
    report('error', e.message, e.error instanceof Error ? e.error.stack : undefined)
  })
  window.addEventListener('unhandledrejection', (e) => {
    const r: unknown = e.reason
    report(
      'promesa',
      r instanceof Error ? r.message : String(r),
      r instanceof Error ? r.stack : undefined,
    )
  })
}
