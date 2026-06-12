export const ROUTES = {
  LOGIN: '/login',
  SELECT_GYM: '/select-gym',

  // Super-admin (global, cross-tenant) — plataforma RF Gym
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
} as const

export const adminMemberDetail = (uid: string) => `/admin/members/${uid}`
