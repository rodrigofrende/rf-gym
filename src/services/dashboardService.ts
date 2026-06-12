import type { GymDashboard } from '@/types'
import { env } from '@/config/env'
import * as demo from '@/demo/store'
import { buildDashboard } from '@/utils/dashboard'
import { listMembers } from './membersService'
import { listMemberPayments } from './paymentsService'
import { listLogs } from './logsService'
import { listAssignments, listRoutines } from './routinesService'
import { listGyms } from './gymsService'

export interface PlatformStats {
  socios: number
  routines: number
  logs: number
}

/** KPIs + series del panel del admin. Demo agrega en memoria; real consulta on-demand. */
export async function getDashboard(gymId: string): Promise<GymDashboard> {
  if (env.demoMode) return demo.getDashboard(gymId)

  const members = await listMembers(gymId)
  const socios = members.filter((m) => m.role === 'user')
  const [paymentsArr, logsArr, assignments] = await Promise.all([
    Promise.all(socios.map((m) => listMemberPayments(gymId, m.id))),
    Promise.all(socios.map((m) => listLogs(gymId, m.id))),
    listAssignments(gymId),
  ])

  return buildDashboard({
    members,
    payments: paymentsArr.flat(),
    logs: logsArr.flat(),
    activeAssignments: assignments.filter((a) => a.active).length,
  })
}

/** Totales de toda la plataforma (super-admin). Demo: en memoria; real: agrega por gym. */
export async function getPlatformStats(): Promise<PlatformStats> {
  if (env.demoMode) return demo.getPlatformStats()

  const gyms = await listGyms()
  const per = await Promise.all(
    gyms.map(async (g) => {
      const [members, routines] = await Promise.all([listMembers(g.id), listRoutines(g.id)])
      const socios = members.filter((m) => m.role === 'user')
      const logsArr = await Promise.all(socios.map((m) => listLogs(g.id, m.id)))
      return { socios: socios.length, routines: routines.length, logs: logsArr.flat().length }
    }),
  )
  return per.reduce(
    (acc, x) => ({
      socios: acc.socios + x.socios,
      routines: acc.routines + x.routines,
      logs: acc.logs + x.logs,
    }),
    { socios: 0, routines: 0, logs: 0 },
  )
}
