export function normalizeEmailKey(email: string): string {
  return email.trim().toLowerCase()
}

/** Emails con los que un socio puede intentar entrar (acceso + contacto). */
export function loginEmailKeys(member: { email?: string; loginEmail?: string }): string[] {
  return [
    ...new Set(
      [member.loginEmail, member.email]
        .filter((value): value is string => Boolean(value?.trim()))
        .map(normalizeEmailKey)
        .filter(Boolean),
    ),
  ]
}

function slug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

export function tenantEmailDomain(gymName: string): string {
  return `${slug(gymName) || 'gimnasio'}.com`
}

export function splitFullName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  return { first: parts[0] ?? '', last: parts.length > 1 ? parts[parts.length - 1] : '' }
}

export function loginEmailCandidates(fullName: string, gymName: string): string[] {
  const { first, last } = splitFullName(fullName)
  const cleanFirst = slug(first)
  const cleanLast = slug(last)
  const domain = tenantEmailDomain(gymName)
  const base =
    cleanFirst && cleanLast
      ? [`${cleanFirst[0]}${cleanLast}`, `${cleanFirst}${cleanLast}`]
      : [cleanFirst || cleanLast || 'socio']
  return Array.from(new Set(base)).map((local) => `${local}@${domain}`)
}

export function suggestLoginEmail(
  fullName: string,
  gymName: string,
  existingEmails: string[],
): string {
  const used = new Set(existingEmails.map(normalizeEmailKey))
  const candidates = loginEmailCandidates(fullName, gymName)
  const available = candidates.find((email) => !used.has(normalizeEmailKey(email)))
  if (available) return available

  const first = candidates[0] ?? `socio@${tenantEmailDomain(gymName)}`
  const [local, domain] = first.split('@')
  for (let i = 1; i < 1000; i++) {
    const next = `${local}${i}@${domain}`
    if (!used.has(normalizeEmailKey(next))) return next
  }
  return first
}

export function emailLocalPart(email: string): string {
  return email.split('@')[0] ?? ''
}

export function emailDomain(email: string): string {
  return email.trim().toLowerCase().split('@')[1] ?? ''
}

/**
 * Proveedores de email personal. Si un socio intenta entrar con uno de estos, lo
 * más probable es que su acceso al gym sea un alias `local@gimnasio.com` (ver
 * `tenantEmailDomain`) y esté usando su casilla personal por costumbre. Amerita
 * un mensaje distinto a "no estás dado de alta".
 */
const PUBLIC_EMAIL_PROVIDERS = new Set([
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'hotmail.com.ar',
  'hotmail.es',
  'outlook.com',
  'outlook.es',
  'live.com',
  'live.com.ar',
  'yahoo.com',
  'yahoo.com.ar',
  'icloud.com',
  'me.com',
  'aol.com',
  'protonmail.com',
  'proton.me',
])

export function isPublicEmailProvider(email: string): boolean {
  return PUBLIC_EMAIL_PROVIDERS.has(emailDomain(email))
}

/** TLDs que son claramente un `.com` mal tipeado. */
const COM_TYPOS = new Set(['con', 'cm', 'cmo', 'om', 'co', 'comm', 'xom', 'vom', 'coom'])

/** Dominios de proveedor mal tipeados → dominio correcto. */
const DOMAIN_TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmail.com.ar': 'gmail.com',
  'gnail.com': 'gmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
}

/**
 * Correcciones plausibles de un email mal tipeado, de la más probable a la menos.
 *
 * Existe porque el índice de login no se puede recorrer: las rules permiten `get`
 * exacto pero `list: false`, así que no hay fuzzy match posible desde el cliente.
 * La única forma de recuperar un typo es adivinar candidatos y preguntar por cada
 * uno. Es seguro ser generoso: quien consulta esto sólo muestra la sugerencia si
 * el candidato EXISTE de verdad en el índice, así que un candidato equivocado no
 * llega nunca a la pantalla.
 *
 * Máximo 2 candidatos, para no encadenar lecturas en el camino de error.
 */
export function emailTypoCandidates(email: string): string[] {
  const normalized = normalizeEmailKey(email)
  const [local, domain] = normalized.split('@')
  if (!local || !domain) return []

  const candidates: string[] = []
  const fixedDomain = DOMAIN_TYPOS[domain]
  if (fixedDomain) candidates.push(`${local}@${fixedDomain}`)

  const labels = domain.split('.')
  const tld = labels[labels.length - 1] ?? ''
  if (labels.length > 1 && COM_TYPOS.has(tld)) {
    candidates.push(`${local}@${[...labels.slice(0, -1), 'com'].join('.')}`)
  }

  return [...new Set(candidates)].filter((candidate) => candidate !== normalized).slice(0, 2)
}
