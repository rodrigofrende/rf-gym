/** Constructores de paths de Firestore — una sola fuente de verdad. */
export const paths = {
  users: () => 'users',
  user: (uid: string) => `users/${uid}`,
  userGymMembership: (uid: string, gymId: string) => `users/${uid}/gymMemberships/${gymId}`,

  gyms: () => 'gyms',
  gym: (gymId: string) => `gyms/${gymId}`,

  // Planes de suscripción de la plataforma (top-level).
  plans: () => 'plans',
  plan: (planId: string) => `plans/${planId}`,

  members: (gymId: string) => `gyms/${gymId}/members`,
  member: (gymId: string, uid: string) => `gyms/${gymId}/members/${uid}`,

  notes: (gymId: string, uid: string) => `gyms/${gymId}/members/${uid}/notes`,
  note: (gymId: string, uid: string, noteId: string) =>
    `gyms/${gymId}/members/${uid}/notes/${noteId}`,

  logs: (gymId: string, uid: string) => `gyms/${gymId}/members/${uid}/logs`,
  log: (gymId: string, uid: string, logId: string) =>
    `gyms/${gymId}/members/${uid}/logs/${logId}`,

  payments: (gymId: string, memberId: string) => `gyms/${gymId}/members/${memberId}/payments`,
  payment: (gymId: string, memberId: string, paymentId: string) =>
    `gyms/${gymId}/members/${memberId}/payments/${paymentId}`,

  gymPayments: (gymId: string) => `gyms/${gymId}/payments`,
  gymPayment: (gymId: string, paymentId: string) => `gyms/${gymId}/payments/${paymentId}`,

  routines: (gymId: string) => `gyms/${gymId}/routines`,
  routine: (gymId: string, routineId: string) => `gyms/${gymId}/routines/${routineId}`,

  exercises: (gymId: string) => `gyms/${gymId}/exercises`,
  exercise: (gymId: string, exerciseId: string) => `gyms/${gymId}/exercises/${exerciseId}`,

  tariffs: (gymId: string) => `gyms/${gymId}/tariffs`,
  tariff: (gymId: string, tariffId: string) => `gyms/${gymId}/tariffs/${tariffId}`,

  assignments: (gymId: string) => `gyms/${gymId}/assignments`,
  assignment: (gymId: string, id: string) => `gyms/${gymId}/assignments/${id}`,

  statsSummary: (gymId: string) => `gyms/${gymId}/stats/summary`,
}
