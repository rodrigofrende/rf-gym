import type {
  AdminStats,
  Assignment,
  Gym,
  Member,
  Note,
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
    uid: 'demo-socio-1',
    displayName: 'Juan Pérez',
    email: 'juan@tigerfit.com',
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
  stats: AdminStats
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
      id: 'demo-socio-1',
      uid: 'demo-socio-1',
      email: 'juan@tigerfit.com',
      role: 'user',
      fullName: 'Juan Pérez',
      phone: '+54 11 5555-2001',
      birthDate: new Date('1995-08-23'),
      service: 'Musculación + clases',
      startDate: new Date('2025-02-01'),
      paymentDate: new Date('2026-06-01'),
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
      paymentDate: new Date('2026-05-10'),
      monthlyCost: 22000,
      status: 'overdue',
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
  ]

  const assignments: Assignment[] = [
    { id: 'asg-1', memberUid: 'demo-socio-1', routineId: 'routine-1', active: true },
    { id: 'asg-2', memberUid: 'demo-socio-1', routineId: 'routine-2', active: true },
    { id: 'asg-3', memberUid: 'demo-socio-2', routineId: 'routine-1', active: true },
  ]

  const notes: Record<string, Note[]> = {
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

  return { gym, members, routines, assignments, notes, logs, stats }
}
