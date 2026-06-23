import { Timestamp } from 'firebase/firestore'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { KeyRound, LockKeyhole } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/providers/ToastProvider'
import { Button, Card, FormField, Heading, Input, Text } from '@/components/ui'
import { claimPendingMemberships } from '@/services/membershipsService'
import { getMemberLogin, updateMemberAuthStatus } from '@/services/memberLoginService'
import { mapAuthError } from '@/utils/authErrors'
import { ROUTES } from '@/routes/routePaths'

const schema = z
  .object({
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirm: z.string().min(6, 'Repetí la contraseña'),
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'Las contraseñas no coinciden',
  })

type FormValues = z.infer<typeof schema>

function passwordHint(password: string, email: string) {
  if (!password) return 'Usá al menos 6 caracteres.'
  if (email && password.toLowerCase() === email.toLowerCase()) return 'No uses tu email como contraseña.'
  if (password.length >= 10 && /\d/.test(password) && /[a-zA-Z]/.test(password)) return 'Seguridad buena.'
  return 'Seguridad básica. Mejor si combinás letras y números.'
}

export function SetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user, registerEmail, changePassword, isInitialized } = useAuth()
  const { notify } = useToast()
  const email = (params.get('email') ?? user?.email ?? '').trim().toLowerCase()
  const mode = params.get('mode') === 'change' ? 'change' : 'create'

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })
  const password = useWatch({ control, name: 'password' }) ?? ''

  if (!email) return <Navigate to={ROUTES.LOGIN} replace />
  if (!isInitialized) return null
  if (mode === 'change' && !user) {
    return <Navigate to={`${ROUTES.LOGIN}?redirect=${encodeURIComponent(`${ROUTES.SET_PASSWORD}?email=${email}&mode=change`)}`} replace />
  }

  const onSubmit = async (values: FormValues) => {
    if (values.password.toLowerCase() === email.toLowerCase()) {
      notify('La contraseña no puede ser igual al email', 'error')
      return
    }

    try {
      const login = await getMemberLogin(email)
      if (!login) {
        notify('No encontramos un socio con ese email', 'error')
        return
      }

      if (mode === 'create') {
        const createdUser = await registerEmail(login.memberName, email, values.password)
        await claimPendingMemberships(createdUser)
      } else {
        await changePassword(values.password)
      }

      await updateMemberAuthStatus(login.gymId, login.memberId, 'active', {
        passwordUpdatedAt: Timestamp.now(),
        passwordResetRequestedAt: null,
      })
      notify(mode === 'create' ? 'Contraseña creada' : 'Contraseña actualizada', 'success')
      navigate('/')
    } catch (err) {
      notify(mapAuthError(err), 'error')
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-brand-50 to-zinc-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
            <LockKeyhole className="size-7" />
          </div>
          <Heading variant="display" className="mt-4">
            {mode === 'create' ? 'Crear contraseña' : 'Cambiar contraseña'}
          </Heading>
          <Text variant="caption">{email}</Text>
        </div>

        <Card className="p-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Nueva contraseña" error={errors.password?.message} hint={passwordHint(password, email)} required>
              <Input type="password" placeholder="••••••••" {...register('password')} />
            </FormField>
            <FormField label="Repetir contraseña" error={errors.confirm?.message} required>
              <Input type="password" placeholder="••••••••" {...register('confirm')} />
            </FormField>
            <Button type="submit" fullWidth loading={isSubmitting} leftIcon={<KeyRound className="size-4" />}>
              Guardar contraseña
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
