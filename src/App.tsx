import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/providers/AuthProvider'
import { TenantProvider } from '@/providers/TenantProvider'
import { TenantThemeEffect } from '@/providers/TenantThemeEffect'
import { ToastProvider } from '@/providers/ToastProvider'
import { PrivacyProvider } from '@/providers/PrivacyProvider'
import { AppRoutes } from '@/routes/AppRoutes'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
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
