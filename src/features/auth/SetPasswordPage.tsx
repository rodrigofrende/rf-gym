import { useEffect } from 'react'
import { Timestamp } from 'firebase/firestore'
import { useQueryClient } from '@tanstack/react-query'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { KeyRound, LockKeyhole } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { MemberLoginIndex } from '@/types'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/providers/ToastProvider'
import { Button, Card, FormField, Heading, PasswordInput, Text } from '@/components/ui'
import { claimMembership, claimPendingMemberships } from '@/services/membershipsService'
import { getMemberLogin, updateMemberAuthStatus } from '@/services/memberLoginService'
import { extractAuthCode, mapAuthError } from '@/utils/authErrors'
import { extractFirestoreCode, mapFirestoreError } from '@/utils/firestoreErrors'
import { queryKeys } from '@/hooks/queryKeys'
import { useMemberships } from '@/hooks/useMemberships'
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
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, isSuperAdmin, loginEmail, registerEmail, changePassword, updateDisplayName, isInitialized } = useAuth()
  const { notify } = useToast()
  const email = (params.get('email') ?? user?.email ?? '').trim().toLowerCase()
  const mode = params.get('mode') === 'change' ? 'change' : 'create'
  const { data: memberships = [], isLoading: membershipsLoading } = useMemberships(user, isSuperAdmin)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })
  const password = useWatch({ control, name: 'password' }) ?? ''

  useEffect(() => {
    if (!isInitialized) return
    if (!email) return
    if (mode !== 'create') return
    if (!user?.email || user.email.toLowerCase() !== email) return
    if (membershipsLoading) return
    if (memberships.length > 0) {
      navigate('/', { replace: true })
    }
  }, [isInitialized, mode, user, email, membershipsLoading, memberships.length, navigate])

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
      // LoginPage ya leyó el índice de login: lo reutilizamos vía location.state
      // (con fallback a red para deep-links directos a /set-password).
      const stateLogin = (location.state as { login?: MemberLoginIndex } | null)?.login
      const login =
        stateLogin?.email?.toLowerCase() === email ? stateLogin : await getMemberLogin(email)
      if (!login) {
        notify('No encontramos un socio con ese email', 'error')
        return
      }

      const authExtra = {
        passwordUpdatedAt: Timestamp.now(),
        passwordResetRequestedAt: null,
      }
      let activatedUser = user
      if (mode === 'create') {
        let createdUser = user?.email?.toLowerCase() === email ? user : null
        if (!createdUser) {
          try {
            // El índice de login ya no trae el nombre (es world-readable): registramos
            // con un placeholder y lo corregimos con el fullName del member doc abajo.
            createdUser = await registerEmail(email.split('@')[0], email, values.password)
          } catch (err) {
            if (err && typeof err === 'object' && 'code' in err && err.code === 'auth/email-already-in-use') {
              try {
                createdUser = await loginEmail(email, values.password)
              } catch {
                throw new Error('existing-account-password-mismatch')
              }
            } else {
              throw err
            }
          }
        }
        activatedUser = createdUser

        // 1) Claim REQUERIDO: por path directo (getDoc + updateDoc). No usa
        //    collectionGroup ni requiere índice. Si falla, es error real → propaga.
        const directClaim = await claimMembership(createdUser, login.gymId, login.memberId)

        // 2) En paralelo (el claim ya trae el member leído, sin re-lecturas):
        //    activación del gym principal (requerida) + displayName (best-effort).
        if (directClaim) {
          await Promise.all([
            updateMemberAuthStatus(login.gymId, login.memberId, 'active', authExtra, {
              member: directClaim.member,
              gymName: login.gymName,
            }),
            directClaim.member?.fullName
              ? updateDisplayName(directClaim.member.fullName).catch(() => {
                  // El displayName se puede editar luego desde el perfil.
                })
              : Promise.resolve(),
          ])
        }

        // 3) Claims adicionales por email (multi-tenant) en BACKGROUND, best-effort:
        //    son el caso raro y no deben demorar el ingreso al gimnasio que escaneó.
        void claimPendingMemberships(createdUser)
          .then((pendingClaims) =>
            Promise.allSettled(
              pendingClaims
                .filter((m) => !(m.gymId === login.gymId && m.memberId === login.memberId))
                .map((m) =>
                  updateMemberAuthStatus(m.gymId, m.memberId, 'active', authExtra, {
                    member: m.member,
                  }),
                ),
            ),
          )
          .then(() => {
            if (createdUser?.uid) {
              queryClient.invalidateQueries({ queryKey: queryKeys.memberships(createdUser.uid) })
            }
          })
          .catch(() => {
            // best-effort; el claim principal ya quedó hecho.
          })
      } else {
        await changePassword(values.password)
        await updateMemberAuthStatus(login.gymId, login.memberId, 'active', authExtra, {
          gymName: login.gymName,
        })
      }

      if (activatedUser?.uid) {
        // Sin await: la refetch corre mientras navegamos (HomeRedirect muestra spinner).
        void queryClient.invalidateQueries({ queryKey: queryKeys.memberships(activatedUser.uid) })
      }
      notify(mode === 'create' ? 'Contraseña creada' : 'Contraseña actualizada', 'success')
      navigate('/')
    } catch (err) {
      const message =
        err instanceof Error && err.message === 'existing-account-password-mismatch'
          ? 'Esta cuenta ya tenía contraseña. Ingresá con esa contraseña desde Login o pedí blanqueo a administración.'
          : extractAuthCode(err)
        ? mapAuthError(err, 'No se pudo crear la contraseña')
        : extractFirestoreCode(err)
          ? mapFirestoreError(err, 'No se pudo activar el acceso al gimnasio')
          : mapAuthError(err)
      notify(message, 'error')
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
              <PasswordInput placeholder="••••••••" invalid={!!errors.password} {...register('password')} />
            </FormField>
            <FormField label="Repetir contraseña" error={errors.confirm?.message} required>
              <PasswordInput placeholder="••••••••" invalid={!!errors.confirm} {...register('confirm')} />
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
