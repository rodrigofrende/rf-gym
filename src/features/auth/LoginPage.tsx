import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Timestamp } from 'firebase/firestore'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Crown, Dumbbell, ShieldCheck, User } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Member } from '@/types'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/providers/ToastProvider'
import { env } from '@/config/env'
import { APP_NAME } from '@/config/app'
import { isSuperAdminEmail } from '@/config/superAdmins'
import { queryKeys } from '@/hooks/queryKeys'
import { getMemberLogin, updateMemberAuthStatus } from '@/services/memberLoginService'
import { getOne } from '@/services/firestore'
import { paths } from '@/services/paths'
import type { ClaimedMembership } from '@/services/membershipsService'
import { claimMembership, claimPendingMemberships } from '@/services/membershipsService'
import { extractAuthCode, mapAuthError } from '@/utils/authErrors'
import { extractFirestoreCode, mapFirestoreError } from '@/utils/firestoreErrors'
import { Button, Card, FormField, Heading, Input, PasswordInput, Text } from '@/components/ui'
import { ROUTES } from '@/routes/routePaths'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().optional(),
})
type FormValues = z.infer<typeof schema>
type LoginStep = 'email' | 'password'

function isFirstAccessAuthFailure(err: unknown) {
  const code = extractAuthCode(err)
  return code === 'auth/user-not-found' || code === 'auth/invalid-credential'
}

export function LoginPage() {
  const { user, loginEmail, loginGoogle, setDemoIdentity } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const [step, setStep] = useState<LoginStep>('email')
  const [resolvedEmail, setResolvedEmail] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const canUseGoogle = env.googleLoginEnabled
  const redirect = new URLSearchParams(location.search).get('redirect')
  const safeRedirect = redirect?.startsWith('/') ? redirect : '/'

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  // Ya autenticado (login real o demo) → a la home; HomeRedirect resuelve por rol.
  if (user) return <Navigate to={safeRedirect} replace />

  const onSubmit = async (values: FormValues) => {
    try {
      const email = values.email.trim().toLowerCase()
      if (step === 'email') {
        if (isSuperAdminEmail(email)) {
          setResolvedEmail(email)
          setValue('password', '')
          setStep('password')
          return
        }
        const login = await getMemberLogin(email)
        if (!login) {
          notify('No encontramos un socio con ese email', 'error')
          return
        }
        // Alta por "invitación reclamable": si todavía no creó su contraseña,
        // lo mandamos directo a crearla en vez de pedirle una que no existe.
        if (login.authStatus === 'pending_password') {
          navigate(`${ROUTES.SET_PASSWORD}?email=${encodeURIComponent(email)}&mode=create`)
          return
        }
        // 'active' | 'password_change_required' | undefined (legacy) → paso password.
        setResolvedEmail(email)
        setValue('password', '')
        setStep('password')
        return
      }

      if (!values.password) {
        notify('Ingresá tu contraseña', 'error')
        return
      }
      const login = await getMemberLogin(resolvedEmail || email)
      let loggedUser: Awaited<ReturnType<typeof loginEmail>>
      try {
        loggedUser = await loginEmail(resolvedEmail || email, values.password)
      } catch (err) {
        if (login?.authStatus === 'pending_password' && isFirstAccessAuthFailure(err)) {
          navigate(`${ROUTES.SET_PASSWORD}?email=${encodeURIComponent(resolvedEmail || email)}&mode=create`)
          return
        }
        throw err
      }
      const claimed = new Map<string, ClaimedMembership>()

      // 1) Claim principal del índice de login (si falla, no lo silenciamos).
      if (login) {
        const direct = await claimMembership(loggedUser, login.gymId, login.memberId)
        if (direct) claimed.set(`${direct.gymId}:${direct.memberId}`, direct)
      }

      // 2) Claims adicionales por el mismo email (multi-tenant), en best-effort.
      try {
        const pending = await claimPendingMemberships(loggedUser)
        pending.forEach((membership) => {
          claimed.set(`${membership.gymId}:${membership.memberId}`, membership)
        })
      } catch {
        // Si el claim principal ya salió bien, no bloqueamos el login por claims secundarios.
      }

      if (!claimed.size && login) {
        throw new Error('No se pudo vincular tu acceso a ningún gimnasio')
      }

      await Promise.all(
        [...claimed.values()].map(async (membership) => {
          const member = await getOne<Member>(paths.member(membership.gymId, membership.memberId))
          if (!member || member.authStatus === 'active' || member.authStatus === 'password_change_required') return
          await updateMemberAuthStatus(membership.gymId, membership.memberId, 'active', {
            passwordUpdatedAt: Timestamp.now(),
          })
        }),
      )

      await queryClient.invalidateQueries({ queryKey: queryKeys.memberships(loggedUser.uid) })
      let shouldForcePasswordChange = false
      if (login?.gymId && login?.memberId) {
        const member = await getOne<Member>(paths.member(login.gymId, login.memberId))
        shouldForcePasswordChange = member?.authStatus === 'password_change_required'
      }
      if (shouldForcePasswordChange) {
        navigate(`${ROUTES.SET_PASSWORD}?email=${encodeURIComponent(resolvedEmail || email)}&mode=change`)
      }
    } catch (err) {
      const message = extractAuthCode(err)
        ? mapAuthError(err)
        : extractFirestoreCode(err)
          ? mapFirestoreError(err, 'No se pudo sincronizar tu acceso al gimnasio')
          : err instanceof Error && err.message.includes('vincular tu acceso')
            ? 'Tu cuenta existe, pero no pudimos asociarla a un gimnasio. Pedile al super-admin que revise tu alta.'
            : mapAuthError(err)
      notify(message, 'error')
    }
  }

  const onLegacyRegister = async (identity: 'superadmin' | 'admin' | 'socio') => {
    if (setDemoIdentity) setDemoIdentity(identity)
  }

  const resetStep = () => {
    setStep('email')
    setResolvedEmail('')
    setValue('password', '')
  }

  const onPasswordSubmit = handleSubmit(onSubmit)

  const onGoogle = async () => {
    setGoogleLoading(true)
    try {
      await loginGoogle()
    } catch (err) {
      notify(mapAuthError(err), 'error')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-brand-50 to-zinc-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
            <Dumbbell className="size-7" />
          </div>
          <Heading variant="display" className="mt-4">
            {APP_NAME}
          </Heading>
          <Text variant="caption">Ingresá con tu email de acceso</Text>
        </div>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            {step === 'password' && (
              <button
                type="button"
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                onClick={resetStep}
                aria-label="Volver al email"
              >
                <ArrowLeft className="size-4" />
              </button>
            )}
            <Text variant="label" as="h2">
              {step === 'email' ? 'Email de acceso' : 'Contraseña'}
            </Text>
          </div>

          {env.demoMode && setDemoIdentity && (
            <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/60 p-3">
              <p className="mb-2 text-xs font-medium text-brand-700">
                Modo demo · datos de ejemplo en memoria (TigerFit)
              </p>
              <div className="space-y-2">
                <Button fullWidth leftIcon={<Crown className="size-4" />} onClick={() => onLegacyRegister('superadmin')}>
                  Entrar al management (Super admin)
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" leftIcon={<ShieldCheck className="size-4" />} onClick={() => onLegacyRegister('admin')}>
                    Entrar como Admin
                  </Button>
                  <Button variant="secondary" leftIcon={<User className="size-4" />} onClick={() => onLegacyRegister('socio')}>
                    Entrar como Socio
                  </Button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={onPasswordSubmit} className="mt-4 space-y-4">
            <FormField label="Email" error={errors.email?.message} required>
              <Input
                type="email"
                placeholder="usuario@gimnasio.com"
                invalid={!!errors.email}
                disabled={step === 'password'}
                {...register('email')}
              />
            </FormField>
            {step === 'password' && (
              <FormField label="Contraseña" required>
                <PasswordInput placeholder="••••••••" {...register('password')} />
              </FormField>
            )}

            <Button type="submit" fullWidth loading={isSubmitting}>
              {step === 'email' ? 'Continuar' : 'Entrar'}
            </Button>
          </form>

          {canUseGoogle && (
            <>
              <div className="my-4 flex items-center gap-3 text-xs text-zinc-400">
                <span className="h-px flex-1 bg-zinc-200" />o<span className="h-px flex-1 bg-zinc-200" />
              </div>

              <Button variant="secondary" fullWidth loading={googleLoading} onClick={onGoogle}>
                <GoogleIcon /> Continuar con Google
              </Button>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  )
}
