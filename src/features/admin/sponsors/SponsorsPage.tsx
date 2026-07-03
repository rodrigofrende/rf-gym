import { type CSSProperties, type ReactNode } from 'react'
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
import { Crown, ExternalLink, GripVertical, Megaphone, Plus, Star, Trash2 } from 'lucide-react'
import type { Gym, GymPresentation as GymPresentationData, SponsorTier } from '@/types'
import { useTenant } from '@/providers/TenantProvider'
import { useToast } from '@/providers/ToastProvider'
import { useGym } from '@/hooks/useGym'
import { useGymPresentation, useUpdateGymPresentation } from '@/hooks/useGymPresentation'
import { usePlans } from '@/hooks/usePlans'
import { useToastAction } from '@/hooks/useToastAction'
import { buildThemeVars, PLATFORM_DEFAULT_THEME } from '@/utils/theme'
import { resolvePresentation } from '@/utils/presentation'
import { isSafeHttpUrl } from '@/utils/url'
import { instagramHandle } from '@/utils/contact'
import { parseVideoUrl } from '@/utils/video'
import { canCreateSponsor, usageLabel } from '@/utils/plans'
import { publicGymRoute } from '@/routes/routePaths'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge, Button, Card, CardBody, CardHeader, FormField, FullPageSpinner, Input, Text, Tooltip } from '@/components/ui'
import { cn } from '@/utils/cn'
import { PublicGymView } from '@/features/gym-presentation/PublicGymView'

const MAX_SPONSORS_HARD = 24 // techo de forma; el tope real es por plan

// Flag temporal: la carga de patrocinadores todavía no está habilitada.
// Poner en `false` para activar la feature.
const SPONSORS_COMING_SOON: boolean = true

const schema = z
  .object({
    sponsors: z
      .array(
        z.object({
          name: z.string(),
          tier: z.enum(['featured', 'standard']),
          logoURL: z.string(),
          instagram: z.string(),
          whatsapp: z.string(),
          youtubeURL: z.string(),
        }),
      )
      .max(MAX_SPONSORS_HARD),
  })
  .superRefine((vals, ctx) => {
    vals.sponsors.forEach((s, i) => {
      if (!s.name.trim())
        ctx.addIssue({ code: 'custom', path: ['sponsors', i, 'name'], message: 'Poné un nombre' })
      if (s.logoURL.trim() && !isSafeHttpUrl(s.logoURL))
        ctx.addIssue({ code: 'custom', path: ['sponsors', i, 'logoURL'], message: 'URL de imagen inválida (http/https)' })
      if (s.youtubeURL.trim() && parseVideoUrl(s.youtubeURL)?.kind !== 'youtube')
        ctx.addIssue({ code: 'custom', path: ['sponsors', i, 'youtubeURL'], message: 'Pegá un link de YouTube válido' })
      const digits = s.whatsapp.replace(/\D/g, '')
      if (digits.length > 0 && digits.length < 8)
        ctx.addIssue({ code: 'custom', path: ['sponsors', i, 'whatsapp'], message: 'Número de WhatsApp inválido' })
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
        tier: s.tier,
        logoURL: s.logoURL ?? '',
        instagram: s.instagram ?? '',
        whatsapp: s.whatsapp ?? '',
        youtubeURL: s.youtubeURL ?? '',
      })),
    },
  })

  const sponsors = useFieldArray({ control, name: 'sponsors' })
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const createLimit = canCreateSponsor(plan, sponsors.fields.length)
  const canAdd = !SPONSORS_COMING_SOON && sponsors.fields.length < MAX_SPONSORS_HARD && createLimit.allowed
  const addTooltip = SPONSORS_COMING_SOON
    ? 'Próximamente'
    : !createLimit.allowed
      ? (createLimit.reason ?? 'Alcanzaste el límite de patrocinadores.')
      : 'Agregar un patrocinador'

  const addSponsor = () => {
    if (SPONSORS_COMING_SOON) return
    if (!createLimit.allowed) {
      notify(createLimit.reason ?? 'Alcanzaste el límite de patrocinadores.', 'error')
      return
    }
    sponsors.append({ name: '', tier: 'standard', logoURL: '', instagram: '', whatsapp: '', youtubeURL: '' })
  }

  const draft = useWatch({ control })
  const previewData: Partial<GymPresentationData> = {
    ...(presentation ?? {}),
    name: gym.name,
    logoURL: gym.logoURL,
    theme: gym.theme,
    sponsors: (draft.sponsors ?? []).map((s) => ({
      name: s?.name ?? '',
      tier: (s?.tier ?? 'standard') as SponsorTier,
      logoURL: s?.logoURL,
      instagram: s?.instagram,
      whatsapp: s?.whatsapp,
      youtubeURL: s?.youtubeURL,
    })),
  }
  const previewStyle = buildThemeVars(gym.theme ?? PLATFORM_DEFAULT_THEME) as CSSProperties

  const onSubmit = (v: FormValues) => {
    if (SPONSORS_COMING_SOON) return // feature todavía no habilitada
    return run(
      () =>
        save.mutateAsync({
          sponsors: v.sponsors
            .filter((s) => s.name.trim())
            .map((s) => ({
              name: s.name.trim(),
              tier: s.tier,
              ...(isSafeHttpUrl(s.logoURL) ? { logoURL: s.logoURL.trim() } : {}),
              ...(instagramHandle(s.instagram) ? { instagram: instagramHandle(s.instagram) } : {}),
              ...(s.whatsapp.trim() ? { whatsapp: s.whatsapp.trim() } : {}),
              ...(s.youtubeURL.trim() && parseVideoUrl(s.youtubeURL)?.kind === 'youtube'
                ? { youtubeURL: s.youtubeURL.trim() }
                : {}),
            })),
          name: gym.name,
          logoURL: gym.logoURL,
          theme: gym.theme ?? PLATFORM_DEFAULT_THEME,
          updatedAt: new Date(),
        }),
      { success: 'Patrocinadores actualizados', error: 'No se pudieron guardar los patrocinadores' },
    )
  }

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
            subtitle="Cargá cada marca con su logo, Instagram, WhatsApp y video. Arrastrá para ordenar."
            action={
              <div className="flex items-center gap-2">
                {SPONSORS_COMING_SOON && <Badge tone="amber">Próximamente</Badge>}
                <Tooltip text={addTooltip}>
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
                </Tooltip>
              </div>
            }
          />
          <CardBody className="space-y-4">
            {plan && (
              <Badge tone={createLimit.allowed ? 'neutral' : 'amber'}>
                {usageLabel(sponsors.fields.length, plan.maxSponsors ?? 0)} patrocinadores del plan
              </Badge>
            )}

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

                          <FormField label="Nivel">
                            <Controller
                              control={control}
                              name={`sponsors.${i}.tier`}
                              render={({ field: tierField }) => (
                                <div className="flex gap-2">
                                  <TierButton
                                    active={tierField.value === 'featured'}
                                    onClick={() => tierField.onChange('featured')}
                                    icon={<Crown className="size-4" />}
                                    label="Destacado"
                                  />
                                  <TierButton
                                    active={tierField.value !== 'featured'}
                                    onClick={() => tierField.onChange('standard')}
                                    icon={<Star className="size-4" />}
                                    label="Estándar"
                                  />
                                </div>
                              )}
                            />
                          </FormField>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <FormField label="Logo (URL de imagen)" error={errors.sponsors?.[i]?.logoURL?.message}>
                              <Input placeholder="https://..." {...register(`sponsors.${i}.logoURL`)} invalid={!!errors.sponsors?.[i]?.logoURL} />
                            </FormField>
                            <FormField label="Instagram" hint="Usuario o URL del perfil">
                              <Input placeholder="marca o instagram.com/marca" {...register(`sponsors.${i}.instagram`)} />
                            </FormField>
                            <FormField label="WhatsApp" hint="Número con código de país" error={errors.sponsors?.[i]?.whatsapp?.message}>
                              <Input inputMode="tel" placeholder="+54 9 11 2345-6789" {...register(`sponsors.${i}.whatsapp`)} invalid={!!errors.sponsors?.[i]?.whatsapp} />
                            </FormField>
                            <FormField label="Video de YouTube" hint="Solo se muestra en Destacado" error={errors.sponsors?.[i]?.youtubeURL?.message}>
                              <Input placeholder="https://youtube.com/watch?v=..." {...register(`sponsors.${i}.youtubeURL`)} invalid={!!errors.sponsors?.[i]?.youtubeURL} />
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
          </CardBody>
        </Card>

        <div className="flex justify-end">
          <Tooltip text={SPONSORS_COMING_SOON ? 'Próximamente' : 'Guardar cambios'}>
            <Button type="submit" loading={save.isPending} disabled={SPONSORS_COMING_SOON}>
              Guardar
            </Button>
          </Tooltip>
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

function TierButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        active ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50',
      )}
    >
      {icon}
      {label}
    </button>
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
