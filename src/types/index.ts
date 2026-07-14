import type { Timestamp } from 'firebase/firestore'

export type Role = 'admin' | 'user'

export type MemberStatus = 'active' | 'paused' | 'overdue'

export type AttendancePaymentState = 'al_dia' | 'overdue' | 'blocked'

export type MemberAuthStatus = 'pending_password' | 'active' | 'password_change_required'

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

/** Nivel de white-label de un plan de suscripción. */
export type WhiteLabelLevel = 'none' | 'basic' | 'full'

/** Plan de suscripción de la plataforma (colección top-level `plans`). */
export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  maxAdmins: number // 0 = ilimitado
  maxMembers: number // 0 = ilimitado
  maxRoutines: number // 0 = ilimitado
  maxExercises: number // 0 = ilimitado
  maxSponsors: number // 0 = ilimitado
  logsEnabled: boolean // si los alumnos pueden registrar cargas
  maxLogsPerMember: number // 0 = ilimitado (solo si logsEnabled)
  whiteLabel: WhiteLabelLevel
  features?: string[]
  active: boolean
}

/** Suscripción del gym a la plataforma RF Gym (lo gestiona el super-admin). */
export interface GymSubscription {
  monthlyCost: number
  planId?: string // plan de suscripción asignado
  startDate?: DateValue // fecha de ingreso a la plataforma
  lastPaymentDate?: DateValue
  dueDate?: DateValue // próximo vencimiento estipulado
  status: 'active' | 'suspended'
}

/** Gimnasio / tenant (colección `gyms`). */
export interface Gym {
  id: string
  name: string
  logoURL?: string
  // Ventana de rate-limit de cambios de logo (máx. 3 por 24hs, validado en firestore.rules)
  logoWindowStart?: DateValue
  logoChangeCount?: number
  ownerUid: string
  adminUids?: string[] // uids con permisos de admin (fuente de verdad en las rules)
  theme?: GymTheme
  subscription?: GymSubscription
}

/** Enlace personalizado de la presentación (título + URL). */
export interface GymLink {
  label: string
  url: string
}

/** Nivel legacy de un patrocinador (docs previos al rediseño). Ya no se edita. */
export type SponsorTier = 'featured' | 'standard'

/**
 * Patrocinador/auspiciante que el gym muestra en sus superficies públicas.
 * Vive dentro de `GymPresentation` (doc world-readable): sin datos sensibles.
 * Solo el nombre es obligatorio; el resto suma si está.
 */
export interface Sponsor {
  name: string
  imageURL?: string // data:image subida desde el form (mismo pipeline que el logo) o http(s)
  phone?: string // número crudo; se normaliza a dígitos con whatsappLink()
  linkURL?: string // URL http(s) (sitio, Instagram, lo que sea)
  // Campos legacy: solo lectura para compatibilidad con docs viejos; se mapean
  // a los campos nuevos en resolvePresentation y no se vuelven a escribir.
  tier?: SponsorTier
  logoURL?: string
  instagram?: string
  whatsapp?: string
  youtubeURL?: string
}

/**
 * Snapshot público de una tarifa para mostrar en la presentación. Se copia desde
 * `gyms/{gymId}/tariffs` al guardar (la subcolección real es privada). Solo campos
 * pensados para mostrar a prospectos.
 */
export interface PublicTariff {
  id: string // referencia a la tarifa original (para re-seleccionar en el editor)
  name: string
  price: number
  weeklyFrequency?: number
  description?: string
  icon?: TariffIconKey
}

/**
 * Presentación pública del gym (`publicProfiles/{gymId}`). Documento legible SIN
 * login (rules: `allow read: if true`), por eso NO contiene datos sensibles: solo
 * lo que el gym quiere mostrar a prospectos + un snapshot de marca
 * (name/logoURL/theme) para renderizar branded sin leer el doc protegido `gyms/{gymId}`.
 */
export interface GymPresentation {
  id: string // = gymId
  // Snapshot de marca (se refresca al guardar)
  name: string
  logoURL?: string
  theme?: GymTheme
  // Contenido editable por el admin
  description?: string
  videos?: string[] // URLs de YouTube/Instagram, en orden
  links?: GymLink[] // enlaces personalizados (incluye redes), en orden
  tariffs?: PublicTariff[] // tarifas que el admin elige mostrar (snapshot)
  sponsors?: Sponsor[] // patrocinadores/auspiciantes, en orden
  // Ventana de rate-limit de cambios de sponsors (validado en firestore.rules)
  sponsorsWindowStart?: DateValue
  sponsorsChangeCount?: number
  // Contacto
  whatsapp?: string // número crudo; se normaliza a dígitos para wa.me
  email?: string
  address?: string
  openingHours?: string
  // Campos legacy: solo lectura para compatibilidad con docs viejos. Ya no se
  // editan; `videos`/`links` los reemplazan. Ver utils/presentation.ts.
  videoURL?: string
  instagramURL?: string
  facebookURL?: string
  updatedAt?: DateValue
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
  loginEmail?: string
  authStatus?: MemberAuthStatus
  passwordUpdatedAt?: DateValue
  passwordResetRequestedAt?: DateValue
  role: Role
  // datos personales (editables por user y admin)
  fullName: string
  phone?: string
  birthDate?: DateValue
  photoURL?: string
  // datos de negocio (solo admin escribe)
  service?: string // nombre del plan/tarifa (snapshot)
  tariffId?: string // tarifa elegida (referencia)
  weeklyFrequency?: number // veces por semana (snapshot; 0 = libre)
  startDate?: DateValue
  paymentDate?: DateValue // próximo vencimiento estipulado
  lastPaymentDate?: DateValue // último pago registrado
  monthlyCost?: number // cuota
  status: MemberStatus
}

/**
 * Índice público de lookup exacto para login de socios (`memberLoginIndex/{emailKey}`).
 * Es world-readable (el login lo lee antes de autenticar), así que NO guarda PII de
 * más: sin nombre completo ni rol, solo lo mínimo para rutear y reclamar el acceso.
 */
export interface MemberLoginIndex {
  id: string
  email: string
  gymId: string
  gymName: string
  memberId: string
  authStatus: MemberAuthStatus
}

/** Tarifa / plan que ofrece el gym (`gyms/{gymId}/tariffs`). */
export interface Tariff {
  id: string
  name: string
  weeklyFrequency: number // veces por semana (0 = libre)
  price: number
  description?: string
  icon?: TariffIconKey
  active: boolean
}

/** Pago registrado de un socio o de la suscripción de un gym. */
export interface Payment {
  id: string
  amount: number
  date: DateValue
  comment?: string // nota opcional del pago
  createdBy: string
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

/** Tipo de carga del ejercicio → define qué inputs ve el socio al registrar. */
export type LoadType =
  | 'weight' // kg + reps (peso total, incluye barra si aplica)
  | 'time' // tiempo / tensión (planchas, isométricos)
  | 'bodyweight' // peso corporal: solo reps

/** Valores legacy persistidos antes de la simplificación de tipos. */
export type LegacyLoadType = 'cable' | 'barbell' | 'unilateral' | 'isometric'

export type StoredLoadType = LoadType | LegacyLoadType

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'legs'
  | 'glutes'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'fullBody'
  | 'cardio'

export type ExerciseCategory = 'strength' | 'hypertrophy' | 'cardio' | 'mobility' | 'functional' | 'core'

/** Icono visual de la rutina (cards y vista). */
export type RoutineIconKey =
  | 'strength'
  | 'lower'
  | 'upper'
  | 'cardio'
  | 'mobility'
  | 'core'
  | 'functional'
  | 'boxing'
  | 'yoga'
  | 'running'
  | 'recovery'

/** Icono visual de la tarifa (cards y formulario). */
export type TariffIconKey =
  | 'membership'
  | 'dumbbell'
  | 'activity'
  | 'heart'
  | 'users'
  | 'calendar'
  | 'star'
  | 'crown'
  | 'zap'
  | 'sparkles'

export interface Exercise {
  exerciseId?: string
  name: string
  sets: number
  reps: number
  intensity?: string // RPE / esfuerzo percibido (opcional)
  weight?: string // carga, ej. "80 kg" / "corporal" (opcional)
  loadType?: StoredLoadType // tipo de carga (default 'weight')
  restSec?: number
  notes?: string
}

/** Ejercicio del catálogo del gym (`gyms/{gymId}/exercises/{exerciseId}`). */
export interface ExerciseDefinition {
  id: string
  name: string
  category: ExerciseCategory
  muscleGroups: MuscleGroup[]
  loadType: LoadType
  description?: string
  defaultSets?: number
  defaultReps?: number
  defaultRestSec?: number
  createdBy: string
}

/** Rutina (`gyms/{gymId}/routines/{routineId}`). */
export interface Routine {
  id: string
  name: string
  description?: string
  icon?: RoutineIconKey
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
  weight?: number
  reps?: number
  seconds?: number // para ejercicios isométricos (tiempo de tensión)
}

/** Asistencia diaria por QR (`gyms/{gymId}/attendance/{dayKey_memberId}`). */
export interface Attendance {
  id: string
  memberId: string
  memberUid: string
  memberName: string
  email: string
  dayKey: string
  checkedInAt: DateValue
  lastSeenAt: DateValue
  scanCount: number
  paymentState: AttendancePaymentState
  memberStatus: MemberStatus
}

/** Registro de carga del propio user (`.../members/{uid}/logs`). */
export interface WorkoutLog {
  id: string
  routineId: string
  exerciseKey?: string
  exerciseName: string
  dayKey?: string
  trainingDate?: DateValue
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

export interface SeriesPoint {
  label: string
  value: number
}

/** Datos derivados para el panel del admin (KPIs + series para gráficos). */
export interface GymDashboard {
  sociosActivos: number
  sociosTotal: number
  cobradoEsteMes: number
  deudaTotal: number
  vencidosCount: number
  rutinasActivas: number
  logsTotal: number // registros de carga del gym
  revenueByMonth: SeriesPoint[] // últimos 6 meses ($ cobrado)
  altasByMonth: SeriesPoint[] // últimos 6 meses (altas)
  activityByWeek: SeriesPoint[] // últimas ~8 semanas (registros)
  statusBreakdown: { key: string; label: string; value: number }[]
}
