/**
 * Arma un link de WhatsApp click-to-chat (`wa.me`). El número se limpia a solo
 * dígitos (wa.me exige el número completo con código de país, sin símbolos).
 * Devuelve `null` si no hay número válido.
 */
export function whatsappLink(phone?: string, message?: string): string | null {
  const digits = phone?.replace(/\D/g, '') ?? ''
  if (!digits) return null
  const text = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${digits}${text}`
}

/** Arma un link `mailto:`, opcionalmente con asunto. `null` si no hay email. */
export function mailtoLink(email?: string, subject?: string): string | null {
  const value = email?.trim()
  if (!value) return null
  const q = subject ? `?subject=${encodeURIComponent(subject)}` : ''
  return `mailto:${value}${q}`
}

/**
 * URL del compositor web de Gmail, con destinatario y asunto pre-armados.
 * Alternativa a `mailto:` para quien no usa el cliente de correo por defecto
 * del sistema (ej. tiene Outlook asociado pero trabaja con Gmail en el navegador).
 */
export function gmailComposeUrl(email: string, subject?: string, body?: string): string {
  const params = new URLSearchParams({ view: 'cm', fs: '1', to: email })
  if (subject) params.set('su', subject)
  if (body) params.set('body', body)
  return `https://mail.google.com/mail/?${params.toString()}`
}

/**
 * Normaliza cualquier input de Instagram a un handle limpio: acepta que peguen
 * la URL completa o el `@handle`, y devuelve solo `[A-Za-z0-9._]`. `''` si vacío.
 */
export function instagramHandle(input?: string): string {
  if (!input) return ''
  let v = input.trim()
  const m = v.match(/instagram\.com\/([^/?#]+)/i)
  if (m) v = m[1]
  return v.replace(/^@/, '').replace(/[^A-Za-z0-9._]/g, '')
}

/** Link a un perfil de Instagram a partir de un handle o input crudo. `null` si vacío. */
export function instagramUrl(input?: string): string | null {
  const h = instagramHandle(input)
  return h ? `https://www.instagram.com/${h}/` : null
}
