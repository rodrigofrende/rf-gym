import { lazy, Suspense, type ComponentType } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/providers/AuthProvider'
import { useTenant } from '@/providers/TenantProvider'
import { FullPageSpinner } from '@/components/ui'
// Eager: solo el camino crítico del primer acceso (QR → check-in → login →
// crear contraseña). Todo lo demás es lazy para que un socio en mobile no
// descargue el panel admin/super antes de ver el login.
import { LoginPage } from '@/features/auth/LoginPage'
import { SetPasswordPage } from '@/features/auth/SetPasswordPage'
import { TenantSelectPage } from '@/features/tenant-select/TenantSelectPage'
import { CheckInPage } from '@/features/member/attendance/CheckInPage'
import { SocioPaymentGate } from '@/features/payments/SocioPaymentGate'
import { PrivateRoute, SuperAdminRoute } from './PrivateRoute'
import { defaultHomeForRole, ROUTES } from './routePaths'
import { isStaleChunkError, recoverFromStaleDeploy } from '@/utils/staleDeploy'

/**
 * Lazy para páginas con named export.
 *
 * El `.catch` es el punto MÁS TEMPRANO donde se puede atajar un deploy viejo: acá
 * el fallo todavía es una promesa rechazada y React ni se enteró. Si recuperamos,
 * devolvemos una promesa que NUNCA resuelve, así <Suspense> se queda con el
 * spinner los ~200ms hasta que la recarga se lleva la página — en vez de
 * re-lanzar, hacer que React descarte el árbol entero y dejar `#root` vacío, que
 * es lo que hacía reaparecer el spinner gris del shell para siempre.
 */
function lazyPage<M>(load: () => Promise<M>, pick: (m: M) => ComponentType) {
  return lazy(() =>
    load()
      .then((m) => ({ default: pick(m) }))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error)
        if (isStaleChunkError(message) && recoverFromStaleDeploy() === 'reloading') {
          return new Promise<{ default: ComponentType }>(() => {})
        }
        // Otro error, o recuperación ya agotada / sin red: que suba al
        // ErrorBoundary, que sabe pintar algo y avisar.
        throw error
      }),
  )
}

// Panel admin (el dashboard además trae recharts)
const AdminDashboardPage = lazyPage(() => import('@/features/admin/dashboard/AdminDashboardPage'), (m) => m.AdminDashboardPage)
const MembersListPage = lazyPage(() => import('@/features/admin/members/MembersListPage'), (m) => m.MembersListPage)
const MemberDetailPage = lazyPage(() => import('@/features/admin/members/MemberDetailPage'), (m) => m.MemberDetailPage)
const RoutinesListPage = lazyPage(() => import('@/features/admin/routines/RoutinesListPage'), (m) => m.RoutinesListPage)
const RoutineEditorPage = lazyPage(() => import('@/features/admin/routines/RoutineEditorPage'), (m) => m.RoutineEditorPage)
const ExercisesListPage = lazyPage(() => import('@/features/admin/exercises/ExercisesListPage'), (m) => m.ExercisesListPage)
const TariffsListPage = lazyPage(() => import('@/features/admin/tariffs/TariffsListPage'), (m) => m.TariffsListPage)
const ProductsListPage = lazyPage(() => import('@/features/admin/products/ProductsListPage'), (m) => m.ProductsListPage)
const BrandingPage = lazyPage(() => import('@/features/admin/branding/BrandingPage'), (m) => m.BrandingPage)
const MyGymPage = lazyPage(() => import('@/features/admin/my-gym/MyGymPage'), (m) => m.MyGymPage)
const SponsorsPage = lazyPage(() => import('@/features/admin/sponsors/SponsorsPage'), (m) => m.SponsorsPage)
const AdminQrPage = lazyPage(() => import('@/features/admin/attendance/AdminQrPage'), (m) => m.AdminQrPage)
const TodayAttendancePage = lazyPage(() => import('@/features/admin/attendance/TodayAttendancePage'), (m) => m.TodayAttendancePage)
// Compartida admin/socio: placeholder hasta construir la feature
const ClassesComingSoonPage = lazyPage(() => import('@/features/classes/ClassesComingSoonPage'), (m) => m.ClassesComingSoonPage)
// Compartida admin/socio: ranking mensual de asistencia
const RankingPage = lazyPage(() => import('@/features/ranking/RankingPage'), (m) => m.RankingPage)
// Socio (ScanQrPage trae jsqr)
const ScanQrPage = lazyPage(() => import('@/features/member/attendance/ScanQrPage'), (m) => m.ScanQrPage)
const MyRoutinesPage = lazyPage(() => import('@/features/member/routines/MyRoutinesPage'), (m) => m.MyRoutinesPage)
const MyLogsPage = lazyPage(() => import('@/features/member/logs/MyLogsPage'), (m) => m.MyLogsPage)
const MyAttendancePage = lazyPage(() => import('@/features/member/attendance/MyAttendancePage'), (m) => m.MyAttendancePage)
const ProfilePage = lazyPage(() => import('@/features/member/profile/ProfilePage'), (m) => m.ProfilePage)
const MyGymMemberPage = lazyPage(() => import('@/features/member/my-gym/MyGymMemberPage'), (m) => m.MyGymMemberPage)
const ShopPage = lazyPage(() => import('@/features/member/shop/ShopPage'), (m) => m.ShopPage)
// Acción de email (reset de contraseña) con página propia branded. Lazy: solo
// se llega desde el link del email, no es camino crítico del primer acceso.
const AuthActionPage = lazyPage(() => import('@/features/auth/AuthActionPage'), (m) => m.AuthActionPage)
// Pública y super-admin
const PublicGymPage = lazyPage(() => import('@/features/public/PublicGymPage'), (m) => m.PublicGymPage)
const LandingPage = lazyPage(() => import('@/features/landing/LandingPage'), (m) => m.LandingPage)
const SuperGymsPage = lazyPage(() => import('@/features/super/SuperGymsPage'), (m) => m.SuperGymsPage)
const SuperDashboardPage = lazyPage(() => import('@/features/super/SuperDashboardPage'), (m) => m.SuperDashboardPage)
const PlansListPage = lazyPage(() => import('@/features/super/PlansListPage'), (m) => m.PlansListPage)
const BlockedEmailsPage = lazyPage(() => import('@/features/super/BlockedEmailsPage'), (m) => m.BlockedEmailsPage)

/** Decide la home según el estado de auth/rol para la ruta raíz. */
function HomeRedirect() {
  const { user, isInitialized, claimsResolved } = useAuth()
  const { isLoading, role, isSuperAdmin } = useTenant()
  if (!isInitialized) return <FullPageSpinner />
  // Visitante sin sesión: landing de marketing de la plataforma, sin esperar
  // claims ni tenant (que un prospecto no pague spinners de auth).
  if (!user) return <LandingPage />
  // claimsResolved: necesario porque la decisión depende de isSuperAdmin.
  if (isLoading || !claimsResolved) return <FullPageSpinner />
  if (isSuperAdmin) return <Navigate to={defaultHomeForRole(null, { isSuperAdmin: true })} replace />
  if (!role) return <Navigate to={ROUTES.SELECT_GYM} replace />
  return <Navigate to={defaultHomeForRole(role)} replace />
}

export function AppRoutes() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.SET_PASSWORD} element={<SetPasswordPage />} />
      <Route path={ROUTES.AUTH_ACTION} element={<AuthActionPage />} />
      <Route path={ROUTES.CHECK_IN} element={<CheckInPage />} />
      <Route path={ROUTES.PUBLIC_GYM} element={<PublicGymPage />} />
      <Route path={ROUTES.SELECT_GYM} element={<TenantSelectPage />} />

      {/* Super-admin (plataforma RF FIT) */}
      <Route
        path={ROUTES.SUPER_DASHBOARD}
        element={
          <SuperAdminRoute>
            <SuperDashboardPage />
          </SuperAdminRoute>
        }
      />
      <Route
        path={ROUTES.SUPER_GYMS}
        element={
          <SuperAdminRoute>
            <SuperGymsPage />
          </SuperAdminRoute>
        }
      />
      <Route
        path={ROUTES.SUPER_PLANS}
        element={
          <SuperAdminRoute>
            <PlansListPage />
          </SuperAdminRoute>
        }
      />
      <Route
        path={ROUTES.SUPER_BLOCKED}
        element={
          <SuperAdminRoute>
            <BlockedEmailsPage />
          </SuperAdminRoute>
        }
      />

      {/* Admin */}
      <Route
        path={ROUTES.ADMIN_DASHBOARD}
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminDashboardPage />
          </PrivateRoute>
        }
      />
      <Route
        path={ROUTES.ADMIN_MEMBERS}
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <MembersListPage />
          </PrivateRoute>
        }
      />
      <Route
        path={ROUTES.ADMIN_MEMBER_DETAIL}
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <MemberDetailPage />
          </PrivateRoute>
        }
      />
      <Route
        path={ROUTES.ADMIN_ROUTINES}
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <RoutinesListPage />
          </PrivateRoute>
        }
      />
      <Route
        path={ROUTES.ADMIN_ROUTINE_NEW}
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <RoutineEditorPage />
          </PrivateRoute>
        }
      />
      <Route
        path={ROUTES.ADMIN_ROUTINE_DETAIL}
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <RoutineEditorPage />
          </PrivateRoute>
        }
      />
      <Route
        path={ROUTES.ADMIN_EXERCISES}
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <ExercisesListPage />
          </PrivateRoute>
        }
      />
      <Route
        path={ROUTES.ADMIN_TARIFFS}
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <TariffsListPage />
          </PrivateRoute>
        }
      />
      <Route
        path={ROUTES.ADMIN_BRANDING}
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <BrandingPage />
          </PrivateRoute>
        }
      />
      <Route
        path={ROUTES.ADMIN_MY_GYM}
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <MyGymPage />
          </PrivateRoute>
        }
      />
      <Route
        path={ROUTES.ADMIN_SPONSORS}
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <SponsorsPage />
          </PrivateRoute>
        }
      />
      <Route
        path={ROUTES.ADMIN_MY_QR}
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminQrPage />
          </PrivateRoute>
        }
      />
      <Route
        path={ROUTES.ADMIN_TODAY}
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <TodayAttendancePage />
          </PrivateRoute>
        }
      />
      <Route
        path={ROUTES.ADMIN_CLASSES}
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <ClassesComingSoonPage />
          </PrivateRoute>
        }
      />
      <Route
        path={ROUTES.ADMIN_PRODUCTS}
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <ProductsListPage />
          </PrivateRoute>
        }
      />
      <Route
        path={ROUTES.ADMIN_RANKING}
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <RankingPage />
          </PrivateRoute>
        }
      />

      {/* Socio */}
      <Route
        path={ROUTES.APP_SCAN_QR}
        element={
          <PrivateRoute allowedRoles={['user']}>
            <ScanQrPage />
          </PrivateRoute>
        }
      />
      <Route
        path={ROUTES.APP_ROUTINES}
        element={
          <PrivateRoute allowedRoles={['user']}>
            <SocioPaymentGate>
              <MyRoutinesPage />
            </SocioPaymentGate>
          </PrivateRoute>
        }
      />
      <Route
        path={ROUTES.APP_LOGS}
        element={
          <PrivateRoute allowedRoles={['user']}>
            <SocioPaymentGate>
              <MyLogsPage />
            </SocioPaymentGate>
          </PrivateRoute>
        }
      />
      <Route
        path={ROUTES.APP_ATTENDANCE}
        element={
          <PrivateRoute allowedRoles={['user']}>
            <SocioPaymentGate>
              <MyAttendancePage />
            </SocioPaymentGate>
          </PrivateRoute>
        }
      />
      <Route
        path={ROUTES.APP_PROFILE}
        element={
          <PrivateRoute allowedRoles={['user']}>
            <SocioPaymentGate>
              <ProfilePage />
            </SocioPaymentGate>
          </PrivateRoute>
        }
      />
      {/* Sin SocioPaymentGate: es solo un placeholder de "próximamente". */}
      <Route
        path={ROUTES.APP_CLASSES}
        element={
          <PrivateRoute allowedRoles={['user']}>
            <ClassesComingSoonPage />
          </PrivateRoute>
        }
      />
      {/* Sin SocioPaymentGate: el contacto del gym debe estar siempre accesible. */}
      <Route
        path={ROUTES.APP_MY_GYM}
        element={
          <PrivateRoute allowedRoles={['user']}>
            <MyGymMemberPage />
          </PrivateRoute>
        }
      />
      {/* Sin SocioPaymentGate: comprar productos no depende de la cuota al día. */}
      <Route
        path={ROUTES.APP_PRODUCTS}
        element={
          <PrivateRoute allowedRoles={['user']}>
            <ShopPage />
          </PrivateRoute>
        }
      />
      {/* Sin SocioPaymentGate: es marketing/motivación, siempre visible. */}
      <Route
        path={ROUTES.APP_RANKING}
        element={
          <PrivateRoute allowedRoles={['user']}>
            <RankingPage />
          </PrivateRoute>
        }
      />

      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
