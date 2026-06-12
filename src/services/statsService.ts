import { Timestamp } from 'firebase/firestore'
import type { AdminStats } from '@/types'
import { env } from '@/config/env'
import * as demo from '@/demo/store'
import { getPaymentStatus } from '@/utils/payments'
import { getOne, setOne } from './firestore'
import { paths } from './paths'
import { listMembers } from './membersService'
import { listAssignments } from './routinesService'

export async function getStats(gymId: string) {
  if (env.demoMode) return demo.getStats(gymId)
  return getOne<AdminStats & { id: string }>(paths.statsSummary(gymId))
}

/**
 * Recalcula el doc agregado de stats. Query "larga" → se cachea en Firestore y
 * en React Query; se invoca on-demand (botón actualizar) o tras altas/bajas.
 */
export async function recomputeStats(gymId: string): Promise<AdminStats> {
  if (env.demoMode) return demo.recomputeStats(gymId)
  const [members, assignments] = await Promise.all([listMembers(gymId), listAssignments(gymId)])
  const socios = members.filter((m) => m.role === 'user')

  const stats: AdminStats = {
    memberCount: socios.length,
    monthlyRevenue: socios
      .filter((m) => m.status !== 'paused')
      .reduce((sum, m) => sum + (m.monthlyCost ?? 0), 0),
    routinesSent: assignments.filter((a) => a.active).length,
    overdueCount: socios.filter(
      (m) => m.status !== 'paused' && getPaymentStatus(m.paymentDate).state !== 'al_dia',
    ).length,
    updatedAt: Timestamp.now(),
  }
  await setOne(paths.statsSummary(gymId), stats)
  return stats
}
