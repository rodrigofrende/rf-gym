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

/** Lazy para páginas con named export. */
function lazyPage<M>(load: () => Promise<M>, pick: (m: M) => ComponentType) {
  return lazy(() => load().then((m) => ({ default: pick(m) })))
}

// Panel admin (el dashboard además trae recharts)
const AdminDashboardPage = lazyPage(() => import('@/features/admin/dashboard/AdminDashboardPage'), (m) => m.AdminDashboardPage)
const MembersListPage = lazyPage(() => import('@/features/admin/members/MembersListPage'), (m) => m.MembersListPage)
const MemberDetailPage = lazyPage(() => import('@/features/admin/members/MemberDetailPage'), (m) => m.MemberDetailPage)
const RoutinesListPage = lazyPage(() => import('@/features/admin/routines/RoutinesListPage'), (m) => m.RoutinesListPage)
const RoutineEditorPage = lazyPage(() => import('@/features/admin/routines/RoutineEditorPage'), (m) => m.RoutineEditorPage)
const ExercisesListPage = lazyPage(() => import('@/features/admin/exercises/ExercisesListPage'), (m) => m.ExercisesListPage)
const TariffsListPage = lazyPage(() => import('@/features/admin/tariffs/TariffsListPage'), (m) => m.TariffsListPage)
const BrandingPage = lazyPage(() => import('@/features/admin/branding/BrandingPage'), (m) => m.BrandingPage)
const MyGymPage = lazyPage(() => import('@/features/admin/my-gym/MyGymPage'), (m) => m.MyGymPage)
const SponsorsPage = lazyPage(() => import('@/features/admin/sponsors/SponsorsPage'), (m) => m.SponsorsPage)
const AdminQrPage = lazyPage(() => import('@/features/admin/attendance/AdminQrPage'), (m) => m.AdminQrPage)
const TodayAttendancePage = lazyPage(() => import('@/features/admin/attendance/TodayAttendancePage'), (m) => m.TodayAttendancePage)
// Socio (ScanQrPage trae jsqr)
const ScanQrPage = lazyPage(() => import('@/features/member/attendance/ScanQrPage'), (m) => m.ScanQrPage)
const MyRoutinesPage = lazyPage(() => import('@/features/member/routines/MyRoutinesPage'), (m) => m.MyRoutinesPage)
const MyLogsPage = lazyPage(() => import('@/features/member/logs/MyLogsPage'), (m) => m.MyLogsPage)
const MyAttendancePage = lazyPage(() => import('@/features/member/attendance/MyAttendancePage'), (m) => m.MyAttendancePage)
const ProfilePage = lazyPage(() => import('@/features/member/profile/ProfilePage'), (m) => m.ProfilePage)
const MyGymMemberPage = lazyPage(() => import('@/features/member/my-gym/MyGymMemberPage'), (m) => m.MyGymMemberPage)
// Pública y super-admin
const PublicGymPage = lazyPage(() => import('@/features/public/PublicGymPage'), (m) => m.PublicGymPage)
const SuperGymsPage = lazyPage(() => import('@/features/super/SuperGymsPage'), (m) => m.SuperGymsPage)
const SuperDashboardPage = lazyPage(() => import('@/features/super/SuperDashboardPage'), (m) => m.SuperDashboardPage)
const PlansListPage = lazyPage(() => import('@/features/super/PlansListPage'), (m) => m.PlansListPage)

/** Decide la home según el estado de auth/rol para la ruta raíz. */
function HomeRedirect() {
  const { user, isInitialized, claimsResolved } = useAuth()
  const { isLoading, role, isSuperAdmin } = useTenant()
  // claimsResolved: necesario porque la decisión depende de isSuperAdmin.
  if (!isInitialized || isLoading || !claimsResolved) return <FullPageSpinner />
  if (!user) return <Navigate to={ROUTES.LOGIN} replace />
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
      {/* Sin SocioPaymentGate: el contacto del gym debe estar siempre accesible. */}
      <Route
        path={ROUTES.APP_MY_GYM}
        element={
          <PrivateRoute allowedRoles={['user']}>
            <MyGymMemberPage />
          </PrivateRoute>
        }
      />

      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
