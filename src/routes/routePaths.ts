import type { Role } from '@/types'

export const ROUTES = {
  LOGIN: '/login',
  SET_PASSWORD: '/set-password',
  SELECT_GYM: '/select-gym',

  // Presentación pública del gym (sin login, compartible con prospectos)
  PUBLIC_GYM: '/g/:gymId',

  // Super-admin (global, cross-tenant) — plataforma RF FIT
  SUPER_DASHBOARD: '/super',
  SUPER_GYMS: '/super/gyms',
  SUPER_PLANS: '/super/plans',

  // Admin
  ADMIN_DASHBOARD: '/admin',
  ADMIN_MEMBERS: '/admin/members',
  ADMIN_MEMBER_DETAIL: '/admin/members/:uid',
  ADMIN_ROUTINES: '/admin/routines',
  ADMIN_ROUTINE_NEW: '/admin/routines/new',
  ADMIN_ROUTINE_DETAIL: '/admin/routines/:routineId',
  ADMIN_EXERCISES: '/admin/exercises',
  ADMIN_TARIFFS: '/admin/tariffs',
  ADMIN_BRANDING: '/admin/branding',
  ADMIN_MY_GYM: '/admin/my-gym',
  ADMIN_MY_QR: '/admin/my-qr',
  ADMIN_TODAY: '/admin/today',

  // Socio
  CHECK_IN: '/check-in/:gymId',
  APP_SCAN_QR: '/app/scan-qr',
  APP_PROFILE: '/app/profile',
  APP_ROUTINES: '/app/routines',
  APP_LOGS: '/app/logs',
  APP_MY_GYM: '/app/my-gym',
} as const

export const adminMemberDetail = (uid: string) => `/admin/members/${uid}`
export const adminRoutineDetail = (routineId: string) => `/admin/routines/${routineId}`
export const checkInRoute = (gymId: string) => `/check-in/${gymId}`
export const publicGymRoute = (gymId: string) => `/g/${gymId}`

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
