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
  ListChecks,
  QrCode,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Megaphone,
  ShoppingBag,
  Star,
  Store,
  Trophy,
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

/** Sección del menú lateral. Sin `label` se renderiza plana (sin título). */
export interface NavGroup {
  key: string
  label?: string
  items: NavItem[]
}

const ADMIN_NAV: NavGroup[] = [
  {
    key: 'gestion',
    label: 'Gestión',
    items: [
      { to: ROUTES.ADMIN_MEMBERS, label: 'Socios', icon: Users },
      { to: ROUTES.ADMIN_TODAY, label: 'Asistencias', icon: CalendarCheck },
      { to: ROUTES.ADMIN_MY_QR, label: 'Mi QR', icon: QrCode },
      { to: ROUTES.ADMIN_RANKING, label: 'Ranking', icon: Trophy },
      // Estadísticas al final del grupo: dashboard pesado, la home es Socios.
      { to: ROUTES.ADMIN_DASHBOARD, label: 'Estadísticas', icon: LayoutDashboard, end: true },
    ],
  },
  {
    key: 'entrenamiento',
    label: 'Entrenamiento',
    items: [
      { to: ROUTES.ADMIN_CLASSES, label: 'Clases', icon: CalendarClock },
      { to: ROUTES.ADMIN_ROUTINES, label: 'Rutinas', icon: Dumbbell },
      { to: ROUTES.ADMIN_EXERCISES, label: 'Ejercicios', icon: ListChecks },
    ],
  },
  {
    key: 'configuracion',
    label: 'Configuración',
    items: [
      { to: ROUTES.ADMIN_TARIFFS, label: 'Tarifas', icon: Tags },
      { to: ROUTES.ADMIN_PRODUCTS, label: 'Productos', icon: ShoppingBag },
      { to: ROUTES.ADMIN_MY_GYM, label: 'Página pública', icon: Megaphone },
      { to: ROUTES.ADMIN_SPONSORS, label: 'Patrocinadores', icon: Star },
      { to: ROUTES.ADMIN_BRANDING, label: 'Marca', icon: Palette },
    ],
  },
]

const USER_NAV: NavGroup[] = [
  {
    key: 'entrenamiento',
    label: 'Entrenamiento',
    items: [
      { to: ROUTES.APP_ROUTINES, label: 'Mis rutinas', icon: ClipboardList },
      { to: ROUTES.APP_CLASSES, label: 'Clases', icon: CalendarClock },
      { to: ROUTES.APP_RANKING, label: 'Ranking', icon: Trophy },
    ],
  },
  {
    key: 'actividad',
    label: 'Mi actividad',
    items: [
      { to: ROUTES.APP_SCAN_QR, label: 'Escanear QR', icon: QrCode },
      { to: ROUTES.APP_ATTENDANCE, label: 'Mi asistencia', icon: CalendarDays },
      { to: ROUTES.APP_LOGS, label: 'Mis registros', icon: History },
    ],
  },
  {
    key: 'gimnasio',
    label: 'Gimnasio',
    items: [
      { to: ROUTES.APP_MY_GYM, label: 'Mi gimnasio', icon: Building2 },
      { to: ROUTES.APP_PRODUCTS, label: 'Tienda', icon: Store },
      { to: ROUTES.APP_PROFILE, label: 'Mi perfil', icon: User },
    ],
  },
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

export function navGroupsForRole(role: Role): NavGroup[] {
  return role === 'admin' ? ADMIN_NAV : USER_NAV
}
