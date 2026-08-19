import { deleteDoc, doc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { env } from '@/config/env'
import type { Gym, Member, MemberAuthStatus, MemberLoginIndex } from '@/types'
import {
  emailTypoCandidates,
  isPublicEmailProvider,
  loginEmailKeys,
  normalizeEmailKey,
} from '@/utils/loginEmail'
import { extractFirestoreCode } from '@/utils/firestoreErrors'
import { reportOperational } from '@/utils/errorReporting'
import * as demo from '@/demo/store'
import { getOne, getOneFromServer, updateOne } from './firestore'
import { getGym } from './gymsService'
import { paths } from './paths'

export function getMemberLogin(email: string): Promise<MemberLoginIndex | null> {
  if (env.demoMode) return demo.getMemberLogin(email)
  // getOneFromServer y NO getOne: acá `null` decide si el socio "no está dado de
  // alta", así que no puede venir de la caché. Sin red esto TIRA en vez de dar un
  // falso negativo — ver el comentario en firestore.ts.
  return getOneFromServer<MemberLoginIndex>(paths.memberLoginIndex(normalizeEmailKey(email)))
}

export const LOGIN_INDEX_MISSING_MESSAGE =
  'Este email no está dado de alta. Pedile a tu gimnasio que te agregue, o usá el email de acceso que te dieron.'

export const PERSONAL_EMAIL_MESSAGE =
  'Ese parece tu email personal. Tu acceso al gimnasio es un usuario tipo nombre@tugimnasio.com: pedíselo a tu gimnasio si no lo tenés.'

// Redactado para servir con y sin botón de sugerencia en pantalla (LoginPage lo
// muestra; SetPasswordPage, al que se llega por deep-link, no).
export const EMAIL_TYPO_MESSAGE =
  'Ese email no está dado de alta. Revisá el dominio: parece que tiene un error de tipeo.'

/** Por qué un email no resolvió a ningún socio. */
export type LoginMissReason = 'typo-corregible' | 'proveedor-publico' | 'no-existe'

export interface LoginMiss {
  reason: LoginMissReason
  /** Email corregido que SÍ existe en el índice. Sólo en 'typo-corregible'. */
  suggestion?: string
}

/**
 * Diagnostica un miss del índice de login, para elegir qué se le dice al socio y
 * para clasificar el aviso al dueño.
 *
 * El caso 'typo-corregible' se confirma contra el índice: la sugerencia sólo
 * existe si el email corregido está dado de alta de verdad, así que nunca se le
 * ofrece al socio un email inventado. No filtra nada nuevo — confirmar que ese
 * doc existe ya es posible con el `get` público del índice.
 */
export async function diagnoseLoginMiss(email: string): Promise<LoginMiss> {
  for (const candidate of emailTypoCandidates(email)) {
    try {
      if (await getMemberLogin(candidate)) return { reason: 'typo-corregible', suggestion: candidate }
    } catch {
      // Sin red no se puede confirmar ninguna sugerencia: cortamos y seguimos
      // con el diagnóstico estático, que no necesita leer nada.
      break
    }
  }
  if (isPublicEmailProvider(email)) return { reason: 'proveedor-publico' }
  return { reason: 'no-existe' }
}

/** Mensaje para el socio según el diagnóstico. */
export function loginMissMessage(miss: LoginMiss): string {
  if (miss.reason === 'typo-corregible') return EMAIL_TYPO_MESSAGE
  if (miss.reason === 'proveedor-publico') return PERSONAL_EMAIL_MESSAGE
  return LOGIN_INDEX_MISSING_MESSAGE
}

export async function syncMemberLoginIndex(
  gymId: string,
  memberId: string,
  member: Omit<Member, 'id'> | Member,
  gym?: Pick<Gym, 'name'> | null,
) {
  if (env.demoMode) return demo.syncMemberLoginIndex(gymId, memberId, member)
  const gymData = gym ?? (await getGym(gymId))
  const emails = loginEmailKeys(member)
  // OVERWRITE (sin merge): el índice de login es world-readable y las rules lo
  // validan con hasOnly([4 claves]). Un merge conservaría claves legacy de docs
  // viejos y rompería esa validación → "permiso denegado". Sobrescribir garantiza
  // que el doc quede exactamente con las 4 claves permitidas. NO se guarda
  // authStatus (no filtrar qué socios están sin reclamar).
  //
  // `email` del payload DEBE coincidir con la clave del doc (rules: emailKey ==
  // email.lower()). Por eso indexamos la versión ya normalizada, y si el socio
  // tiene email de contacto distinto al de acceso, publicamos ambas claves.
  await Promise.all(
    emails.map((email) =>
      setDoc(doc(db, paths.memberLoginIndex(email)), {
        email,
        gymId,
        gymName: gymData?.name ?? 'Gimnasio',
        memberId,
      } satisfies Omit<MemberLoginIndex, 'id'>),
    ),
  )
}

export async function removeMemberLoginIndex(email: string) {
  if (env.demoMode) return demo.removeMemberLoginIndex(email)
  await deleteDoc(doc(db, paths.memberLoginIndex(normalizeEmailKey(email))))
}

export async function removeMemberLoginIndexes(member: { email?: string; loginEmail?: string }) {
  await Promise.all(loginEmailKeys(member).map(removeMemberLoginIndex))
}

/** Re-publica el índice de login de todos los socios del gym (backfill). */
export async function ensureGymLoginIndexes(gymId: string, members: Member[]) {
  if (env.demoMode || members.length === 0) return
  const gym = await getGym(gymId)
  const chunkSize = 10
  let failed = 0
  let firstCode = ''
  for (let i = 0; i < members.length; i += chunkSize) {
    const chunk = members.slice(i, i + chunkSize)
    // allSettled y NO all: con `all`, un solo rechazo tiraba la función entera y
    // se salteaban TODOS los chunks siguientes, dejando socios sin indexar — y
    // sin ninguna señal, porque el caller se come el error. Hay un fallo
    // permanente esperable: las rules prohíben re-apuntar un índice existente a
    // otro gym, así que el mismo email real en dos gyms queda denegado siempre.
    const results = await Promise.allSettled(
      chunk.map((member) => syncMemberLoginIndex(gymId, member.id, member, gym)),
    )
    for (const result of results) {
      if (result.status !== 'rejected') continue
      failed++
      if (!firstCode) firstCode = extractFirestoreCode(result.reason) ?? 'unknown'
    }
  }
  if (failed > 0) {
    reportOperational(
      'login-index-backfill',
      'Quedaron socios sin índice de login',
      `${failed}/${members.length} fallaron · ${firstCode}`,
      { gym: gymId },
    )
  }
}

export async function updateMemberAuthStatus(
  gymId: string,
  memberId: string,
  authStatus: MemberAuthStatus,
  extra: Partial<Pick<Member, 'passwordUpdatedAt' | 'passwordResetRequestedAt'>> = {},
  // Datos ya leídos por el caller (ej. el claim del login): evita el getOne del
  // member y el getGym del índice — 2 round-trips menos en el primer acceso.
  preloaded: { member?: Member; gymName?: string } = {},
) {
  if (env.demoMode) return demo.updateMemberAuthStatus(gymId, memberId, authStatus, extra)
  const member = preloaded.member ?? (await getOne<Member>(paths.member(gymId, memberId)))
  if (!member) throw new Error('member-not-found')
  await updateOne(paths.member(gymId, memberId), { authStatus, ...extra })
  await syncMemberLoginIndex(
    gymId,
    memberId,
    { ...member, authStatus, ...extra },
    preloaded.gymName ? { name: preloaded.gymName } : undefined,
  )
}
