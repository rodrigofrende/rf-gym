/**
 * Enmascarado de PII para los avisos de error.
 *
 * El canal (topic de ntfy) NO es privado: el nombre del topic viaja en el bundle
 * público, así que cualquiera que lo lea puede suscribirse. Acá se decide qué es
 * aceptable que se vea si alguien lo lee. Módulo hoja (sin imports): lo usa
 * errorReporting.ts, que corre antes de montar la app.
 */

/**
 * `rodrigofrende@tigerfit.con` → `ro***de@tigerfit.con`.
 *
 * El dominio queda intacto a propósito: el dominio ES el gym (ver
 * `tenantEmailDomain`), y es lo que permite ver de un vistazo si el socio tipeó
 * `.con` en vez de `.com` o si usó su email personal. Del local part alcanzan
 * las puntas para que el gym identifique al socio sin publicar la dirección.
 */
export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.trim().toLowerCase().split('@')
  if (!domain) return '***'
  const masked =
    local.length <= 2
      ? '**'
      : local.length <= 5
        ? `${local[0]}***`
        : `${local.slice(0, 2)}***${local.slice(-2)}`
  return `${masked}@${domain.slice(0, 60)}`
}

/**
 * Huella corta y estable del email. Dos usos: saber si dos avisos son del mismo
 * socio, y que el dedupe no colapse a dos socios distintos que tuvieron el mismo
 * error (el mensaje es una constante, así que sin esto el segundo se pierde).
 *
 * NO es un secreto ni pretende serlo: es FNV-1a, no criptográfico. Es
 * sincrónico a propósito, porque `report()` lo es y `crypto.subtle` es async; y
 * un SHA-256 truncado tampoco sería secreto — el espacio de emails es chico y se
 * revierte por fuerza bruta. El control de privacidad real es `maskEmail`.
 */
export function emailFingerprint(email: string): string {
  const normalized = email.trim().toLowerCase()
  let hash = 0x811c9dc5
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}
