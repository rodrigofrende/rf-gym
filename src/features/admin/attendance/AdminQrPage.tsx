import { useMemo, useState } from 'react'
import { Copy, Maximize2, Printer, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useTenant } from '@/providers/TenantProvider'
import { useToast } from '@/providers/ToastProvider'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, Heading, Text } from '@/components/ui'
import { checkInRoute } from '@/routes/routePaths'

export function AdminQrPage() {
  const { activeGymId, activeMembership } = useTenant()
  const { notify } = useToast()
  const [fullscreen, setFullscreen] = useState(false)
  const gymId = activeGymId as string
  const gymName = activeMembership?.gymName ?? 'Gimnasio'
  const qrUrl = useMemo(() => new URL(checkInRoute(gymId), window.location.origin).toString(), [gymId])

  const copy = async () => {
    await navigator.clipboard.writeText(qrUrl)
    notify('Link copiado', 'success')
  }

  const qr = (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <QRCodeSVG value={qrUrl} size={280} level="M" includeMargin />
    </div>
  )

  return (
    <AppLayout
      title="Mi QR"
      subtitle="Mostrá o imprimí este QR fijo para registrar la asistencia de tus socios."
      actions={
        <>
          <Button variant="secondary" leftIcon={<Maximize2 className="size-4" />} onClick={() => setFullscreen(true)}>
            Mostrar en pantalla
          </Button>
          <Button leftIcon={<Printer className="size-4" />} onClick={() => window.print()}>
            Imprimir
          </Button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="flex flex-col items-center p-6 text-center">
          <Text variant="caption">QR de ingreso</Text>
          <Heading variant="display" className="mt-1">
            {gymName}
          </Heading>
          <div className="my-6">{qr}</div>
          <Text>Escaneá este código al llegar al gimnasio para registrar tu asistencia.</Text>
        </Card>

        <Card className="p-5">
          <Text variant="label" as="h2">
            Link del QR
          </Text>
          <p className="mt-2 break-all rounded-xl bg-surface-muted p-3 text-sm text-zinc-600">{qrUrl}</p>
          <Button fullWidth variant="secondary" className="mt-4" leftIcon={<Copy className="size-4" />} onClick={copy}>
            Copiar link
          </Button>
          <div className="mt-5 rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm text-brand-800">
            Es un QR estático: podés imprimirlo una vez y dejarlo pegado. El registro se valida con la sesión del socio.
          </div>
        </Card>
      </div>

      {fullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface p-6">
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            className="absolute right-4 top-4 rounded-xl p-2 text-zinc-500 hover:bg-zinc-100"
            aria-label="Cerrar pantalla completa"
          >
            <X className="size-6" />
          </button>
          <div className="text-center">
            <Heading variant="display">{gymName}</Heading>
            <p className="mt-2 text-zinc-500">Escaneá para registrar tu asistencia</p>
            <div className="mt-8">{qr}</div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
