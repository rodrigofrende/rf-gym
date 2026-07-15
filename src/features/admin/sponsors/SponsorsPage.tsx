import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ExternalLink, GripVertical, Megaphone, Plus, Trash2, Upload } from 'lucide-react'
import type { Gym, GymPresentation as GymPresentationData } from '@/types'
import { useTenant } from '@/providers/TenantProvider'
import { useToast } from '@/providers/ToastProvider'
import { useGym } from '@/hooks/useGym'
import { useGymPresentation, useUpdateGymPresentation } from '@/hooks/useGymPresentation'
import { usePlans } from '@/hooks/usePlans'
import { useToastAction } from '@/hooks/useToastAction'
import { buildThemeVars, PLATFORM_DEFAULT_THEME } from '@/utils/theme'
import { resolvePresentation } from '@/utils/presentation'
import { isSafeHttpUrl, isSafeImageSrc } from '@/utils/url'
import { fileToSponsorImageDataUrl, LogoImageError } from '@/utils/image'
import { toDate } from '@/utils/format'
import { canCreateSponsor, usageLabel } from '@/utils/plans'
import { publicGymRoute } from '@/routes/routePaths'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge, Button, Card, CardBody, CardHeader, FormField, FullPageSpinner, Input, LogoImage, Text } from '@/components/ui'
import { cn } from '@/utils/cn'
import { PublicGymView } from '@/features/gym-presentation/PublicGymView'

// Tope duro: los que entran en pantalla (grilla de 2 columnas × 3 filas).
// El tope por plan (`maxSponsors`) puede ser más chico. Espejado en firestore.rules.
const MAX_SPONSORS = 6

// Límite de cambios de sponsors por día, espejado en firestore.rules
// (sponsorsLimitOk). Mismo esquema de ventana de 24hs que el logo de "Marca".
const SPONSORS_CHANGES_PER_DAY = 5
const SPONSORS_WINDOW_MS = 24 * 60 * 60 * 1000

const formatResetTime = (d: Date) =>
  new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)

const schema = z
  .object({
    sponsors: z
      .array(
        z.object({
          name: z.string(),
          imageURL: z.string(),
          phone: z.string(),
          linkURL: z.string(),
        }),
      )
      .max(MAX_SPONSORS),
  })
  .superRefine((vals, ctx) => {
    vals.sponsors.forEach((s, i) => {
      if (!s.name.trim())
        ctx.addIssue({ code: 'custom', path: ['sponsors', i, 'name'], message: 'Poné un nombre' })
      if (s.imageURL.trim() && !isSafeImageSrc(s.imageURL))
        ctx.addIssue({ code: 'custom', path: ['sponsors', i, 'imageURL'], message: 'Imagen inválida. Volvé a subirla.' })
      const digits = s.phone.replace(/\D/g, '')
      if (digits.length > 0 && digits.length < 8)
        ctx.addIssue({ code: 'custom', path: ['sponsors', i, 'phone'], message: 'Número de teléfono inválido' })
      if (s.linkURL.trim() && !isSafeHttpUrl(s.linkURL))
        ctx.addIssue({ code: 'custom', path: ['sponsors', i, 'linkURL'], message: 'URL inválida (http/https)' })
    })
  })
type FormValues = z.infer<typeof schema>

/** Loader: trae gym + presentación y monta el formulario una vez listos. */
export function SponsorsPage() {
  const { activeGymId } = useTenant()
  const gymId = activeGymId as string
  const { data: gym, isLoading: gymLoading } = useGym(gymId)
  const { data: presentation, isLoading: presLoading } = useGymPresentation(gymId)

  return (
    <AppLayout
      title="Patrocinadores"
      subtitle="Marcas que auspician tu gimnasio. Se muestran en tu página pública y a tus socios."
      actions={
        <Button
          variant="secondary"
          leftIcon={<ExternalLink className="size-4" />}
          onClick={() => window.open(publicGymRoute(gymId), '_blank', 'noopener,noreferrer')}
        >
          Ver página pública
        </Button>
      }
    >
      {gymLoading || presLoading || !gym ? (
        <FullPageSpinner />
      ) : (
        <SponsorsForm gymId={gymId} gym={gym} presentation={presentation ?? null} />
      )}
    </AppLayout>
  )
}

function SponsorsForm({
  gymId,
  gym,
  presentation,
}: {
  gymId: string
  gym: Gym
  presentation: GymPresentationData | null
}) {
  const run = useToastAction()
  const { notify } = useToast()
  const save = useUpdateGymPresentation(gymId)
  const { data: plans = [] } = usePlans()
  const plan = plans.find((p) => p.id === gym.subscription?.planId)
  const resolved = resolvePresentation(presentation)

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      sponsors: resolved.sponsors.map((s) => ({
        name: s.name,
        imageURL: s.imageURL ?? '',
        phone: s.phone ?? '',
        linkURL: s.linkURL ?? '',
      })),
    },
  })

  const sponsors = useFieldArray({ control, name: 'sponsors' })
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Ventana de rate-limit de cambios (espejo de lo que validan las firestore.rules).
  const windowStart = toDate(presentation?.sponsorsWindowStart)
  // Lectura del reloj solo para la leyenda: al guardar se recalcula fresco, y la
  // validación real la aplican las firestore.rules.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now()
  const windowActive = !!windowStart && nowMs - windowStart.getTime() < SPONSORS_WINDOW_MS
  const changesUsed = windowActive ? (presentation?.sponsorsChangeCount ?? 0) : 0
  const changesLeft = Math.max(0, SPONSORS_CHANGES_PER_DAY - changesUsed)
  const changesBlocked = changesLeft === 0
  const resetAt = windowStart ? new Date(windowStart.getTime() + SPONSORS_WINDOW_MS) : null

  const createLimit = canCreateSponsor(plan, sponsors.fields.length)
  const atHardCap = sponsors.fields.length >= MAX_SPONSORS
  const canAdd = !atHardCap && createLimit.allowed

  const addSponsor = () => {
    if (atHardCap) {
      notify(`Máximo ${MAX_SPONSORS} patrocinadores (los que entran en pantalla).`, 'error')
      return
    }
    if (!createLimit.allowed) {
      notify(createLimit.reason ?? 'Alcanzaste el límite de patrocinadores.', 'error')
      return
    }
    sponsors.append({ name: '', imageURL: '', phone: '', linkURL: '' })
  }

  const draft = useWatch({ control })
  const previewData: Partial<GymPresentationData> = {
    ...(presentation ?? {}),
    name: gym.name,
    logoURL: gym.logoURL,
    theme: gym.theme,
    sponsors: (draft.sponsors ?? []).map((s) => ({
      name: s?.name ?? '',
      imageURL: s?.imageURL,
      phone: s?.phone,
      linkURL: s?.linkURL,
    })),
  }
  const previewStyle = buildThemeVars(gym.theme ?? PLATFORM_DEFAULT_THEME) as CSSProperties

  const onSubmit = (v: FormValues) =>
    run(
      async () => {
        const cleaned = v.sponsors
          .filter((s) => s.name.trim())
          .map((s) => ({
            name: s.name.trim(),
            ...(isSafeImageSrc(s.imageURL) ? { imageURL: s.imageURL.trim() } : {}),
            ...(s.phone.trim() ? { phone: s.phone.trim() } : {}),
            ...(isSafeHttpUrl(s.linkURL) ? { linkURL: s.linkURL.trim() } : {}),
          }))
        // Guardar sin cambios en la lista no consume el límite (ambos lados
        // construyen el mismo shape normalizado, la comparación es estable).
        const changed = JSON.stringify(cleaned) !== JSON.stringify(resolved.sponsors)
        // Recalcular la ventana con el reloj actual (la de render puede estar vieja).
        const activeNow = !!windowStart && Date.now() - windowStart.getTime() < SPONSORS_WINDOW_MS
        const usedNow = activeNow ? (presentation?.sponsorsChangeCount ?? 0) : 0
        if (changed && usedNow >= SPONSORS_CHANGES_PER_DAY) {
          throw new Error(
            `Alcanzaste el límite de ${SPONSORS_CHANGES_PER_DAY} cambios de patrocinadores por día.` +
              (resetAt ? ` Podés volver a cambiarlos el ${formatResetTime(resetAt)}.` : ''),
          )
        }
        const logoURL = gym.logoURL?.trim()
        await save.mutateAsync({
          sponsors: cleaned,
          // Los contadores viajan solo si la lista cambió: espejo de firestore.rules.
          ...(changed
            ? {
                sponsorsChangeCount: usedNow + 1,
                ...(activeNow ? {} : { startSponsorsWindow: true }),
              }
            : {}),
          name: gym.name,
          // Mirror de marca: solo data URL (rules de publicProfiles); null → deleteField.
          logoURL: logoURL && /^data:image\//i.test(logoURL) ? logoURL : null,
          theme: gym.theme ?? PLATFORM_DEFAULT_THEME,
          updatedAt: new Date(),
        })
      },
      { success: 'Patrocinadores actualizados', error: 'No se pudieron guardar los patrocinadores' },
    )

  const onDragEnd = (event: DragEndEvent) => {
    const ids = sponsors.fields.map((f) => f.id)
    const activeId = String(event.active.id)
    const overId = event.over ? String(event.over.id) : ''
    if (!overId || activeId === overId) return
    const from = ids.indexOf(activeId)
    const to = ids.indexOf(overId)
    if (from >= 0 && to >= 0) sponsors.move(from, to)
  }

  const sponsorIds = sponsors.fields.map((f) => f.id)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <div className="space-y-6">
        <Card>
          <CardHeader
            title="Patrocinadores"
            subtitle="Solo el nombre es obligatorio; imagen, teléfono y link suman. Arrastrá para ordenar."
            action={
              <Button
                type="button"
                size="sm"
                variant="secondary"
                leftIcon={<Plus className="size-4" />}
                onClick={addSponsor}
                disabled={!canAdd}
              >
                Agregar
              </Button>
            }
          />
          <CardBody className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {plan && (
                <Badge tone={createLimit.allowed ? 'neutral' : 'amber'}>
                  {usageLabel(sponsors.fields.length, plan.maxSponsors ?? 0)} patrocinadores del plan
                </Badge>
              )}
              <span className="text-xs text-zinc-500">
                Se muestran hasta {MAX_SPONSORS} (los que entran en pantalla).
              </span>
            </div>

            {sponsors.fields.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-zinc-200 bg-surface-muted px-3 py-4 text-sm text-zinc-500">
                <Megaphone className="size-4 text-zinc-400" />
                Todavía no cargaste patrocinadores.
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={sponsorIds} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {sponsors.fields.map((field, i) => (
                      <SortableRow key={field.id} id={field.id} onRemove={() => sponsors.remove(i)} removeLabel={`Eliminar patrocinador ${i + 1}`}>
                        <div className="space-y-3">
                          <FormField label="Nombre" error={errors.sponsors?.[i]?.name?.message} required>
                            <Input placeholder="Ej. Suplementos XYZ" {...register(`sponsors.${i}.name`)} invalid={!!errors.sponsors?.[i]?.name} />
                          </FormField>

                          <FormField label="Imagen" hint="Cuadrada; se recorta y comprime al subirla." error={errors.sponsors?.[i]?.imageURL?.message}>
                            <Controller
                              control={control}
                              name={`sponsors.${i}.imageURL`}
                              render={({ field: imageField }) => (
                                <SponsorImageField
                                  value={imageField.value}
                                  onChange={imageField.onChange}
                                  sponsorName={draft.sponsors?.[i]?.name ?? ''}
                                />
                              )}
                            />
                          </FormField>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <FormField label="Teléfono" hint="Con código de país; abre WhatsApp" error={errors.sponsors?.[i]?.phone?.message}>
                              <Input inputMode="tel" placeholder="+54 9 11 2345-6789" {...register(`sponsors.${i}.phone`)} invalid={!!errors.sponsors?.[i]?.phone} />
                            </FormField>
                            <FormField label="Link" hint="Sitio, Instagram o lo que quieras" error={errors.sponsors?.[i]?.linkURL?.message}>
                              <Input placeholder="https://..." {...register(`sponsors.${i}.linkURL`)} invalid={!!errors.sponsors?.[i]?.linkURL} />
                            </FormField>
                          </div>
                        </div>
                      </SortableRow>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
            {errors.sponsors?.message && <p className="text-xs text-red-500">{errors.sponsors.message}</p>}

            {changesBlocked && resetAt ? (
              <p className="text-xs font-medium text-amber-600">
                Alcanzaste el límite de {SPONSORS_CHANGES_PER_DAY} cambios de patrocinadores por día.
                Podés volver a cambiarlos el {formatResetTime(resetAt)}.
              </p>
            ) : windowActive && changesUsed > 0 ? (
              <p className="text-xs text-zinc-500">
                Te {changesLeft === 1 ? 'queda' : 'quedan'} {changesLeft}{' '}
                {changesLeft === 1 ? 'cambio' : 'cambios'} de patrocinadores hoy.
              </p>
            ) : null}
          </CardBody>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" loading={save.isPending} disabled={changesBlocked}>
            Guardar
          </Button>
        </div>
      </div>

      <div className="lg:sticky lg:top-4">
        <Text variant="label" className="mb-2">
          Vista previa
        </Text>
        <p className="mb-3 text-xs text-zinc-500">Así se ven tus patrocinadores en la página pública.</p>
        <div style={previewStyle} className="overflow-hidden rounded-[var(--radius-card)] border border-zinc-800 shadow-sm">
          <PublicGymView data={previewData} gymName={gym.name} />
        </div>
      </div>
    </form>
  )
}

/**
 * Subida de imagen del patrocinador: mismo flujo que el logo de "Marca"
 * (archivo → recorte cuadrado → WebP comprimido → data URL en el form).
 */
function SponsorImageField({
  value,
  onChange,
  sponsorName,
}: {
  value: string
  onChange: (v: string) => void
  sponsorName: string
}) {
  const { notify } = useToast()
  const [processing, setProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file?: File) => {
    if (!file) return
    setProcessing(true)
    try {
      onChange(await fileToSponsorImageDataUrl(file))
    } catch (err) {
      notify(err instanceof LogoImageError ? err.message : 'No se pudo procesar la imagen.', 'error')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-control)] border border-zinc-200 bg-zinc-50/60 px-3 py-2">
      <LogoImage
        src={value}
        alt={sponsorName ? `Imagen de ${sponsorName}` : 'Imagen del patrocinador'}
        className="size-9 shrink-0 rounded-lg"
        iconClassName="size-4"
      />
      <span className="min-w-0 flex-1 truncate text-sm text-zinc-600">
        {value ? 'Imagen cargada' : 'Sin imagen'}
      </span>
      {value && (
        <Button type="button" size="sm" variant="ghost" onClick={() => onChange('')}>
          Quitar
        </Button>
      )}
      <Button
        type="button"
        size="sm"
        variant="secondary"
        leftIcon={<Upload className="size-3.5" />}
        loading={processing}
        onClick={() => fileInputRef.current?.click()}
      >
        Subir imagen
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </div>
  )
}

function SortableRow({
  id,
  onRemove,
  removeLabel,
  children,
}: {
  id: string
  onRemove: () => void
  removeLabel: string
  children: ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('flex items-start gap-2 rounded-xl border border-zinc-200 bg-white p-2', isDragging && 'z-10 opacity-80 shadow-lg')}
    >
      <button
        type="button"
        className="mt-2 shrink-0 cursor-grab touch-none rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        aria-label="Arrastrar para reordenar"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="mt-2 shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  )
}
