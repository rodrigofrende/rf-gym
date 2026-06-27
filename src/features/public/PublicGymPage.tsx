import type { CSSProperties } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { useGymPresentation } from '@/hooks/useGymPresentation'
import { buildThemeVars, PLATFORM_DEFAULT_THEME } from '@/utils/theme'
import { FullPageSpinner } from '@/components/ui'
import { PublicGymView } from '@/features/gym-presentation/PublicGymView'

/**
 * Página pública de presentación del gym (`/g/:gymId`). 100% anónima: no usa
 * AppLayout (la Sidebar necesita tenant) y aplica el theme del gym de forma local
 * vía inline style, sin contaminar `:root`. Lee `publicProfiles/{gymId}`, legible
 * sin login. El look "Athletic Bold" vive en PublicGymView.
 */
export function PublicGymPage() {
  const { gymId } = useParams()
  const { data, isLoading } = useGymPresentation(gymId ?? '')

  if (!gymId) return <Navigate to="/" replace />
  if (isLoading) return <FullPageSpinner />

  const themeStyle = buildThemeVars(data?.theme ?? PLATFORM_DEFAULT_THEME) as CSSProperties

  if (!data) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-zinc-950 px-6 text-center text-white">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-white/5 text-zinc-400">
          <Building2 className="size-7" />
        </div>
        <h1 className="mt-4 text-xl font-bold">Gimnasio no encontrado</h1>
        <p className="mt-1 max-w-sm text-sm text-zinc-400">
          Es posible que el enlace sea incorrecto o que el gimnasio todavía no haya publicado su
          presentación.
        </p>
      </div>
    )
  }

  return (
    <div style={themeStyle} className="min-h-full bg-zinc-950">
      <PublicGymView data={data} gymName={data.name} />
    </div>
  )
}
