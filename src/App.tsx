import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/providers/AuthProvider'
import { TenantProvider } from '@/providers/TenantProvider'
import { TenantThemeEffect } from '@/providers/TenantThemeEffect'
import { ToastProvider } from '@/providers/ToastProvider'
import { PrivacyProvider } from '@/providers/PrivacyProvider'
import { AppRoutes } from '@/routes/AppRoutes'
import { isNonRetryableError } from '@/utils/firestoreErrors'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // No reintentar errores de permisos/sesión: el retry no los va a arreglar
      // y suma lecturas de Firestore al pedo.
      retry: (failureCount, error) => !isNonRetryableError(error) && failureCount < 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
    mutations: {
      retry: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <PrivacyProvider>
        <ToastProvider>
          <AuthProvider>
            <TenantProvider>
              <TenantThemeEffect />
              <AppRoutes />
            </TenantProvider>
          </AuthProvider>
        </ToastProvider>
        </PrivacyProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
