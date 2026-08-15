import {
  BarChart3,
  CalendarCheck,
  ClipboardList,
  Dumbbell,
  Megaphone,
  MessageCircle,
  Palette,
  QrCode,
  Rocket,
  Smartphone,
  Store,
  TrendingUp,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { SubscriptionPlan } from '@/types'

/**
 * Contenido de la landing pública de RF FIT (copy es-AR). Separado de la vista
 * para que ajustar textos no toque markup.
 */

export interface LandingFeature {
  icon: LucideIcon
  title: string
  body: string
}

export interface LandingFeatureGroup {
  eyebrow: string
  features: LandingFeature[]
}

export const FEATURE_GROUPS: LandingFeatureGroup[] = [
  {
    eyebrow: 'Para vos, el dueño',
    features: [
      {
        icon: Users,
        title: 'Socios y pagos bajo control',
        body: 'Altas por email, estados, tarifas e historial de pagos. La mora se ve de lejos y el acceso del moroso se corta solo si querés.',
      },
      {
        icon: BarChart3,
        title: 'Números que se entienden',
        body: 'Ingresos, altas, actividad y morosos en un dashboard con gráficos. Decisiones con datos, no con intuición.',
      },
      {
        icon: Store,
        title: 'Tienda con pedidos por WhatsApp',
        body: 'Suplementos, ropa, lo que vendas. Fotos, promos y pedidos que te llegan directo al chat.',
      },
      {
        icon: Megaphone,
        title: 'Tu página pública + patrocinadores',
        body: 'Un micrositio con tu marca, videos y tarifas para captar socios. Y espacios de sponsors que te ayudan a monetizar.',
      },
    ],
  },
  {
    eyebrow: 'Para tu coach',
    features: [
      {
        icon: Dumbbell,
        title: 'Rutinas en minutos',
        body: 'Armá rutinas con series, reps, RPE y descansos, y asignalas a cada socio. Chau planillas.',
      },
      {
        icon: ClipboardList,
        title: 'Tu catálogo de ejercicios',
        body: 'Ejercicios propios con categorías, grupos musculares y video demostrativo.',
      },
      {
        icon: QrCode,
        title: 'Check-in con QR',
        body: 'Un QR impreso en la entrada. El socio escanea y vos ves la asistencia del día en vivo.',
      },
      {
        icon: Trophy,
        title: 'Ranking que motiva',
        body: 'Ranking mensual de asistencia con imagen brandeada lista para compartir en historias.',
      },
    ],
  },
  {
    eyebrow: 'Para tus socios',
    features: [
      {
        icon: Smartphone,
        title: 'Su rutina en el bolsillo',
        body: 'Cada socio ve su rutina del día en el celular, clara y sin vueltas.',
      },
      {
        icon: TrendingUp,
        title: 'Progreso que se ve',
        body: 'Registro de cargas con historial. Ver que el número sube es lo que hace que vuelvan.',
      },
      {
        icon: CalendarCheck,
        title: 'Su asistencia, su constancia',
        body: 'Calendario de días entrenados y su lugar en el ranking del mes.',
      },
      {
        icon: Palette,
        title: 'Tu marca, no la nuestra',
        body: 'Con white-label, la app lleva tu logo y tus colores. Tus socios ven TU gimnasio.',
      },
    ],
  },
]

export interface LandingStep {
  icon: LucideIcon
  title: string
  body: string
}

export const STEPS: LandingStep[] = [
  {
    icon: MessageCircle,
    title: 'Escribinos',
    body: 'Nos contás cómo trabaja tu gimnasio por WhatsApp. Sin formularios eternos ni demos agendadas a 15 días.',
  },
  {
    icon: Rocket,
    title: 'Lo dejamos listo',
    body: 'Creamos tu gimnasio, cargamos tu marca y tus tarifas. En días, no en meses.',
  },
  {
    icon: QrCode,
    title: 'Tus socios entrenan',
    body: 'Escanean el QR, ven su rutina y registran su progreso. Vos ves todo desde tu panel.',
  },
]

export const TRUTHS = [
  'Sin instalación — es 100% web',
  'Tus socios entran gratis',
  'Precios en pesos argentinos',
]

export interface LandingFaq {
  q: string
  a: string
}

export const FAQS: LandingFaq[] = [
  {
    q: '¿Tengo que instalar algo?',
    a: 'No. RF FIT es 100% web: funciona en el celular, la tablet y la compu, sin descargar nada. Tus socios tampoco instalan nada.',
  },
  {
    q: '¿Mis socios pagan por usar la app?',
    a: 'No. El plan lo paga el gimnasio y tus socios entran gratis con su email, cada uno con su propia cuenta.',
  },
  {
    q: '¿La plata de las cuotas pasa por RF FIT?',
    a: 'No. Vos cobrás como siempre y registrás el pago en el sistema. RF FIT te ordena quién pagó, quién debe y cuánto entra por mes.',
  },
  {
    q: '¿Qué pasa si supero el límite de socios de mi plan?',
    a: 'Nada se rompe ni se bloquea de un día para el otro. Te contactamos para pasarte al plan siguiente y listo, tus datos quedan intactos.',
  },
  {
    q: '¿Puedo cambiar de plan más adelante?',
    a: 'Sí, cuando quieras. Escribinos por WhatsApp y hacemos el cambio sin perder nada de lo cargado.',
  },
  {
    q: '¿La app puede llevar mi marca?',
    a: 'Sí. Con white-label la app usa tu logo y tu paleta de colores, y tenés tu propia página pública para compartir con prospectos.',
  },
]

/** Mensajes de WhatsApp pre-armados por contexto. */
export const WA_GENERAL_MESSAGE = 'Hola! Quiero RF FIT en mi gimnasio.'
export function waPlanMessage(plan: SubscriptionPlan): string {
  if (plan.customPricing) return `Hola! Quiero hablar del plan ${plan.name} de RF FIT para mi gimnasio.`
  return `Hola! Me interesa el plan ${plan.name} de RF FIT para mi gimnasio.`
}

/** Etiqueta del CTA según el rol del plan en la escalera de precios. */
export function planCtaLabel(plan: SubscriptionPlan): string {
  if (plan.customPricing) return 'Hablemos'
  if (plan.highlighted) return 'Quiero este plan'
  return 'Probalo'
}

/**
 * Snapshot estático de los tiers para cuando el fetch falla o la colección está
 * vacía: la sección de planes nunca queda en blanco frente a un prospecto.
 * Mantener alineado con el seed / los planes reales de /super/plans.
 */
export const FALLBACK_PLANS: SubscriptionPlan[] = [
  {
    id: 'fallback-inicial',
    name: 'Entrada en Calor',
    price: 9999,
    maxAdmins: 1,
    maxMembers: 30,
    maxRoutines: 10,
    maxExercises: 30,
    maxSponsors: 1,
    logsEnabled: false,
    maxLogsPerMember: 0,
    whiteLabel: 'none',
    features: [
      'Hasta 30 socios activos',
      'Gestión de socios, pagos y vencimientos',
      '10 rutinas y 30 ejercicios propios',
      'Check-in con QR y asistencia del día',
      'Página pública de tu gimnasio',
      '1 espacio para patrocinador',
    ],
    active: true,
    customPricing: false,
    highlighted: false,
  },
  {
    id: 'fallback-pro',
    name: 'Ritmo',
    price: 25000,
    maxAdmins: 3,
    maxMembers: 150,
    maxRoutines: 50,
    maxExercises: 150,
    maxSponsors: 5,
    logsEnabled: true,
    maxLogsPerMember: 100,
    whiteLabel: 'basic',
    features: [
      'Hasta 150 socios y 3 administradores',
      'Todo lo de Entrada en Calor',
      'Registro de cargas y progreso para tus socios',
      '50 rutinas y 150 ejercicios propios',
      'Tu logo y tus colores en la app',
      'Dashboard con métricas e ingresos',
      'Tienda con pedidos por WhatsApp',
      'Ranking mensual con imagen para compartir',
      'Hasta 5 patrocinadores',
    ],
    active: true,
    customPricing: false,
    highlighted: true,
  },
  {
    id: 'fallback-premium',
    name: 'Alto Rendimiento',
    price: 50000,
    maxAdmins: 0,
    maxMembers: 0,
    maxRoutines: 0,
    maxExercises: 0,
    maxSponsors: 6,
    logsEnabled: true,
    maxLogsPerMember: 0,
    whiteLabel: 'full',
    features: [
      'Socios, admins y rutinas sin límite',
      'Todo lo de Ritmo, sin topes',
      'White-label completo con tu marca',
      'Dashboard y reportes completos',
      '6 espacios de patrocinadores destacados',
      'Soporte prioritario y onboarding asistido',
      'Precio que acompaña el tamaño de tu gimnasio',
    ],
    active: true,
    customPricing: true,
    highlighted: false,
  },
]

/** Planes a mostrar: los reales (activos) o el fallback estático. */
export function resolveLandingPlans(
  plans: SubscriptionPlan[] | undefined,
  isError: boolean,
): SubscriptionPlan[] {
  const active = (plans ?? []).filter((p) => p.active)
  if (isError || active.length === 0) return FALLBACK_PLANS
  return active
}
