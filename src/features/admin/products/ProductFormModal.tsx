import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Upload } from 'lucide-react'
import type { Product } from '@/types'
import {
  Button,
  FormField,
  Input,
  LogoImage,
  Modal,
  MoneyInput,
  Textarea,
  Toggle,
} from '@/components/ui'
import { useToast } from '@/providers/ToastProvider'
import { fileToProductImageDataUrl, LogoImageError } from '@/utils/image'

const schema = z.object({
  name: z.string().min(2, 'Ingresá un nombre'),
  description: z.string().min(1, 'Ingresá una descripción'),
  photoURL: z.string().min(1, 'Subí una foto del producto'),
  price: z.number().min(1, 'Ingresá un precio mayor a 0'),
  discountPct: z
    .number({ error: 'Ingresá un número entre 0 y 100' })
    .min(0, 'Entre 0 y 100')
    .max(100, 'Entre 0 y 100'),
  available: z.boolean(),
})
type FormValues = z.infer<typeof schema>

const DEFAULT_VALUES: FormValues = {
  name: '',
  description: '',
  photoURL: '',
  price: 0,
  discountPct: 0,
  available: true,
}

function valuesFromProduct(product?: Product | null): FormValues {
  if (!product) return DEFAULT_VALUES
  return {
    name: product.name,
    description: product.description,
    photoURL: product.photoURL,
    price: product.price,
    discountPct: product.discountPct ?? 0,
    available: product.available,
  }
}

export function ProductFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  saving,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: Omit<Product, 'id'>) => void
  initial?: Product | null
  saving?: boolean
}) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    if (open) reset(valuesFromProduct(initial))
  }, [initial, open, reset])

  const close = () => {
    reset(valuesFromProduct(initial))
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={initial ? 'Editar producto' : 'Nuevo producto'}
      size="lg"
    >
      <form
        // El % con decimales se redondea a entero (las rules exigen int).
        onSubmit={handleSubmit((v) => onSubmit({ ...v, discountPct: Math.round(v.discountPct) }))}
        className="space-y-4"
      >
        <FormField label="Foto del producto" error={errors.photoURL?.message} required>
          <Controller
            control={control}
            name="photoURL"
            render={({ field }) => (
              <ProductImageField value={field.value} onChange={field.onChange} />
            )}
          />
        </FormField>

        <FormField label="Nombre" error={errors.name?.message} required>
          <Input placeholder="Ej. Proteína Whey 1kg" {...register('name')} invalid={!!errors.name} />
        </FormField>

        <FormField label="Descripción" error={errors.description?.message} required>
          <Textarea
            placeholder="Ej. Proteína de suero sabor vainilla. Ideal post-entreno."
            rows={3}
            {...register('description')}
            invalid={!!errors.description}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Precio" error={errors.price?.message} required>
            <Controller
              control={control}
              name="price"
              render={({ field }) => <MoneyInput value={field.value ?? 0} onChange={field.onChange} />}
            />
          </FormField>
          <FormField
            label="Promoción (% de descuento)"
            hint="0 = sin promoción"
            error={errors.discountPct?.message}
          >
            <Input
              type="number"
              min={0}
              max={100}
              {...register('discountPct', { valueAsNumber: true })}
              invalid={!!errors.discountPct}
            />
          </FormField>
        </div>

        <Controller
          control={control}
          name="available"
          render={({ field }) => (
            <Toggle
              checked={field.value}
              onChange={field.onChange}
              label="Disponible (visible para los socios)"
              tooltip="Los socios solo ven los productos disponibles en la tienda."
            />
          )}
        />

        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3">
          <Button type="button" variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {initial ? 'Guardar' : 'Crear producto'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/**
 * Subida de la foto del producto: mismo flujo que sponsors/logo (archivo →
 * recorte cuadrado 512 → WebP/JPEG comprimido → data URL en el form). Pensado
 * para fotos de celular: acepta hasta 25MB y sale liviana (<150KB).
 */
function ProductImageField({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const { notify } = useToast()
  const [processing, setProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file?: File) => {
    if (!file) return
    setProcessing(true)
    try {
      onChange(await fileToProductImageDataUrl(file))
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
        alt="Foto del producto"
        className="size-16 shrink-0 rounded-xl"
        iconClassName="size-6"
      />
      <span className="min-w-0 flex-1 truncate text-sm text-zinc-600">
        {value ? 'Foto cargada' : 'Sin foto'}
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
        Subir foto
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
