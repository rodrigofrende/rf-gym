import { useEffect, useState, type CSSProperties } from 'react'
import { Dumbbell, RotateCcw } from 'lucide-react'
import type { GymTheme } from '@/types'
import { useTenant } from '@/providers/TenantProvider'
import { useToast } from '@/providers/ToastProvider'
import { useGym, useUpdateGymBranding } from '@/hooks/useGym'
import {
  applyTenantTheme,
  BRANDING_PRESETS,
  buildThemeVars,
  normalizeHex,
  PLATFORM_DEFAULT_THEME,
} from '@/utils/theme'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge, Button, Card, CardBody, CardHeader, FormField, FullPageSpinner, Input } from '@/components/ui'
import { cn } from '@/utils/cn'

const FIELD_DEFAULTS: Record<keyof GymTheme, string> = { ...PLATFORM_DEFAULT_THEME }

export function BrandingPage() {
  const { activeGymId } = useTenant()
  const gymId = activeGymId as string
  const { notify } = useToast()
  const { data: gym, isLoading } = useGym(gymId)
  const save = useUpdateGymBranding(gymId)

  const [theme, setTheme] = useState<GymTheme | null>(null)
  const [logoURL, setLogoURL] = useState<string | null>(null)

  useEffect(() => {
    if (!gym) return
    applyTenantTheme(theme ?? gym.theme ?? PLATFORM_DEFAULT_THEME)
    return () => applyTenantTheme(gym.theme ?? null)
  }, [theme, gym])

  if (isLoading || !gym) {
    return (
      <AppLayout
        title="Marca"
        subtitle="Personalizá el logo y los colores que ven tus socios en la app."
      >
        <FullPageSpinner />
      </AppLayout>
    )
  }

  const savedTheme = gym.theme ?? PLATFORM_DEFAULT_THEME
  const current = theme ?? savedTheme
  const currentLogo = logoURL ?? gym.logoURL ?? ''

  const setColor = (key: keyof GymTheme, value: string) =>
    setTheme({ ...current, [key]: normalizeHex(value, FIELD_DEFAULTS[key]) })

  const applyPreset = (preset: GymTheme) => setTheme({ ...preset })

  const resetAllDefaults = () => setTheme({ ...PLATFORM_DEFAULT_THEME })

  const handleSave = async () => {
    try {
      await save.mutateAsync({ theme: current, logoURL: currentLogo || undefined })
      notify('Branding actualizado', 'success')
    } catch {
      notify('No se pudo guardar el branding', 'error')
    }
  }

  const previewStyle = buildThemeVars(current) as CSSProperties
  const isCustomized = JSON.stringify(current) !== JSON.stringify(PLATFORM_DEFAULT_THEME)

  return (
    <AppLayout
      title="Marca"
      subtitle="Personalizá el logo y los colores que ven tus socios en la app."
    >
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Identidad del gimnasio"
            subtitle="Logo, colores y paletas sugeridas para tu marca."
          />
          <CardBody className="space-y-5">
            <FormField label="Logo (URL)" hint="Imagen cuadrada; se muestra en el menú lateral.">
              <Input
                placeholder="https://..."
                value={currentLogo}
                onChange={(e) => setLogoURL(e.target.value)}
              />
            </FormField>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-zinc-700">Paletas sugeridas</legend>
              <p className="mb-3 text-xs text-zinc-500">
                Aplicá un conjunto de colores y ajustá los detalles después.
              </p>
              <div className="flex flex-wrap gap-2">
                {BRANDING_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.theme)}
                    className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <span
                      className="size-4 shrink-0 rounded-full ring-1 ring-zinc-200"
                      style={{ backgroundColor: preset.theme.accent }}
                      aria-hidden
                    />
                    {preset.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="space-y-4 rounded-xl border border-zinc-100 bg-zinc-50/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-zinc-700">Colores</p>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  leftIcon={<RotateCcw className="size-3.5" />}
                  onClick={resetAllDefaults}
                  disabled={!isCustomized && !theme}
                >
                  Restaurar predeterminados
                </Button>
              </div>

              <ColorField
                label="Color principal (accent)"
                hint="Botones, links y estados activos."
                value={current.accent}
                defaultValue={FIELD_DEFAULTS.accent}
                onChange={(v) => setColor('accent', v)}
                swatches={BRANDING_PRESETS.map((p) => p.theme.accent)}
              />
              <ColorField
                label="Fondo de página"
                hint="Color de fondo general de la app."
                value={current.background}
                defaultValue={FIELD_DEFAULTS.background}
                onChange={(v) => setColor('background', v)}
              />
              <ColorField
                label="Superficie (contenedores)"
                hint="Fondo de tarjetas, modales y menú."
                value={current.container}
                defaultValue={FIELD_DEFAULTS.container}
                onChange={(v) => setColor('container', v)}
              />
              <ColorField
                label="Color del texto"
                hint="Elegí según tus fondos para que se lea bien."
                value={current.text}
                defaultValue={FIELD_DEFAULTS.text}
                onChange={(v) => setColor('text', v)}
                swatches={['#18181b', '#0f172a', '#ffffff', '#14532d']}
              />
            </div>

            <div className="flex justify-end border-t border-zinc-100 pt-3">
              <Button loading={save.isPending} onClick={handleSave}>
                Guardar
              </Button>
            </div>
          </CardBody>
        </Card>

        <div>
          <p className="mb-2 text-sm font-semibold text-zinc-700">Vista previa</p>
          <p className="mb-3 text-xs text-zinc-500">
            Los cambios se aplican en vivo mientras editás. Al salir sin guardar, vuelve el tema
            guardado.
          </p>
          <div
            style={previewStyle}
            className="space-y-4 rounded-[var(--radius-card)] border border-zinc-200 bg-surface-muted p-5 shadow-sm"
          >
            <div className="flex items-center gap-2">
              {currentLogo ? (
                <img src={currentLogo} alt="Logo" className="size-9 rounded-xl object-cover" />
              ) : (
                <div className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white">
                  <Dumbbell className="size-5" />
                </div>
              )}
              <span className="text-lg font-bold text-zinc-900">{gym.name}</span>
            </div>

            <Card className="p-4">
              <p className="text-sm font-semibold text-zinc-900">Tarjeta de ejemplo</p>
              <p className="mt-1 text-sm text-zinc-500">
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
  defaultValue,
  onChange,
  swatches,
}: {
  label: string
  hint: string
  value: string
  defaultValue: string
  onChange: (v: string) => void
  swatches?: string[]
}) {
  const safeValue = normalizeHex(value, defaultValue)
  const isDefault = safeValue.toLowerCase() === defaultValue.toLowerCase()

  return (
    <FormField label={label} hint={hint}>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative size-10 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            <span
              className="absolute inset-1 rounded-md ring-1 ring-inset ring-black/10"
              style={{ backgroundColor: safeValue }}
              aria-hidden
            />
            <input
              type="color"
              value={safeValue}
              onChange={(e) => onChange(e.target.value)}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
              aria-label={`Elegir ${label}`}
            />
          </label>
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={(e) => onChange(normalizeHex(e.target.value, defaultValue))}
            className="min-w-[7rem] flex-1 font-mono uppercase sm:max-w-[9rem]"
            spellCheck={false}
          />
          <Button
            type="button"
            size="sm"
            variant={isDefault ? 'secondary' : 'ghost'}
            onClick={() => onChange(defaultValue)}
            disabled={isDefault}
            className="shrink-0"
          >
            Predeterminado
          </Button>
        </div>
        {swatches && swatches.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {swatches.map((swatch) => {
              const normalized = normalizeHex(swatch)
              const selected = safeValue.toLowerCase() === normalized.toLowerCase()
              return (
                <button
                  key={normalized}
                  type="button"
                  aria-label={`Usar color ${normalized}`}
                  aria-pressed={selected}
                  onClick={() => onChange(normalized)}
                  className={cn(
                    'size-7 rounded-full ring-1 ring-zinc-200 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1',
                    selected && 'ring-2 ring-brand-500 ring-offset-1',
                  )}
                  style={{ backgroundColor: normalized }}
                />
              )
            })}
          </div>
        )}
      </div>
    </FormField>
  )
}
