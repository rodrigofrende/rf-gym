import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/providers/AuthProvider'
import { useTenant } from '@/providers/TenantProvider'
import { FullPageSpinner } from '@/components/ui'
import { LoginPage } from '@/features/auth/LoginPage'
import { SetPasswordPage } from '@/features/auth/SetPasswordPage'
import { TenantSelectPage } from '@/features/tenant-select/TenantSelectPage'
// Lazy: el panel admin trae recharts; lo separamos para no pesar el bundle inicial
// (login y vista de socio mobile no lo descargan).
const AdminDashboardPage = lazy(() =>
  import('@/features/admin/dashboard/AdminDashboardPage').then((m) => ({
    default: m.AdminDashboardPage,
  })),
)
const ScanQrPage = lazy(() =>
  import('@/features/member/attendance/ScanQrPage').then((m) => ({
    default: m.ScanQrPage,
  })),
)
// Lazy: la página pública la abren prospectos sin login; la separamos para no
// arrastrar el resto del bundle a esa primera visita.
const PublicGymPage = lazy(() =>
  import('@/features/public/PublicGymPage').then((m) => ({
    default: m.PublicGymPage,
  })),
)
import { MembersListPage } from '@/features/admin/members/MembersListPage'
import { MemberDetailPage } from '@/features/admin/members/MemberDetailPage'
import { RoutinesListPage } from '@/features/admin/routines/RoutinesListPage'
import { RoutineEditorPage } from '@/features/admin/routines/RoutineEditorPage'
import { ExercisesListPage } from '@/features/admin/exercises/ExercisesListPage'
import { TariffsListPage } from '@/features/admin/tariffs/TariffsListPage'
import { BrandingPage } from '@/features/admin/branding/BrandingPage'
import { MyGymPage } from '@/features/admin/my-gym/MyGymPage'
import { SponsorsPage } from '@/features/admin/sponsors/SponsorsPage'
import { MyGymMemberPage } from '@/features/member/my-gym/MyGymMemberPage'
import { AdminQrPage } from '@/features/admin/attendance/AdminQrPage'
import { TodayAttendancePage } from '@/features/admin/attendance/TodayAttendancePage'
import { CheckInPage } from '@/features/member/attendance/CheckInPage'
import { ProfilePage } from '@/features/member/profile/ProfilePage'
import { MyRoutinesPage } from '@/features/member/routines/MyRoutinesPage'
import { MyLogsPage } from '@/features/member/logs/MyLogsPage'
import { MyAttendancePage } from '@/features/member/attendance/MyAttendancePage'
import { SocioPaymentGate } from '@/features/payments/SocioPaymentGate'
import { SuperGymsPage } from '@/features/super/SuperGymsPage'
import { SuperDashboardPage } from '@/features/super/SuperDashboardPage'
import { PlansListPage } from '@/features/super/PlansListPage'
import { PrivateRoute, SuperAdminRoute } from './PrivateRoute'
import { defaultHomeForRole, ROUTES } from './routePaths'

/** Decide la home según el estado de auth/rol para la ruta raíz. */
function HomeRedirect() {
  const { user, isInitialized } = useAuth()
  const { isLoading, role, isSuperAdmin } = useTenant()
  if (!isInitialized || isLoading) return <FullPageSpinner />
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
