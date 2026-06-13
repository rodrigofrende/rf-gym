import { collection, doc, limit, orderBy, Timestamp } from 'firebase/firestore'
import type { GymSubscription, Payment } from '@/types'
import { env } from '@/config/env'
import { db } from '@/lib/firebase'
import * as demo from '@/demo/store'
import { paymentSchema } from '@/validation/schemas'
import { addMonths } from '@/utils/payments'
import { toDate } from '@/utils/format'
import { createBatch, getMany, removeOne } from './firestore'
import { paths } from './paths'

export interface NewPayment {
  amount: number
  date: Date
  comment?: string
  createdBy: string
}

const ts = (d: Date) => Timestamp.fromDate(d)

const PAYMENTS_LIST_LIMIT = 200
const GYM_PAYMENTS_LIST_LIMIT = 100

function validatePayment(p: NewPayment) {
  const parsed = paymentSchema.safeParse(p)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Pago inválido')
  }
  return parsed.data
}

// ---- Pagos de socios ----
export function listMemberPayments(gymId: string, memberId: string) {
  if (env.demoMode) return demo.listMemberPayments(gymId, memberId)
  return getMany<Payment>(
    paths.payments(gymId, memberId),
    orderBy('date', 'desc'),
    limit(PAYMENTS_LIST_LIMIT),
  )
}

/** Registra un pago del socio: crea el registro y avanza el vencimiento +1 mes (atómico). */
export async function registerMemberPayment(
  gymId: string,
  memberId: string,
  p: NewPayment,
  currentDueDate?: Date,
) {
  if (env.demoMode) return demo.registerMemberPayment(gymId, memberId, p, currentDueDate)
  validatePayment(p)
  const nextDue = addMonths(currentDueDate ?? p.date, 1)
  const batch = createBatch()
  const paymentRef = doc(collection(db, paths.payments(gymId, memberId)))
  batch.set(paymentRef, {
    amount: p.amount,
    date: ts(p.date),
    comment: p.comment ?? '',
    createdBy: p.createdBy,
  })
  batch.update(doc(db, paths.member(gymId, memberId)), {
    lastPaymentDate: ts(p.date),
    paymentDate: ts(nextDue),
  })
  await batch.commit()
}

export function removeMemberPayment(gymId: string, memberId: string, paymentId: string) {
  if (env.demoMode) return demo.removeMemberPayment(gymId, memberId, paymentId)
  return removeOne(paths.payment(gymId, memberId, paymentId))
}

// ---- Pagos de suscripción de gimnasios ----
export function listGymPayments(gymId: string) {
  if (env.demoMode) return demo.listGymPayments(gymId)
  return getMany<Payment>(
    paths.gymPayments(gymId),
    orderBy('date', 'desc'),
    limit(GYM_PAYMENTS_LIST_LIMIT),
  )
}

export async function registerGymPayment(gymId: string, p: NewPayment, sub: GymSubscription) {
  if (env.demoMode) return demo.registerGymPayment(gymId, p, sub)
  validatePayment(p)
  const nextDue = addMonths(toDate(sub.dueDate) ?? p.date, 1)
  const batch = createBatch()
  const paymentRef = doc(collection(db, paths.gymPayments(gymId)))
  batch.set(paymentRef, {
    amount: p.amount,
    date: ts(p.date),
    comment: p.comment ?? '',
    createdBy: p.createdBy,
  })
  batch.update(doc(db, paths.gym(gymId)), {
    subscription: {
      ...sub,
      lastPaymentDate: ts(p.date),
      dueDate: ts(nextDue),
      status: 'active',
    },
  })
  await batch.commit()
}

export function removeGymPayment(gymId: string, paymentId: string) {
  if (env.demoMode) return demo.removeGymPayment(gymId, paymentId)
  return removeOne(paths.gymPayment(gymId, paymentId))
}
