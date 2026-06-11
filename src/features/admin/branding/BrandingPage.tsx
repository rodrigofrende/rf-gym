import { useState, type CSSProperties } from 'react'
import { Dumbbell } from 'lucide-react'
import type { GymTheme } from '@/types'
import { useTenant } from '@/providers/TenantProvider'
import { useToast } from '@/providers/ToastProvider'
import { useGym, useUpdateGymBranding } from '@/hooks/useGym'
import { buildThemeVars } from '@/utils/theme'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge, Button, Card, CardBody, CardHeader, FormField, FullPageSpinner, Input } from '@/components/ui'

const DEFAULT_THEME: GymTheme = {
  accent: '#4f46e5',
  background: '#f8fafc',
  container: '#ffffff',
  text: '#0f172a',
}

export function BrandingPage() {
  const { activeGymId } = useTenant()
  const gymId = activeGymId as string
  const { notify } = useToast()
  const { data: gym, isLoading } = useGym(gymId)
  const save = useUpdateGymBranding(gymId)

  // Estado local del formulario; se inicializa una vez que llega el gym.
  const [theme, setTheme] = useState<GymTheme | null>(null)
  const [logoURL, setLogoURL] = useState<string | null>(null)

  if (isLoading || !gym) {
    return (
      <AppLayout title="Marca">
        <FullPageSpinner />
      </AppLayout>
    )
  }

  const current = theme ?? gym.theme ?? DEFAULT_THEME
  const currentLogo = logoURL ?? gym.logoURL ?? ''

  const setColor = (key: keyof GymTheme, value: string) =>
    setTheme({ ...current, [key]: value })

  const handleSave = async () => {
    try {
      await save.mutateAsync({ theme: current, logoURL: currentLogo || undefined })
      notify('Branding actualizado', 'success')
    } catch {
      notify('No se pudo guardar el branding', 'error')
    }
  }

  const previewStyle = buildThemeVars(current) as CSSProperties

  return (
    <AppLayout title="Marca">
      <div className="mx-auto grid max-w-4xl gap-5 lg:grid-cols-2">
        {/* Formulario */}
        <Card>
          <CardHeader
            title="Identidad del gimnasio"
            subtitle="Personalizá el logo y los colores que ven tus socios."
          />
          <CardBody className="space-y-4">
            <FormField label="Logo (URL)" hint="Imagen cuadrada; se muestra en el menú lateral.">
              <Input
                placeholder="https://..."
                value={currentLogo}
                onChange={(e) => setLogoURL(e.target.value)}
              />
            </FormField>

            <ColorField
              label="Color principal (accent)"
              hint="Botones, links y estados activos."
              value={current.accent}
              onChange={(v) => setColor('accent', v)}
            />
            <ColorField
              label="Fondo de página"
              hint="Color de fondo general de la app."
              value={current.background}
              onChange={(v) => setColor('background', v)}
            />
            <ColorField
              label="Superficie (contenedores)"
              hint="Fondo de tarjetas, modales y menú."
              value={current.container}
              onChange={(v) => setColor('container', v)}
            />
            <ColorField
              label="Color del texto"
              hint="Elegí según tus fondos para que se lea bien."
              value={current.text}
              onChange={(v) => setColor('text', v)}
              quickChoices={[
                { label: 'Negro', value: '#0f172a' },
                { label: 'Blanco', value: '#ffffff' },
              ]}
            />

            <div className="flex justify-end border-t border-slate-100 pt-3">
              <Button loading={save.isPending} onClick={handleSave}>
                Guardar
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Preview en vivo: las variables CSS sólo aplican dentro de este bloque. */}
        <div>
          <p className="mb-2 text-sm font-medium text-slate-500">Vista previa</p>
          <div
            style={previewStyle}
            className="space-y-4 rounded-[var(--radius-card)] border border-slate-200 bg-surface-muted p-5"
          >
            <div className="flex items-center gap-2">
              {currentLogo ? (
                <img src={currentLogo} alt="Logo" className="size-9 rounded-xl object-cover" />
              ) : (
                <div className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white">
                  <Dumbbell className="size-5" />
                </div>
              )}
              <span className="text-lg font-bold text-slate-900">{gym.name}</span>
            </div>

            <Card className="p-4">
              <p className="text-sm font-semibold text-slate-900">Tarjeta de ejemplo</p>
              <p className="mt-1 text-sm text-slate-500">
                Así se ven los contenedores con tus colores.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm">Acción</Button>
                <Button size="sm" variant="secondary">
                  Secundaria
                </Button>
                <Badge tone="brand">Etiqueta</Badge>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

function ColorField({
  label,
  hint,
  value,
  onChange,
  quickChoices,
}: {
  label: string
  hint: string
  value: string
  onChange: (v: string) => void
  quickChoices?: { label: string; value: string }[]
}) {
  return (
    <FormField label={label} hint={hint}>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-10 cursor-pointer rounded-lg border border-slate-200 bg-surface p-0.5"
          aria-label={label}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono uppercase"
        />
        {quickChoices?.map((c) => (
          <Button
            key={c.value}
            type="button"
            size="sm"
            variant={value.toLowerCase() === c.value.toLowerCase() ? 'primary' : 'secondary'}
            onClick={() => onChange(c.value)}
          >
            {c.label}
          </Button>
        ))}
      </div>
    </FormField>
  )
}
