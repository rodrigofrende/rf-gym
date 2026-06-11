import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/providers/AuthProvider'
import { useTenant } from '@/providers/TenantProvider'
import { FullPageSpinner } from '@/components/ui'
import { LoginPage } from '@/features/auth/LoginPage'
import { TenantSelectPage } from '@/features/tenant-select/TenantSelectPage'
import { AdminDashboardPage } from '@/features/admin/dashboard/AdminDashboardPage'
import { MembersListPage } from '@/features/admin/members/MembersListPage'
import { MemberDetailPage } from '@/features/admin/members/MemberDetailPage'
import { RoutinesListPage } from '@/features/admin/routines/RoutinesListPage'
import { BrandingPage } from '@/features/admin/branding/BrandingPage'
import { ProfilePage } from '@/features/member/profile/ProfilePage'
import { MyRoutinesPage } from '@/features/member/routines/MyRoutinesPage'
import { SuperGymsPage } from '@/features/super/SuperGymsPage'
import { PrivateRoute, SuperAdminRoute } from './PrivateRoute'
import { ROUTES } from './routePaths'

/** Decide la home según el estado de auth/rol para la ruta raíz. */
function HomeRedirect() {
  const { user, isInitialized } = useAuth()
  const { isLoading, role, isSuperAdmin } = useTenant()
  if (!isInitialized || isLoading) return <FullPageSpinner />
  if (!user) return <Navigate to={ROUTES.LOGIN} replace />
  if (isSuperAdmin) return <Navigate to={ROUTES.SUPER_GYMS} replace />
  if (!role) return <Navigate to={ROUTES.SELECT_GYM} replace />
  return <Navigate to={role === 'admin' ? ROUTES.ADMIN_DASHBOARD : ROUTES.APP_ROUTINES} replace />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.SELECT_GYM} element={<TenantSelectPage />} />

      {/* Super-admin */}
      <Route
        path={ROUTES.SUPER_GYMS}
        element={
          <SuperAdminRoute>
            <SuperGymsPage />
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
        path={ROUTES.ADMIN_BRANDING}
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <BrandingPage />
          </PrivateRoute>
        }
      />

      {/* Socio */}
      <Route
        path={ROUTES.APP_ROUTINES}
        element={
          <PrivateRoute allowedRoles={['user']}>
            <MyRoutinesPage />
          </PrivateRoute>
        }
      />
      <Route
        path={ROUTES.APP_PROFILE}
        element={
          <PrivateRoute allowedRoles={['user']}>
            <ProfilePage />
          </PrivateRoute>
        }
      />

      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
