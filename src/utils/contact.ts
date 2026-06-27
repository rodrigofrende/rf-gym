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
