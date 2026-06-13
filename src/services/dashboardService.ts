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

const DASHBOARD_MEMBER_BATCH = 15
const PLATFORM_MEMBER_BATCH = 10

async function mapInBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = []
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize)
    out.push(...(await Promise.all(chunk.map(fn))))
  }
  return out
}

/** KPIs + series del panel del admin. Consultas paginadas por lotes para evitar N+1 simultáneo. */
export async function getDashboard(gymId: string): Promise<GymDashboard> {
  if (env.demoMode) return demo.getDashboard(gymId)

  const members = await listMembers(gymId)
  const socios = members.filter((m) => m.role === 'user')
  const [paymentsArr, logsArr, assignments] = await Promise.all([
    mapInBatches(socios, DASHBOARD_MEMBER_BATCH, (m) => listMemberPayments(gymId, m.id)),
    mapInBatches(socios, DASHBOARD_MEMBER_BATCH, (m) => listLogs(gymId, m.id)),
    listAssignments(gymId),
  ])

  return buildDashboard({
    members,
    payments: paymentsArr.flat(),
    logs: logsArr.flat(),
    activeAssignments: assignments.filter((a) => a.active).length,
  })
}

/** Totales de toda la plataforma (super-admin). Agrega por gym en lotes. */
export async function getPlatformStats(): Promise<PlatformStats> {
  if (env.demoMode) return demo.getPlatformStats()

  const gyms = await listGyms()
  const per = await Promise.all(
    gyms.map(async (g) => {
      const [members, routines] = await Promise.all([listMembers(g.id), listRoutines(g.id)])
      const socios = members.filter((m) => m.role === 'user')
      const logsArr = await mapInBatches(socios, PLATFORM_MEMBER_BATCH, (m) => listLogs(g.id, m.id))
      return {
        socios: socios.length,
        routines: routines.length,
        logs: logsArr.flat().length,
      }
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
