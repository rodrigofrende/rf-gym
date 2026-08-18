import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Timestamp } from 'firebase/firestore'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Crown, ShieldCheck, User } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Member } from '@/types'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/providers/ToastProvider'
import { env } from '@/config/env'
import { queryKeys } from '@/hooks/queryKeys'
import { getMemberLogin, updateMemberAuthStatus } from '@/services/memberLoginService'
import { getOne } from '@/services/firestore'
import { paths } from '@/services/paths'
import type { ClaimedMembership } from '@/services/membershipsService'
import { claimMembership, claimPendingMemberships } from '@/services/membershipsService'
import { extractAuthCode, mapAuthError } from '@/utils/authErrors'
import { extractFirestoreCode, mapFirestoreError } from '@/utils/firestoreErrors'
import { BrandLockup, Button, Card, FormField, Input, PasswordInput, Text } from '@/components/ui'
import { ROUTES } from '@/routes/routePaths'
import { persistActiveGymId } from '@/providers/TenantProvider'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().optional(),
})
type FormValues = z.infer<typeof schema>
type LoginStep = 'email' | 'password'

export function LoginPage() {
  const { user, loginEmail, loginGoogle, setDemoIdentity, sendPasswordReset } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const [step, setStep] = useState<LoginStep>('email')
  const [resolvedEmail, setResolvedEmail] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [forgotSending, setForgotSending] = useState(false)
  const canUseGoogle = env.googleLoginEnabled
  const redirect = new URLSearchParams(location.search).get('redirect')
  // Solo rutas internas: rechazar también '//' y '/\' (URLs protocolo-relativas)
  // para no habilitar un open-redirect si algún día se usara window.location.
  const safeRedirect =
    redirect && redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.startsWith('/\\')
      ? redirect
      : '/'

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
        // El índice de login ya NO expone authStatus (para no filtrar qué socios
        // están sin reclamar), así que no auto-ruteamos el primer acceso: el socio
        // pasa al paso contraseña, donde hay un enlace "¿Primera vez?".
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
      const loggedUser = await loginEmail(resolvedEmail || email, values.password)
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
          // El claim ya trae el member leído; solo re-leemos si faltara.
          const member =
            membership.member ??
            (await getOne<Member>(paths.member(membership.gymId, membership.memberId)))
          if (!member || member.authStatus === 'active' || member.authStatus === 'password_change_required') return
          await updateMemberAuthStatus(
            membership.gymId,
            membership.memberId,
            'active',
            { passwordUpdatedAt: Timestamp.now() },
            { member, gymName: login?.gymId === membership.gymId ? login.gymName : undefined },
          )
        }),
      )

      void queryClient.invalidateQueries({ queryKey: queryKeys.memberships(loggedUser.uid) })
      if (claimed.size === 1) {
        persistActiveGymId([...claimed.values()][0].gymId)
      }
      let shouldForcePasswordChange = false
      if (login?.gymId && login?.memberId) {
        const member =
          claimed.get(`${login.gymId}:${login.memberId}`)?.member ??
          (await getOne<Member>(paths.member(login.gymId, login.memberId)))
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

  // Olvidó la contraseña (ya tiene cuenta): dispara el email de restablecimiento.
  // Honesto con el caso "alias del gym": si el email no es real, no le llega y
  // tiene que pedirle el reseteo a su gimnasio.
  const handleForgot = async () => {
    if (!resolvedEmail || forgotSending) return
    setForgotSending(true)
    try {
      await sendPasswordReset(resolvedEmail)
      notify(
        'Si tu email es válido, te enviamos un link para restablecerla (revisá spam). Si tu acceso es un usuario del gimnasio, pedile a tu gym que te lo resetee.',
        'success',
      )
    } catch (err) {
      notify(mapAuthError(err, 'No pudimos enviar el email de restablecimiento'), 'error')
    } finally {
      setForgotSending(false)
    }
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
          <Link to="/" aria-label="Ir a la web de RF FIT" className="transition-opacity hover:opacity-80">
            <BrandLockup variant="onLight" size="lg" />
          </Link>
          <Text variant="caption" className="mt-6">
            Ingresá con tu email de acceso
          </Text>
        </div>

        <Card className="p-5">
          {step === 'password' && (
            <button
              type="button"
              className="mb-3 inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm text-zinc-500 hover:text-zinc-800"
              onClick={resetStep}
              aria-label="Volver al email"
            >
              <ArrowLeft className="size-4" />
              Cambiar email
            </button>
          )}

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

            {step === 'password' && (
              <div className="space-y-1.5 pt-1 text-center">
                <button
                  type="button"
                  onClick={() =>
                    navigate(`${ROUTES.SET_PASSWORD}?email=${encodeURIComponent(resolvedEmail)}&mode=create`)
                  }
                  className="block w-full text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  ¿Primera vez? Creá tu contraseña
                </button>
                <button
                  type="button"
                  onClick={handleForgot}
                  disabled={forgotSending}
                  className="block w-full text-sm text-zinc-500 hover:text-zinc-800 disabled:opacity-60"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}
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

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-800"
          >
            <ArrowLeft className="size-4" />
            Conocé RF FIT
          </Link>
        </div>
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
