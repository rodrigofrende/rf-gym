/** Factory de query keys de TanStack Query — evita strings sueltos y typos. */
export const queryKeys = {
  memberships: (uid: string) => ['memberships', uid] as const,
  gyms: () => ['gyms'] as const,
  gym: (gymId: string) => ['gym', gymId] as const,
  members: (gymId: string) => ['members', gymId] as const,
  member: (gymId: string, uid: string) => ['member', gymId, uid] as const,
  notes: (gymId: string, uid: string) => ['notes', gymId, uid] as const,
  logs: (gymId: string, uid: string) => ['logs', gymId, uid] as const,
  payments: (gymId: string, memberId: string) => ['payments', gymId, memberId] as const,
  gymPayments: (gymId: string) => ['gymPayments', gymId] as const,
  routines: (gymId: string) => ['routines', gymId] as const,
  memberAssignments: (gymId: string, uid: string) => ['assignments', gymId, uid] as const,
  assignments: (gymId: string) => ['assignments', gymId] as const,
  stats: (gymId: string) => ['stats', gymId] as const,
}
