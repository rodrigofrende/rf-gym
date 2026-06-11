import type { MemberStatus, Role } from '@/types'

export function isAdmin(role: Role | null | undefined): boolean {
  return role === 'admin'
}

export const STATUS_LABEL: Record<MemberStatus, string> = {
  active: 'Activo',
  paused: 'Pausado',
  overdue: 'Vencido',
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administrador',
  user: 'Socio',
}
