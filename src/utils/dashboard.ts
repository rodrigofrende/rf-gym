import type { GymDashboard, Member, Payment, WorkoutLog } from '@/types'
import { toDate } from './format'
import { lastNMonths, lastNWeeks, monthKey, weekKey } from './dates'
import { amountOwed, getPaymentStatus } from './payments'

export interface DashboardInput {
  members: Member[]
  payments: Payment[] // todos los pagos de socios del gym (flatten)
  logs: WorkoutLog[] // todos los logs de socios del gym (flatten)
  activeAssignments: number
}

/** Construye los KPIs + series del panel a partir de la data cruda. Función pura. */
export function buildDashboard({
  members,
  payments,
  logs,
  activeAssignments,
}: DashboardInput): GymDashboard {
  const socios = members.filter((m) => m.role === 'user')
  const now = new Date()
  const thisMonth = monthKey(now)

  let alDia = 0
  let vencido = 0
  let bloqueado = 0
  let pausado = 0
  let deudaTotal = 0
  for (const m of socios) {
    if (m.status === 'paused') {
      pausado++
      continue
    }
    const st = getPaymentStatus(m.paymentDate, m.lastPaymentDate)
    if (st.state === 'al_dia') {
      alDia++
    } else {
      if (st.state === 'blocked') bloqueado++
      else vencido++
      deudaTotal += amountOwed(m.monthlyCost, st.monthsOwed)
    }
  }

  const cobradoEsteMes = payments
    .filter((p) => {
      const d = toDate(p.date)
      return d ? monthKey(d) === thisMonth : false
    })
    .reduce((sum, p) => sum + p.amount, 0)

  const months = lastNMonths(6, now)
  const revByKey = new Map(months.map((m) => [m.key, 0]))
  const altasByKey = new Map(months.map((m) => [m.key, 0]))
  for (const p of payments) {
    const d = toDate(p.date)
    if (d && revByKey.has(monthKey(d))) revByKey.set(monthKey(d), (revByKey.get(monthKey(d)) ?? 0) + p.amount)
  }
  for (const m of socios) {
    const d = toDate(m.startDate)
    if (d && altasByKey.has(monthKey(d))) altasByKey.set(monthKey(d), (altasByKey.get(monthKey(d)) ?? 0) + 1)
  }

  const weeks = lastNWeeks(8, now)
  const actByKey = new Map(weeks.map((w) => [w.key, 0]))
  for (const log of logs) {
    const d = toDate(log.date)
    if (d && actByKey.has(weekKey(d))) actByKey.set(weekKey(d), (actByKey.get(weekKey(d)) ?? 0) + 1)
  }

  return {
    sociosActivos: socios.filter((m) => m.status !== 'paused').length,
    sociosTotal: socios.length,
    cobradoEsteMes,
    deudaTotal,
    vencidosCount: vencido + bloqueado,
    rutinasActivas: activeAssignments,
    logsTotal: logs.length,
    revenueByMonth: months.map((m) => ({ label: m.label, value: revByKey.get(m.key) ?? 0 })),
    altasByMonth: months.map((m) => ({ label: m.label, value: altasByKey.get(m.key) ?? 0 })),
    activityByWeek: weeks.map((w) => ({ label: w.label, value: actByKey.get(w.key) ?? 0 })),
    statusBreakdown: [
      { key: 'al_dia', label: 'Al día', value: alDia },
      { key: 'overdue', label: 'Vencido', value: vencido },
      { key: 'blocked', label: 'Bloqueado', value: bloqueado },
      { key: 'paused', label: 'Pausado', value: pausado },
    ],
  }
}
