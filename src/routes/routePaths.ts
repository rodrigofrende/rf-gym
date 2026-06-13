import type { Role } from '@/types'

export const ROUTES = {
  LOGIN: '/login',
  SELECT_GYM: '/select-gym',

  // Super-admin (global, cross-tenant) — plataforma RF FIT
  SUPER_DASHBOARD: '/super',
  SUPER_GYMS: '/super/gyms',
  SUPER_PLANS: '/super/plans',

  // Admin
  ADMIN_DASHBOARD: '/admin',
  ADMIN_MEMBERS: '/admin/members',
  ADMIN_MEMBER_DETAIL: '/admin/members/:uid',
  ADMIN_ROUTINES: '/admin/routines',
  ADMIN_TARIFFS: '/admin/tariffs',
  ADMIN_BRANDING: '/admin/branding',

  // Socio
  APP_PROFILE: '/app/profile',
  APP_ROUTINES: '/app/routines',
  APP_LOGS: '/app/logs',
} as const

export const adminMemberDetail = (uid: string) => `/admin/members/${uid}`

/** Home por defecto según rol (Panel al final del menú: carga pesada). */
export function defaultHomeForRole(
  role: Role | null,
  options?: { isSuperAdmin?: boolean },
): string {
  if (options?.isSuperAdmin) return ROUTES.SUPER_GYMS
  switch (role) {
    case 'admin':
      return ROUTES.ADMIN_MEMBERS
    case 'user':
      return ROUTES.APP_ROUTINES
    default:
      return ROUTES.SELECT_GYM
  }
}
