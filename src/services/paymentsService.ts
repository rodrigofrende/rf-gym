import { orderBy, Timestamp } from 'firebase/firestore'
import type { GymSubscription, Payment } from '@/types'
import { env } from '@/config/env'
import * as demo from '@/demo/store'
import { addMonths } from '@/utils/payments'
import { toDate } from '@/utils/format'
import { addToCollection, getMany, removeOne, updateOne } from './firestore'
import { paths } from './paths'

export interface NewPayment {
  amount: number
  date: Date
  comment?: string
  createdBy: string
}

const ts = (d: Date) => Timestamp.fromDate(d)

// ---- Pagos de socios ----
export function listMemberPayments(gymId: string, memberId: string) {
  if (env.demoMode) return demo.listMemberPayments(gymId, memberId)
  return getMany<Payment>(paths.payments(gymId, memberId), orderBy('date', 'desc'))
}

/** Registra un pago del socio: crea el registro, setea último pago y avanza el vencimiento +1 mes. */
export async function registerMemberPayment(
  gymId: string,
  memberId: string,
  p: NewPayment,
  currentDueDate?: Date,
) {
  if (env.demoMode) return demo.registerMemberPayment(gymId, memberId, p, currentDueDate)
  const nextDue = addMonths(currentDueDate ?? p.date, 1)
  await addToCollection(paths.payments(gymId, memberId), {
    amount: p.amount,
    date: ts(p.date),
    comment: p.comment ?? '',
    createdBy: p.createdBy,
  })
  await updateOne(paths.member(gymId, memberId), {
    lastPaymentDate: ts(p.date),
    paymentDate: ts(nextDue),
  })
}

export function removeMemberPayment(gymId: string, memberId: string, paymentId: string) {
  if (env.demoMode) return demo.removeMemberPayment(gymId, memberId, paymentId)
  return removeOne(paths.payment(gymId, memberId, paymentId))
}

// ---- Pagos de suscripción de gimnasios ----
export function listGymPayments(gymId: string) {
  if (env.demoMode) return demo.listGymPayments(gymId)
  return getMany<Payment>(paths.gymPayments(gymId), orderBy('date', 'desc'))
}

export async function registerGymPayment(gymId: string, p: NewPayment, sub: GymSubscription) {
  if (env.demoMode) return demo.registerGymPayment(gymId, p, sub)
  const nextDue = addMonths(toDate(sub.dueDate) ?? p.date, 1)
  await addToCollection(paths.gymPayments(gymId), {
    amount: p.amount,
    date: ts(p.date),
    comment: p.comment ?? '',
    createdBy: p.createdBy,
  })
  await updateOne(paths.gym(gymId), {
    subscription: {
      ...sub,
      lastPaymentDate: ts(p.date),
      dueDate: ts(nextDue),
      status: 'active',
    },
  })
}

export function removeGymPayment(gymId: string, paymentId: string) {
  if (env.demoMode) return demo.removeGymPayment(gymId, paymentId)
  return removeOne(paths.gymPayment(gymId, paymentId))
}
