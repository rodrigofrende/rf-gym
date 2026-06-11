import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/providers/AuthProvider'
import { TenantProvider } from '@/providers/TenantProvider'
import { TenantThemeEffect } from '@/providers/TenantThemeEffect'
import { ToastProvider } from '@/providers/ToastProvider'
import { AppRoutes } from '@/routes/AppRoutes'
import { DemoSwitcher } from '@/components/layout/DemoSwitcher'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <TenantProvider>
              <TenantThemeEffect />
              <AppRoutes />
              <DemoSwitcher />
            </TenantProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
