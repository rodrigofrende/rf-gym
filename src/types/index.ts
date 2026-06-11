import type { Timestamp } from 'firebase/firestore'

export type Role = 'admin' | 'user'

export type MemberStatus = 'active' | 'paused' | 'overdue'

export type DateValue = Timestamp | Date | null

/** Perfil global mínimo del usuario (colección `users`). */
export interface UserProfile {
  uid: string
  displayName: string
  email: string
  photoURL?: string
}

/**
 * Paleta white-label de un gym. Solo 3 colores de marca; los grises/neutrales
 * de la app quedan constantes (texto, bordes) para legibilidad garantizada.
 */
export interface GymTheme {
  accent: string // hex ancla → genera la escala brand-50..900
  background: string // fondo de página (surface-muted)
  container: string // superficie de cards/modales (surface)
  text: string // color de texto principal (foreground fuerte)
}

/** Gimnasio / tenant (colección `gyms`). */
export interface Gym {
  id: string
  name: string
  logoURL?: string
  ownerUid: string
  adminUids?: string[] // uids con permisos de admin (fuente de verdad en las rules)
  theme?: GymTheme
}

/**
 * Membresía de un usuario en un gym (`gyms/{gymId}/members/{memberId}`).
 * `id` es el id del doc (identificador canónico dentro del gym).
 * `uid` enlaza con la cuenta de Firebase Auth; queda vacío hasta que el socio
 * "reclama" su membresía al loguearse con el email con el que lo dieron de alta.
 */
export interface Member {
  id: string
  uid: string // '' = invitación pendiente de reclamar
  email: string
  role: Role
  // datos personales (editables por user y admin)
  fullName: string
  phone?: string
  birthDate?: DateValue
  photoURL?: string
  // datos de negocio (solo admin escribe)
  service?: string
  startDate?: DateValue
  paymentDate?: DateValue
  monthlyCost?: number
  status: MemberStatus
}

/** Membresía resumida para el selector de tenant. */
export interface Membership {
  gymId: string
  memberId: string
  gymName: string
  gymLogoURL?: string
  gymTheme?: GymTheme
  role: Role
}

export type NoteType = 'objective' | 'weight' | 'observation'

/** Nota privada del admin (`.../members/{uid}/notes`). El user no la ve. */
export interface Note {
  id: string
  type: NoteType
  value: string
  date: DateValue
  createdBy: string
}

export interface Exercise {
  name: string
  sets: number
  reps: number
  intensity?: string
  restSec?: number
  notes?: string
}

/** Rutina (`gyms/{gymId}/routines/{routineId}`). */
export interface Routine {
  id: string
  name: string
  description?: string
  createdBy: string
  exercises: Exercise[]
}

/** Asignación rutina ↔ member (`gyms/{gymId}/assignments`). */
export interface Assignment {
  id: string
  memberUid: string
  routineId: string
  active: boolean
}

export interface LogSet {
  weight: number
  reps: number
}

/** Registro de carga del propio user (`.../members/{uid}/logs`). */
export interface WorkoutLog {
  id: string
  routineId: string
  exerciseName: string
  date: DateValue
  sets: LogSet[]
}

/** Doc agregado para el panel admin (`gyms/{gymId}/stats/summary`). */
export interface AdminStats {
  memberCount: number
  monthlyRevenue: number
  routinesSent: number
  overdueCount: number
  updatedAt?: DateValue
}
