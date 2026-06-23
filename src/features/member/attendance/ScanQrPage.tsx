import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import jsQR from 'jsqr'
import { Camera, CameraOff, CheckCircle2, QrCode } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, Heading, Text } from '@/components/ui'
import { ROUTES } from '@/routes/routePaths'

type ScannerState = 'idle' | 'requesting' | 'scanning' | 'found' | 'error'

function checkInPathFromQr(value: string): string | null {
  try {
    const url = value.startsWith('/') ? new URL(value, window.location.origin) : new URL(value)
    if (url.origin !== window.location.origin) return null
    const match = url.pathname.match(/^\/check-in\/([^/]+)$/)
    if (!match) return null
    return `${url.pathname}${url.search}`
  } catch {
    return null
  }
}

export function ScanQrPage() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameRef = useRef<number | null>(null)
  const [state, setState] = useState<ScannerState>('idle')
  const [message, setMessage] = useState('Tocá el botón para habilitar la cámara y apuntá al QR del gimnasio.')

  const stopCamera = () => {
    if (frameRef.current != null) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  useEffect(() => stopCamera, [])

  const scanFrame = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d', { willReadFrequently: true })

    if (!video || !canvas || !ctx || video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
      frameRef.current = requestAnimationFrame(scanFrame)
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const result = jsQR(image.data, image.width, image.height)
    const path = result ? checkInPathFromQr(result.data) : null

    if (path) {
      setState('found')
      setMessage('QR detectado. Registrando asistencia...')
      stopCamera()
      navigate(path)
      return
    }

    if (result) setMessage('Encontré un QR, pero no corresponde a este gimnasio. Probá con el QR de recepción.')
    frameRef.current = requestAnimationFrame(scanFrame)
  }

  const startCamera = async () => {
    setState('requesting')
    setMessage('Solicitando permiso de cámara...')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setState('scanning')
      setMessage('Apuntá la cámara al QR. La asistencia se registra automáticamente al detectarlo.')
      frameRef.current = requestAnimationFrame(scanFrame)
    } catch {
      setState('error')
      setMessage('No pudimos acceder a la cámara. Revisá los permisos del navegador e intentá de nuevo.')
      stopCamera()
    }
  }

  const scanning = state === 'requesting' || state === 'scanning'

  return (
    <AppLayout title="Escanear QR" subtitle="Usá la cámara del teléfono para registrar tu asistencia al llegar.">
      <div className="mx-auto max-w-lg space-y-4">
        <Card className="overflow-hidden">
          <div className="relative aspect-[3/4] bg-zinc-950 sm:aspect-video">
            {scanning ? (
              <video ref={videoRef} className="size-full object-cover" playsInline muted />
            ) : (
              <div className="flex size-full flex-col items-center justify-center p-8 text-center text-white">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-white/10">
                  {state === 'error' ? <CameraOff className="size-8" /> : <QrCode className="size-8" />}
                </div>
                <Heading variant="card" className="mt-4 text-white">
                  Escáner de asistencia
                </Heading>
                <p className="mt-2 text-sm text-zinc-300">La cámara se activa solo en esta pantalla.</p>
              </div>
            )}
            {state === 'scanning' && (
              <div className="pointer-events-none absolute inset-8 rounded-3xl border-2 border-white/80 shadow-[0_0_0_999px_rgb(0_0_0/0.35)]" />
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </Card>

        <Card className="p-5 text-center">
          <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            {state === 'found' ? <CheckCircle2 className="size-6" /> : <Camera className="size-6" />}
          </div>
          <Text className="mt-3">{message}</Text>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button loading={state === 'requesting'} onClick={startCamera} disabled={state === 'scanning'}>
              {state === 'error' ? 'Reintentar cámara' : state === 'scanning' ? 'Escaneando...' : 'Activar cámara'}
            </Button>
            {state === 'scanning' && (
              <Button variant="secondary" onClick={() => {
                stopCamera()
                setState('idle')
                setMessage('Cámara pausada. Podés activarla de nuevo cuando quieras escanear.')
              }}>
                Detener
              </Button>
            )}
          </div>
          <Button variant="ghost" className="mt-3" onClick={() => navigate(ROUTES.APP_ROUTINES)}>
            Volver a mis rutinas
          </Button>
        </Card>
      </div>
    </AppLayout>
  )
}
