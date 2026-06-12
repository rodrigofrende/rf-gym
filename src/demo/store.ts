import type {
  AdminStats,
  Assignment,
  Gym,
  GymSubscription,
  Member,
  Membership,
  Note,
  Payment,
  Routine,
  SubscriptionPlan,
  Tariff,
  WorkoutLog,
} from '@/types'
import { buildSeed, DEMO_GYM_ID } from './seed'
import { isSuperAdminEmail } from '@/config/superAdmins'
import { addMonths, getPaymentStatus } from '@/utils/payments'
import { toDate } from '@/utils/format'
import { buildDashboard } from '@/utils/dashboard'

interface NewPaymentInput {
  amount: number
  date: Date
  comment?: string
  createdBy: string
}

/**
 * Store en memoria para el modo demo. Singleton a nivel módulo: las ediciones
 * persisten durante la sesión y se resetean al recargar la página (re-import).
 */
const data = buildSeed()

// Lista de gyms en memoria. El primero es TigerFit (data.gym, misma referencia),
// para que las ediciones del seed y de acá queden sincronizadas.
type DemoGym = Gym & { adminUids: string[] }
const gyms: DemoGym[] = [data.gym]

// Pagos en memoria: por socio (memberId) y por gym (suscripción).
const memberPayments: Record<string, Payment[]> = { ...data.payments }
const gymPayments: Record<string, Payment[]> = {}

let counter = 0
const nextId = (prefix: string) => `${prefix}-${++counter}-demo`

const ok = <T>(value: T) => Promise.resolve(value)

// ---- Gym (tenant) ----
const findGym = (gymId: string) => gyms.find((g) => g.id === gymId)

export function listGyms() {
  return ok(gyms.map((g) => ({ ...g })) as Gym[])
}
export function getGym(gymId: string) {
  const g = findGym(gymId) ?? gyms[0]
  return ok({ ...g } as Gym)
}
export function createGym(payload: Omit<Gym, 'id'>) {
  const id = nextId('gym')
  gyms.push({ adminUids: [], ...payload, id })
  return ok(id)
}
export function removeGym(gymId: string) {
  const i = gyms.findIndex((g) => g.id === gymId)
  if (i > 0) gyms.splice(i, 1) // nunca borrar TigerFit (índice 0) en demo
  return ok(undefined)
}
export function updateGym(gymId: string, payload: Partial<Gym>) {
  const g = findGym(gymId)
  if (g) Object.assign(g, payload)
  return ok(undefined)
}
export function addGymAdmin(gymId: string, uid: string) {
  const g = findGym(gymId)
  if (g && !g.adminUids.includes(uid)) g.adminUids.push(uid)
  return ok(undefined)
}
export function removeGymAdmin(gymId: string, uid: string) {
  const g = findGym(gymId)
  if (g) g.adminUids = g.adminUids.filter((u) => u !== uid)
  return ok(undefined)
}

// ---- Planes de suscripción (plataforma) ----
export function listPlans() {
  return ok([...data.plans])
}
export function createPlan(payload: Omit<SubscriptionPlan, 'id'>) {
  const id = nextId('plan')
  data.plans.push({ ...payload, id })
  return ok(id)
}
export function updatePlan(planId: string, payload: Partial<SubscriptionPlan>) {
  const p = data.plans.find((x) => x.id === planId)
  if (p) Object.assign(p, payload)
  return ok(undefined)
}
export function removePlan(planId: string) {
  data.plans = data.plans.filter((p) => p.id !== planId)
  return ok(undefined)
}

// ---- Tarifas ----
export function listTariffs(_gymId: string) {
  return ok([...data.tariffs])
}
export function createTariff(_gymId: string, payload: Omit<Tariff, 'id'>) {
  const id = nextId('tf')
  data.tariffs.push({ ...payload, id })
  return ok(id)
}
export function updateTariff(_gymId: string, tariffId: string, payload: Partial<Tariff>) {
  const t = data.tariffs.find((x) => x.id === tariffId)
  if (t) Object.assign(t, payload)
  return ok(undefined)
}
export function removeTariff(_gymId: string, tariffId: string) {
  data.tariffs = data.tariffs.filter((t) => t.id !== tariffId)
  return ok(undefined)
}

// ---- Members ----
export function listMembers(_gymId: string) {
  return ok([...data.members])
}
export function getMember(_gymId: string, memberId: string) {
  return ok(data.members.find((m) => m.id === memberId) ?? null)
}
export function createMember(_gymId: string, payload: Omit<Member, 'id' | 'uid'>) {
  const id = nextId('member')
  data.members.push({ ...payload, id, uid: '' })
  return ok(id)
}
export function updateMember(_gymId: string, memberId: string, payload: Partial<Member>) {
  const m = data.members.find((x) => x.id === memberId)
  if (m) Object.assign(m, payload)
  return ok(undefined)
}
export function updateMemberProfile(
  gymId: string,
  memberId: string,
  payload: Partial<Member>,
) {
  return updateMember(gymId, memberId, payload)
}
export function removeMember(_gymId: string, memberId: string) {
  data.members = data.members.filter((m) => m.id !== memberId)
  return ok(undefined)
}

// ---- Routines ----
export function listRoutines(_gymId: string) {
  return ok([...data.routines])
}
export function getRoutine(_gymId: string, routineId: string) {
  return ok(data.routines.find((r) => r.id === routineId) ?? null)
}
export function createRoutine(_gymId: string, payload: Omit<Routine, 'id'>) {
  const id = nextId('routine')
  data.routines.push({ ...payload, id })
  return ok(id)
}
export function updateRoutine(_gymId: string, routineId: string, payload: Partial<Routine>) {
  const r = data.routines.find((x) => x.id === routineId)
  if (r) Object.assign(r, payload)
  return ok(undefined)
}
export function removeRoutine(_gymId: string, routineId: string) {
  data.routines = data.routines.filter((r) => r.id !== routineId)
  return ok(undefined)
}

// ---- Assignments ----
export function listAssignments(_gymId: string) {
  return ok([...data.assignments])
}
export function listMemberAssignments(_gymId: string, memberUid: string) {
  return ok(data.assignments.filter((a) => a.memberUid === memberUid && a.active))
}
export function assignRoutine(_gymId: string, payload: Omit<Assignment, 'id'>) {
  const id = nextId('asg')
  data.assignments.push({ ...payload, id })
  return ok(id)
}
export function removeAssignment(_gymId: string, id: string) {
  data.assignments = data.assignments.filter((a) => a.id !== id)
  return ok(undefined)
}

// ---- Notes (solo admin) ----
export function listNotes(_gymId: string, memberId: string) {
  const list = data.notes[memberId] ?? []
  return ok([...list].sort((a, b) => +new Date(b.date as Date) - +new Date(a.date as Date)))
}
export function createNote(_gymId: string, memberId: string, payload: Omit<Note, 'id'>) {
  const id = nextId('note')
  data.notes[memberId] = [...(data.notes[memberId] ?? []), { ...payload, id }]
  return ok(id)
}
export function removeNote(_gymId: string, memberId: string, noteId: string) {
  data.notes[memberId] = (data.notes[memberId] ?? []).filter((n) => n.id !== noteId)
  return ok(undefined)
}

// ---- Logs ----
export function listLogs(_gymId: string, memberId: string) {
  const list = data.logs[memberId] ?? []
  return ok([...list].sort((a, b) => +new Date(b.date as Date) - +new Date(a.date as Date)))
}
export function listExerciseLogs(gymId: string, memberId: string, exerciseName: string) {
  return listLogs(gymId, memberId).then((l) => l.filter((x) => x.exerciseName === exerciseName))
}
export function createLog(_gymId: string, memberId: string, payload: Omit<WorkoutLog, 'id'>) {
  const id = nextId('log')
  data.logs[memberId] = [...(data.logs[memberId] ?? []), { ...payload, id }]
  return ok(id)
}

// ---- Pagos ----
const byDateDesc = <T extends { date: unknown }>(list: T[]) =>
  [...list].sort((a, b) => +new Date(b.date as Date) - +new Date(a.date as Date))

export function listMemberPayments(_gymId: string, memberId: string) {
  return ok(byDateDesc(memberPayments[memberId] ?? []))
}
export function registerMemberPayment(
  _gymId: string,
  memberId: string,
  p: NewPaymentInput,
  currentDueDate?: Date,
) {
  const id = nextId('pay')
  const payment: Payment = {
    id,
    amount: p.amount,
    date: p.date,
    comment: p.comment,
    createdBy: p.createdBy,
  }
  memberPayments[memberId] = [...(memberPayments[memberId] ?? []), payment]
  const m = data.members.find((x) => x.id === memberId)
  if (m) {
    m.lastPaymentDate = p.date
    m.paymentDate = addMonths(currentDueDate ?? p.date, 1)
  }
  return ok(id)
}
export function removeMemberPayment(_gymId: string, memberId: string, paymentId: string) {
  memberPayments[memberId] = (memberPayments[memberId] ?? []).filter((p) => p.id !== paymentId)
  return ok(undefined)
}

export function listGymPayments(gymId: string) {
  return ok(byDateDesc(gymPayments[gymId] ?? []))
}
export function registerGymPayment(gymId: string, p: NewPaymentInput, sub: GymSubscription) {
  const id = nextId('gpay')
  const payment: Payment = {
    id,
    amount: p.amount,
    date: p.date,
    comment: p.comment,
    createdBy: p.createdBy,
  }
  gymPayments[gymId] = [...(gymPayments[gymId] ?? []), payment]
  const g = findGym(gymId)
  if (g) {
    g.subscription = {
      ...sub,
      lastPaymentDate: p.date,
      dueDate: addMonths(toDate(sub.dueDate) ?? p.date, 1),
      status: 'active',
    }
  }
  return ok(id)
}
export function removeGymPayment(gymId: string, paymentId: string) {
  gymPayments[gymId] = (gymPayments[gymId] ?? []).filter((p) => p.id !== paymentId)
  return ok(undefined)
}

// ---- Stats ----
function compute(): AdminStats {
  const socios = data.members.filter((m) => m.role === 'user')
  return {
    memberCount: socios.length,
    monthlyRevenue: socios
      .filter((m) => m.status !== 'paused')
      .reduce((sum, m) => sum + (m.monthlyCost ?? 0), 0),
    routinesSent: data.assignments.filter((a) => a.active).length,
    // Vencidos derivados de fechas (excluye pausados).
    overdueCount: socios.filter(
      (m) => m.status !== 'paused' && getPaymentStatus(m.paymentDate).state !== 'al_dia',
    ).length,
    updatedAt: data.stats.updatedAt,
  }
}
export function getStats(_gymId: string) {
  return ok({ id: 'summary', ...data.stats })
}

export function getDashboard(_gymId: string) {
  return ok(
    buildDashboard({
      members: data.members,
      payments: Object.values(memberPayments).flat(),
      logs: Object.values(data.logs).flat(),
      activeAssignments: data.assignments.filter((a) => a.active).length,
    }),
  )
}

export function getPlatformStats() {
  return ok({
    socios: data.members.filter((m) => m.role === 'user').length,
    routines: data.routines.length,
    logs: Object.values(data.logs).reduce((sum, arr) => sum + arr.length, 0),
  })
}
export function recomputeStats(_gymId: string) {
  data.stats = { ...compute(), updatedAt: new Date() }
  return ok(data.stats)
}

// ---- Memberships ----
export function listMembershipsForUser(uid: string, email?: string | null) {
  // Super-admin: admin en TODOS los gyms.
  if (isSuperAdminEmail(email)) {
    return ok(
      gyms.map(
        (g) =>
          ({
            gymId: g.id,
            memberId: uid,
            gymName: g.name,
            gymLogoURL: g.logoURL,
            gymTheme: g.theme,
            role: 'admin',
          }) satisfies Membership,
      ),
    )
  }
  const member = data.members.find((m) => m.uid === uid)
  if (!member) return ok([] as Membership[])
  return ok([
    {
      gymId: DEMO_GYM_ID,
      memberId: member.id,
      gymName: data.gym.name,
      gymLogoURL: data.gym.logoURL,
      gymTheme: data.gym.theme,
      role: member.role,
    },
  ] satisfies Membership[])
}
