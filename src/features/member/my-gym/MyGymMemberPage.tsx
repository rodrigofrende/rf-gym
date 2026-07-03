import { Building2 } from 'lucide-react'
import { useTenant } from '@/providers/TenantProvider'
import { useGymPresentation } from '@/hooks/useGymPresentation'
import { AppLayout } from '@/components/layout/AppLayout'
import { EmptyState, FullPageSpinner } from '@/components/ui'
import { GymPresentation } from '@/features/gym-presentation/GymPresentation'

/** Vista de solo lectura de la presentación del gym para el socio logueado. */
export function MyGymMemberPage() {
  const { activeGymId, activeMembership } = useTenant()
  const gymId = activeGymId ?? ''
  const { data, isLoading } = useGymPresentation(gymId)
  const gymName = data?.name || activeMembership?.gymName || 'Mi gimnasio'
  const hasContent = Boolean(
    data &&
      (data.description ||
        data.videoURL ||
        data.whatsapp ||
        data.email ||
        data.address ||
        data.videos?.length ||
        data.links?.length ||
        data.sponsors?.length),
  )

  return (
    <AppLayout title="Mi gimnasio" subtitle="Información y contacto de tu gimnasio.">
      {isLoading ? (
        <FullPageSpinner />
      ) : data && hasContent ? (
        <div className="mx-auto max-w-2xl">
          <GymPresentation data={data} gymName={gymName} />
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title="Todavía no hay información"
          description="Tu gimnasio aún no cargó su presentación. Volvé a visitarla más adelante."
        />
      )}
    </AppLayout>
  )
}
