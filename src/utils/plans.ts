import type { SubscriptionPlan, WhiteLabelLevel } from '@/types'

/** "Ilimitado" si el límite es 0, sino el número. */
export function limitLabel(n: number): string {
  return n > 0 ? String(n) : 'Ilimitado'
}

const WHITE_LABEL_LABELS: Record<WhiteLabelLevel, string> = {
  none: 'Sin white-label',
  basic: 'White-label (logo + colores)',
  full: 'White-label completo',
}

export function whiteLabelLabel(level: WhiteLabelLevel): string {
  return WHITE_LABEL_LABELS[level]
}

export interface GymUsage {
  members: number
  admins: number
  routines: number
  exercises: number
}

/** ¿El uso supera algún límite del plan? (0 = ilimitado, nunca excede). */
export function exceedsLimit(usage: GymUsage, plan: SubscriptionPlan | undefined): boolean {
  if (!plan) return false
  const over = (used: number, max: number) => max > 0 && used > max
  return (
    over(usage.members, plan.maxMembers) ||
    over(usage.admins, plan.maxAdmins) ||
    over(usage.routines, plan.maxRoutines) ||
    over(usage.exercises, plan.maxExercises)
  )
}

export function canCreateExercise(
  plan: SubscriptionPlan | undefined,
  currentCount: number,
): { allowed: boolean; reason?: string } {
  if (!plan || plan.maxExercises === 0 || currentCount < plan.maxExercises) return { allowed: true }
  return {
    allowed: false,
    reason: `Alcanzaste el límite de ejercicios de tu plan (${plan.maxExercises}).`,
  }
}

/** "12/40" o "12/∞" si el límite es ilimitado. */
export function usageLabel(used: number, max: number): string {
  return `${used}/${max > 0 ? max : '∞'}`
}

/** Texto de la capacidad de registros de carga del plan. */
export function logsCapabilityLabel(plan: SubscriptionPlan): string {
  if (!plan.logsEnabled) return 'Sin registro de cargas'
  return plan.maxLogsPerMember > 0
    ? `${plan.maxLogsPerMember} registros/alumno`
    : 'Registros ilimitados'
}

/**
 * ¿Puede el alumno registrar una carga según el plan del gym?
 * Sin plan → permitido. `logsEnabled=false` → bloqueado. Tope alcanzado → bloqueado.
 */
export function canMemberLog(
  plan: SubscriptionPlan | undefined,
  currentCount: number,
): { allowed: boolean; reason?: string } {
  if (!plan) return { allowed: true }
  if (!plan.logsEnabled) {
    return { allowed: false, reason: 'Tu plan no incluye el registro de cargas.' }
  }
  if (plan.maxLogsPerMember > 0 && currentCount >= plan.maxLogsPerMember) {
    return {
      allowed: false,
      reason: `Alcanzaste el límite de registros de tu plan (${plan.maxLogsPerMember}).`,
    }
  }
  return { allowed: true }
}
