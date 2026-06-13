import {
  LayoutDashboard,
  Users,
  Dumbbell,
  User,
  ClipboardList,
  History,
  Palette,
  Building2,
  Tags,
  Layers,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Role } from '@/types'
import { ROUTES } from '@/routes/routePaths'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

const ADMIN_NAV: NavItem[] = [
  { to: ROUTES.ADMIN_MEMBERS, label: 'Socios', icon: Users },
  { to: ROUTES.ADMIN_ROUTINES, label: 'Rutinas', icon: Dumbbell },
  { to: ROUTES.ADMIN_TARIFFS, label: 'Tarifas', icon: Tags },
  { to: ROUTES.ADMIN_BRANDING, label: 'Marca', icon: Palette },
  { to: ROUTES.ADMIN_DASHBOARD, label: 'Panel', icon: LayoutDashboard, end: true },
]

const USER_NAV: NavItem[] = [
  { to: ROUTES.APP_ROUTINES, label: 'Mis rutinas', icon: ClipboardList },
  { to: ROUTES.APP_LOGS, label: 'Mis registros', icon: History },
  { to: ROUTES.APP_PROFILE, label: 'Mi perfil', icon: User },
]

/** Sección exclusiva del super-admin (cross-tenant). */
export const SUPER_NAV_ITEM: NavItem = {
  to: ROUTES.SUPER_GYMS,
  label: 'Gimnasios',
  icon: Building2,
}

/** Nav de la plataforma RF FIT (vistas del super-admin, look general). */
export const PLATFORM_NAV: NavItem[] = [
  { to: ROUTES.SUPER_GYMS, label: 'Gimnasios', icon: Building2 },
  { to: ROUTES.SUPER_PLANS, label: 'Planes', icon: Layers },
  { to: ROUTES.SUPER_DASHBOARD, label: 'Panel', icon: LayoutDashboard, end: true },
]

export function navForRole(role: Role): NavItem[] {
  return role === 'admin' ? ADMIN_NAV : USER_NAV
}
