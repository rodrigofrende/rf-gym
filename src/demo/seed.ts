import type {
  AdminStats,
  Assignment,
  Gym,
  Member,
  Note,
  Payment,
  Routine,
  WorkoutLog,
} from '@/types'

/** Único gym de la demo. */
export const DEMO_GYM_ID = 'tigerfit'

/** Identidades que ofrece el DemoSwitcher / login demo. */
export const DEMO_IDENTITIES = {
  superadmin: {
    uid: 'demo-super',
    displayName: 'Rodrigo Frende',
    email: 'rodrigo.frende@gmail.com',
    photoURL: '',
  },
  admin: {
    uid: 'demo-admin',
    displayName: 'Ian Maidana',
    email: 'ian@tigerfit.com',
    photoURL: '',
  },
  socio: {
    uid: 'demo-socio-rodrigo',
    displayName: 'Rodrigo Frende',
    email: 'rodrigo@tigerfit.com',
    photoURL: '',
  },
} as const

export interface DemoData {
  gym: Gym & { adminUids: string[] }
  members: Member[]
  routines: Routine[]
  assignments: Assignment[]
  notes: Record<string, Note[]> // memberId -> notas
  logs: Record<string, WorkoutLog[]> // memberId -> logs
  payments: Record<string, Payment[]> // memberId -> pagos
  stats: AdminStats
}

/**
 * Genera logs semanales de un ejercicio con progresión: una sesión por fecha,
 * cada una con `setsCount` series al peso de esa semana.
 */
function progressionLogs(
  idBase: string,
  routineId: string,
  exerciseName: string,
  sessions: { date: string; weight: number }[],
  reps: number,
  setsCount: number,
): WorkoutLog[] {
  return sessions.map((s, i) => ({
    id: `${idBase}-${i + 1}`,
    routineId,
    exerciseName,
    date: new Date(s.date),
    sets: Array.from({ length: setsCount }, () => ({ weight: s.weight, reps })),
  }))
}

/** Genera una copia fresca de la data inicial de TigerFit (todo en memoria). */
export function buildSeed(): DemoData {
  const gym = {
    id: DEMO_GYM_ID,
    name: 'TigerFit',
    ownerUid: 'demo-admin',
    adminUids: ['demo-admin'],
    // Branding white-label de ejemplo: naranja "tigre" + fondo cálido (look imagen 1).
    theme: {
      accent: '#ea580c',
      background: '#fafaf9',
      container: '#ffffff',
      text: '#0f172a',
    },
    // Suscripción del gym a la plataforma RF Gym (al día).
    subscription: {
      monthlyCost: 50000,
      lastPaymentDate: new Date('2026-05-28'),
      dueDate: new Date('2026-06-28'),
      status: 'active' as const,
    },
  }

  const members: Member[] = [
    {
      id: 'demo-admin',
      uid: 'demo-admin',
      email: 'ian@tigerfit.com',
      role: 'admin',
      fullName: 'Ian Maidana',
      phone: '+54 11 5555-1000',
      birthDate: new Date('1995-07-19'),
      status: 'active',
    },
    {
      id: 'demo-socio-rodrigo',
      uid: 'demo-socio-rodrigo',
      email: 'rodrigo@tigerfit.com',
      role: 'user',
      fullName: 'Rodrigo Frende',
      phone: '+54 11 5555-2010',
      birthDate: new Date('1994-03-15'),
      service: 'Musculación',
      startDate: new Date('2024-09-01'),
      paymentDate: new Date('2026-06-25'), // al día
      lastPaymentDate: new Date('2026-05-25'),
      monthlyCost: 30000,
      status: 'active',
    },
    {
      id: 'demo-socio-1',
      uid: 'demo-socio-1',
      email: 'juan@tigerfit.com',
      role: 'user',
      fullName: 'Juan Pérez',
      phone: '+54 11 5555-2001',
      birthDate: new Date('1995-08-23'),
      service: 'Musculación + clases',
      startDate: new Date('2025-02-01'),
      paymentDate: new Date('2026-06-03'), // vencido ~8 días → aviso
      lastPaymentDate: new Date('2026-05-03'),
      monthlyCost: 28000,
      status: 'active',
    },
    {
      id: 'demo-socio-2',
      uid: 'demo-socio-2',
      email: 'mariana@tigerfit.com',
      role: 'user',
      fullName: 'Mariana López',
      phone: '+54 11 5555-2002',
      birthDate: new Date('1988-12-03'),
      service: 'Funcional',
      startDate: new Date('2024-11-10'),
      paymentDate: new Date('2026-05-10'), // vencido >14 días → bloqueado
      lastPaymentDate: new Date('2026-04-10'),
      monthlyCost: 22000,
      status: 'active',
    },
    {
      id: 'demo-socio-3',
      uid: 'demo-socio-3',
      email: 'carlos@tigerfit.com',
      role: 'user',
      fullName: 'Carlos Díaz',
      phone: '+54 11 5555-2003',
      birthDate: new Date('2000-01-30'),
      service: 'Musculación',
      startDate: new Date('2025-05-20'),
      paymentDate: new Date('2026-06-20'),
      lastPaymentDate: new Date('2026-05-20'),
      monthlyCost: 25000,
      status: 'paused',
    },
  ]

  const routines: Routine[] = [
    {
      id: 'routine-1',
      name: 'Full Body A',
      description: 'Rutina general de cuerpo completo, 3 veces por semana.',
      createdBy: 'demo-admin',
      exercises: [
        { name: 'Sentadilla', sets: 4, reps: 10, intensity: 'RPE 8', restSec: 90 },
        { name: 'Press banca', sets: 4, reps: 8, intensity: 'RPE 8', restSec: 90 },
        { name: 'Remo con barra', sets: 3, reps: 12, intensity: 'Moderada', restSec: 60 },
        { name: 'Plancha', sets: 3, reps: 1, intensity: '40 seg', restSec: 45, notes: 'Isométrico' },
      ],
    },
    {
      id: 'routine-2',
      name: 'Tren Superior',
      description: 'Enfoque en empuje y tracción.',
      createdBy: 'demo-admin',
      exercises: [
        { name: 'Press militar', sets: 4, reps: 8, intensity: 'RPE 7', restSec: 90 },
        { name: 'Dominadas', sets: 4, reps: 6, intensity: 'Lastre si puede', restSec: 120 },
        { name: 'Curl de bíceps', sets: 3, reps: 12, intensity: 'Moderada', restSec: 60 },
        { name: 'Extensión de tríceps', sets: 3, reps: 12, intensity: 'Moderada', restSec: 60 },
      ],
    },
    // --- Split de 4 días de Rodrigo (recomposición, intermedio) ---
    {
      id: 'rt-pierna-a',
      name: 'Pierna A — Cuádriceps',
      description: 'Lunes · pierna dominante de cuádriceps. Abdominales al final.',
      createdBy: 'demo-admin',
      exercises: [
        { name: 'Sentadilla', sets: 4, reps: 6, intensity: 'RPE 8', weight: '100 kg', restSec: 150 },
        { name: 'Prensa 45°', sets: 4, reps: 10, weight: '220 kg', restSec: 120 },
        { name: 'Extensión de cuádriceps', sets: 3, reps: 12, intensity: 'RPE 9', weight: '55 kg', loadType: 'cable', restSec: 75 },
        { name: 'Estocadas con mancuernas', sets: 3, reps: 12, weight: '20 kg c/u', loadType: 'unilateral', restSec: 75 },
        { name: 'Sentadilla búlgara', sets: 3, reps: 10, weight: '16 kg c/u', loadType: 'unilateral', restSec: 75 },
        { name: 'Plancha', sets: 3, reps: 1, loadType: 'isometric', restSec: 45, notes: 'Isométrico abdominal' },
      ],
    },
    {
      id: 'rt-pierna-b',
      name: 'Pierna B — Posterior',
      description: 'Sábado · cadena posterior (femorales y glúteo). Abdominales al final.',
      createdBy: 'demo-admin',
      exercises: [
        { name: 'Peso muerto', sets: 4, reps: 5, intensity: 'RPE 8', weight: '130 kg', restSec: 180 },
        { name: 'Peso muerto sumo', sets: 3, reps: 6, weight: '110 kg', restSec: 150 },
        { name: 'Curl femoral en camilla', sets: 4, reps: 12, intensity: 'RPE 9', weight: '50 kg', loadType: 'cable', restSec: 75 },
        { name: 'Hip thrust', sets: 3, reps: 10, weight: '100 kg', loadType: 'barbell', restSec: 90 },
        { name: 'Rueda abdominal', sets: 3, reps: 12, intensity: 'Control', loadType: 'bodyweight', restSec: 45 },
      ],
    },
    {
      id: 'rt-empuje',
      name: 'Empuje — Pecho/Hombro/Tríceps',
      description: 'Martes · empuje. Abdominales al final.',
      createdBy: 'demo-admin',
      exercises: [
        { name: 'Press banca', sets: 4, reps: 8, intensity: 'RPE 8', weight: '80 kg', restSec: 150 },
        { name: 'Press militar', sets: 4, reps: 8, intensity: 'RPE 8', weight: '50 kg', restSec: 120 },
        { name: 'Press inclinado con mancuernas', sets: 3, reps: 12, weight: '26 kg c/u', restSec: 90 },
        { name: 'Elevaciones laterales', sets: 3, reps: 15, weight: '12 kg c/u', restSec: 60 },
        { name: 'Extensión de tríceps en polea', sets: 3, reps: 12, weight: '30 kg', loadType: 'cable', restSec: 60 },
        { name: 'Crunch en polea', sets: 3, reps: 15, weight: '35 kg', loadType: 'cable', restSec: 45 },
      ],
    },
    {
      id: 'rt-espalda-biceps',
      name: 'Espalda + Bíceps',
      description: 'Jueves · tracción y bíceps. Abdominales al final.',
      createdBy: 'demo-admin',
      exercises: [
        { name: 'Dominadas', sets: 4, reps: 8, intensity: 'RPE 8', loadType: 'bodyweight', restSec: 120 },
        { name: 'Remo con barra', sets: 4, reps: 10, intensity: 'RPE 8', weight: '70 kg', restSec: 120 },
        { name: 'Jalón al pecho', sets: 3, reps: 12, weight: '65 kg', loadType: 'cable', restSec: 90 },
        { name: 'Curl con barra', sets: 3, reps: 12, weight: '30 kg', restSec: 60 },
        { name: 'Curl martillo', sets: 3, reps: 12, weight: '14 kg c/u', loadType: 'unilateral', restSec: 60 },
        { name: 'Elevación de piernas colgado', sets: 3, reps: 12, intensity: 'Control', loadType: 'bodyweight', restSec: 45 },
      ],
    },
  ]

  const assignments: Assignment[] = [
    { id: 'asg-1', memberUid: 'demo-socio-1', routineId: 'routine-1', active: true },
    { id: 'asg-2', memberUid: 'demo-socio-1', routineId: 'routine-2', active: true },
    { id: 'asg-3', memberUid: 'demo-socio-2', routineId: 'routine-1', active: true },
    // Split de 4 días de Rodrigo
    { id: 'asg-r1', memberUid: 'demo-socio-rodrigo', routineId: 'rt-pierna-a', active: true },
    { id: 'asg-r2', memberUid: 'demo-socio-rodrigo', routineId: 'rt-pierna-b', active: true },
    { id: 'asg-r3', memberUid: 'demo-socio-rodrigo', routineId: 'rt-empuje', active: true },
    { id: 'asg-r4', memberUid: 'demo-socio-rodrigo', routineId: 'rt-espalda-biceps', active: true },
  ]

  const notes: Record<string, Note[]> = {
    'demo-socio-rodrigo': [
      {
        id: 'note-r1',
        type: 'objective',
        value: 'Recomposición: bajar grasa manteniendo masa muscular. Foco en básicos.',
        date: new Date('2026-05-12'),
        createdBy: 'demo-admin',
      },
      {
        id: 'note-r2',
        type: 'observation',
        value: 'Altura 1.78 m · nivel intermedio · entrena 4 días/semana.',
        date: new Date('2026-05-12'),
        createdBy: 'demo-admin',
      },
      {
        id: 'note-r3',
        type: 'weight',
        value: '84 kg (control inicial)',
        date: new Date('2026-05-12'),
        createdBy: 'demo-admin',
      },
      {
        id: 'note-r4',
        type: 'weight',
        value: '82.8 kg',
        date: new Date('2026-05-26'),
        createdBy: 'demo-admin',
      },
      {
        id: 'note-r5',
        type: 'weight',
        value: '81.5 kg',
        date: new Date('2026-06-09'),
        createdBy: 'demo-admin',
      },
    ],
    'demo-socio-1': [
      {
        id: 'note-1',
        type: 'objective',
        value: 'Bajar 4 kg y mejorar técnica de sentadilla en 2 meses.',
        date: new Date('2025-05-15'),
        createdBy: 'demo-admin',
      },
      {
        id: 'note-2',
        type: 'weight',
        value: '82 kg (control inicial)',
        date: new Date('2025-05-15'),
        createdBy: 'demo-admin',
      },
      {
        id: 'note-3',
        type: 'weight',
        value: '80.5 kg',
        date: new Date('2025-06-01'),
        createdBy: 'demo-admin',
      },
      {
        id: 'note-4',
        type: 'observation',
        value: 'Muy constante. Cuidar la zona lumbar en peso muerto.',
        date: new Date('2025-06-05'),
        createdBy: 'demo-admin',
      },
    ],
  }

  const logs: Record<string, WorkoutLog[]> = {
    // Rodrigo: 4 semanas de progresión en los básicos (mayo–junio 2026).
    'demo-socio-rodrigo': [
      ...progressionLogs(
        'log-r-sent',
        'rt-pierna-a',
        'Sentadilla',
        [
          { date: '2026-05-18', weight: 90 },
          { date: '2026-05-25', weight: 95 },
          { date: '2026-06-01', weight: 97.5 },
          { date: '2026-06-08', weight: 100 },
        ],
        6,
        4,
      ),
      ...progressionLogs(
        'log-r-prensa',
        'rt-pierna-a',
        'Prensa 45°',
        [
          { date: '2026-05-18', weight: 190 },
          { date: '2026-05-25', weight: 200 },
          { date: '2026-06-01', weight: 210 },
          { date: '2026-06-08', weight: 220 },
        ],
        10,
        4,
      ),
      ...progressionLogs(
        'log-r-pm',
        'rt-pierna-b',
        'Peso muerto',
        [
          { date: '2026-05-16', weight: 120 },
          { date: '2026-05-23', weight: 125 },
          { date: '2026-05-30', weight: 127.5 },
          { date: '2026-06-06', weight: 130 },
        ],
        5,
        4,
      ),
      ...progressionLogs(
        'log-r-banca',
        'rt-empuje',
        'Press banca',
        [
          { date: '2026-05-19', weight: 72.5 },
          { date: '2026-05-26', weight: 75 },
          { date: '2026-06-02', weight: 77.5 },
          { date: '2026-06-09', weight: 80 },
        ],
        8,
        4,
      ),
      ...progressionLogs(
        'log-r-militar',
        'rt-empuje',
        'Press militar',
        [
          { date: '2026-05-19', weight: 45 },
          { date: '2026-05-26', weight: 47.5 },
          { date: '2026-06-02', weight: 50 },
          { date: '2026-06-09', weight: 50 },
        ],
        8,
        4,
      ),
      ...progressionLogs(
        'log-r-remo',
        'rt-espalda-biceps',
        'Remo con barra',
        [
          { date: '2026-05-21', weight: 62.5 },
          { date: '2026-05-28', weight: 65 },
          { date: '2026-06-04', weight: 67.5 },
          { date: '2026-06-11', weight: 70 },
        ],
        10,
        4,
      ),
    ],
    'demo-socio-1': [
      {
        id: 'log-1',
        routineId: 'routine-1',
        exerciseName: 'Sentadilla',
        date: new Date('2025-05-26'),
        sets: [
          { weight: 60, reps: 10 },
          { weight: 70, reps: 8 },
          { weight: 70, reps: 8 },
        ],
      },
      {
        id: 'log-2',
        routineId: 'routine-1',
        exerciseName: 'Sentadilla',
        date: new Date('2025-06-02'),
        sets: [
          { weight: 65, reps: 10 },
          { weight: 75, reps: 8 },
          { weight: 75, reps: 8 },
        ],
      },
      {
        id: 'log-3',
        routineId: 'routine-1',
        exerciseName: 'Press banca',
        date: new Date('2025-06-02'),
        sets: [
          { weight: 50, reps: 8 },
          { weight: 55, reps: 6 },
        ],
      },
    ],
  }

  const payments: Record<string, Payment[]> = {
    'demo-socio-rodrigo': [
      { id: 'pay-r1', amount: 30000, date: new Date('2026-03-25'), comment: 'Marzo · efectivo', createdBy: 'demo-admin' },
      { id: 'pay-r2', amount: 30000, date: new Date('2026-04-25'), comment: 'Abril · transferencia', createdBy: 'demo-admin' },
      { id: 'pay-r3', amount: 30000, date: new Date('2026-05-25'), comment: 'Mayo · transferencia', createdBy: 'demo-admin' },
    ],
  }

  const socios = members.filter((m) => m.role === 'user')
  const stats: AdminStats = {
    memberCount: socios.length,
    monthlyRevenue: socios
      .filter((m) => m.status === 'active')
      .reduce((sum, m) => sum + (m.monthlyCost ?? 0), 0),
    routinesSent: assignments.filter((a) => a.active).length,
    overdueCount: socios.filter((m) => m.status === 'overdue').length,
    updatedAt: new Date('2026-06-08'),
  }

  return { gym, members, routines, assignments, notes, logs, payments, stats }
}
