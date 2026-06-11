/**
 * Super-admins de la plataforma (capacidad global, cross-tenant). Por ahora una
 * lista hardcodeada de emails. Es el único lugar donde se define "soy super-admin".
 */
export const SUPER_ADMIN_EMAILS = ['rodrigo.frende@gmail.com']

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false
  const normalized = email.toLowerCase()
  return SUPER_ADMIN_EMAILS.some((e) => e.toLowerCase() === normalized)
}
