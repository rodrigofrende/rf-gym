/** Constructores de paths de Firestore — una sola fuente de verdad. */
export const paths = {
  users: () => 'users',
  user: (uid: string) => `users/${uid}`,

  gyms: () => 'gyms',
  gym: (gymId: string) => `gyms/${gymId}`,

  members: (gymId: string) => `gyms/${gymId}/members`,
  member: (gymId: string, uid: string) => `gyms/${gymId}/members/${uid}`,

  notes: (gymId: string, uid: string) => `gyms/${gymId}/members/${uid}/notes`,
  note: (gymId: string, uid: string, noteId: string) =>
    `gyms/${gymId}/members/${uid}/notes/${noteId}`,

  logs: (gymId: string, uid: string) => `gyms/${gymId}/members/${uid}/logs`,
  log: (gymId: string, uid: string, logId: string) =>
    `gyms/${gymId}/members/${uid}/logs/${logId}`,

  routines: (gymId: string) => `gyms/${gymId}/routines`,
  routine: (gymId: string, routineId: string) => `gyms/${gymId}/routines/${routineId}`,

  assignments: (gymId: string) => `gyms/${gymId}/assignments`,
  assignment: (gymId: string, id: string) => `gyms/${gymId}/assignments/${id}`,

  statsSummary: (gymId: string) => `gyms/${gymId}/stats/summary`,
}
