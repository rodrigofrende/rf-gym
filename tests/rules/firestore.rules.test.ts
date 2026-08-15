import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { afterAll, assert, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'

/**
 * Tests de seguridad de firestore.rules contra el emulador. Verifican que un
 * actor malicioso NO pueda: auto-cambiarse el plan/facturación, inflar el
 * ranking sin techo, leer/escribir datos de otro gym, o auto-promoverse a admin.
 *
 * Correr con: pnpm test:rules  (levanta el emulador de Firestore; necesita Java).
 */

const GYM = 'gymA'
const OTHER_GYM = 'gymB'
const ADMIN_UID = 'admin-uid'
const SOCIO_UID = 'socio-uid'
const SOCIO_MEMBER = 'socio-member'
const OUTSIDER_UID = 'outsider-uid'

let testEnv: RulesTestEnvironment

beforeAll(async () => {
  const rulesPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'firestore.rules')
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-rf-fit-rules',
    firestore: { rules: readFileSync(rulesPath, 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})

afterAll(async () => {
  await testEnv?.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  // Semilla de base con privilegios elevados (sin pasar por las rules).
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, `gyms/${GYM}`), {
      name: 'Gym A',
      ownerUid: ADMIN_UID,
      adminUids: [ADMIN_UID],
      subscription: { planId: 'tier-inicial', monthlyCost: 9999, status: 'active' },
    })
    await setDoc(doc(db, `gyms/${GYM}/members/${SOCIO_MEMBER}`), {
      uid: SOCIO_UID,
      email: 'socio@gymA.com',
      role: 'user',
      fullName: 'Rodrigo Frende',
      status: 'active',
    })
    await setDoc(doc(db, `gyms/${OTHER_GYM}`), {
      name: 'Gym B',
      ownerUid: 'other-admin',
      adminUids: ['other-admin'],
      subscription: { planId: 'tier-inicial', monthlyCost: 9999, status: 'active' },
    })
  })
})

// Contextos de auth reutilizables.
const asAdmin = () => testEnv.authenticatedContext(ADMIN_UID).firestore()
const asSocio = () => testEnv.authenticatedContext(SOCIO_UID).firestore()
const asOutsider = () => testEnv.authenticatedContext(OUTSIDER_UID).firestore()
const asSuper = () =>
  testEnv.authenticatedContext('super-uid', { superAdmin: true }).firestore()

describe('gyms — facturación y propiedad son solo del super-admin', () => {
  it('el admin NO puede auto-cambiarse el plan (subscription)', async () => {
    const db = asAdmin()
    await assertFails(
      updateDoc(doc(db, `gyms/${GYM}`), {
        subscription: { planId: 'tier-premium', monthlyCost: 0, status: 'active' },
      }),
    )
  })

  it('el admin NO puede cambiar ownerUid (robar el gym)', async () => {
    const db = asAdmin()
    await assertFails(updateDoc(doc(db, `gyms/${GYM}`), { ownerUid: ADMIN_UID + '-nuevo' }))
  })

  it('el admin SÍ puede editar branding (name / theme)', async () => {
    const db = asAdmin()
    await assertSucceeds(updateDoc(doc(db, `gyms/${GYM}`), { name: 'Gym A Renovado' }))
  })

  it('el super-admin SÍ puede cambiar la subscription', async () => {
    const db = asSuper()
    await assertSucceeds(
      updateDoc(doc(db, `gyms/${GYM}`), {
        subscription: { planId: 'tier-premium', monthlyCost: 50000, status: 'active' },
      }),
    )
  })

  it('un forastero no puede leer ni escribir el gym', async () => {
    const db = asOutsider()
    await assertFails(getDoc(doc(db, `gyms/${GYM}`)))
    await assertFails(updateDoc(doc(db, `gyms/${GYM}`), { name: 'hackeado' }))
  })
})

describe('plans — lectura pública, escritura solo super-admin', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'plans/tier-inicial'), { name: 'Entrada en Calor', price: 9999 })
    })
  })

  it('cualquiera (sin login) puede leer los planes', async () => {
    const db = testEnv.unauthenticatedContext().firestore()
    await assertSucceeds(getDoc(doc(db, 'plans/tier-inicial')))
  })

  it('un admin NO puede crear/editar planes', async () => {
    const db = asAdmin()
    await assertFails(setDoc(doc(db, 'plans/hackeado'), { name: 'Gratis', price: 0 }))
  })

  it('el super-admin SÍ puede escribir planes', async () => {
    const db = asSuper()
    await assertSucceeds(setDoc(doc(db, 'plans/nuevo'), { name: 'Nuevo', price: 1 }))
  })
})

describe('attendanceMonthly — el ranking no se puede inflar sin techo', () => {
  const entryId = `2026-08_${SOCIO_MEMBER}`
  const base = {
    monthKey: '2026-08',
    memberId: SOCIO_MEMBER,
    memberUid: SOCIO_UID,
    displayName: 'Rodrigo F.',
  }

  it('el socio puede crear su contador con days = 1', async () => {
    const db = asSocio()
    await assertSucceeds(setDoc(doc(db, `gyms/${GYM}/attendanceMonthly/${entryId}`), { ...base, days: 1 }))
  })

  it('el socio NO puede crear con days > 1 (arrancar arriba)', async () => {
    const db = asSocio()
    await assertFails(setDoc(doc(db, `gyms/${GYM}/attendanceMonthly/${entryId}`), { ...base, days: 5 }))
  })

  it('el socio puede incrementar de a 1', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `gyms/${GYM}/attendanceMonthly/${entryId}`), { ...base, days: 3 })
    })
    const db = asSocio()
    await assertSucceeds(updateDoc(doc(db, `gyms/${GYM}/attendanceMonthly/${entryId}`), { ...base, days: 4 }))
  })

  it('el socio NO puede saltar de a más de 1', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `gyms/${GYM}/attendanceMonthly/${entryId}`), { ...base, days: 3 })
    })
    const db = asSocio()
    await assertFails(updateDoc(doc(db, `gyms/${GYM}/attendanceMonthly/${entryId}`), { ...base, days: 10 }))
  })

  it('nadie puede superar el tope de 31 días', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `gyms/${GYM}/attendanceMonthly/${entryId}`), { ...base, days: 31 })
    })
    const db = asSocio()
    await assertFails(updateDoc(doc(db, `gyms/${GYM}/attendanceMonthly/${entryId}`), { ...base, days: 32 }))
  })

  it('el socio NO puede escribir el contador de OTRO socio', async () => {
    const db = asSocio()
    await assertFails(
      setDoc(doc(db, `gyms/${GYM}/attendanceMonthly/2026-08_otro`), {
        ...base,
        memberId: 'otro',
        memberUid: 'otro-uid',
        days: 1,
      }),
    )
  })

  it('cualquier socio del gym puede leer el ranking', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `gyms/${GYM}/attendanceMonthly/${entryId}`), { ...base, days: 5 })
    })
    const db = asSocio()
    await assertSucceeds(getDoc(doc(db, `gyms/${GYM}/attendanceMonthly/${entryId}`)))
  })
})

describe('gymMemberships — no se puede auto-promover a admin', () => {
  it('el socio NO puede escribir su membresía con role admin', async () => {
    const db = asSocio()
    await assertFails(
      setDoc(doc(db, `users/${SOCIO_UID}/gymMemberships/${GYM}`), {
        memberId: SOCIO_MEMBER,
        role: 'admin', // el member doc dice 'user' → la rule rechaza
      }),
    )
  })

  it('el socio SÍ puede escribir su membresía con el role real (user)', async () => {
    const db = asSocio()
    await assertSucceeds(
      setDoc(doc(db, `users/${SOCIO_UID}/gymMemberships/${GYM}`), {
        memberId: SOCIO_MEMBER,
        role: 'user',
      }),
    )
  })
})

describe('members — un socio no accede a datos de otro', () => {
  it('el socio NO puede leer el member doc de otro (por id arbitrario)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `gyms/${GYM}/members/otro`), {
        uid: 'otro-uid',
        email: 'otro@gymA.com',
        role: 'user',
        fullName: 'Otro',
        status: 'active',
      })
    })
    const db = asSocio()
    await assertFails(getDoc(doc(db, `gyms/${GYM}/members/otro`)))
  })

  it('el socio NO puede crear socios (eso es de admin)', async () => {
    const db = asSocio()
    await assertFails(
      setDoc(doc(db, `gyms/${GYM}/members/nuevo`), {
        uid: '',
        email: 'nuevo@gymA.com',
        role: 'user',
        fullName: 'Nuevo',
        status: 'active',
      }),
    )
  })

  it('el socio SÍ puede editar sus propios datos (fullName)', async () => {
    const db = asSocio()
    await assertSucceeds(
      updateDoc(doc(db, `gyms/${GYM}/members/${SOCIO_MEMBER}`), { fullName: 'Rodrigo Actualizado' }),
    )
  })

  it('el socio NO puede auto-cambiarse el role a admin vía self-edit', async () => {
    const db = asSocio()
    await assertFails(
      updateDoc(doc(db, `gyms/${GYM}/members/${SOCIO_MEMBER}`), { role: 'admin' }),
    )
  })
})

describe('aislamiento entre gyms', () => {
  it('el admin del gym A NO puede escribir productos del gym B', async () => {
    const db = asAdmin()
    await assertFails(
      setDoc(doc(db, `gyms/${OTHER_GYM}/products/p1`), {
        name: 'Proteína',
        description: 'x',
        photoURL: 'data:image/webp;base64,AAAA',
        price: 1000,
        discountPct: 0,
        available: true,
      }),
    )
  })

  it('el admin del gym A NO puede tocar la subscription del gym B', async () => {
    const db = asAdmin()
    await assertFails(
      updateDoc(doc(db, `gyms/${OTHER_GYM}`), {
        subscription: { planId: 'tier-premium', monthlyCost: 0, status: 'active' },
      }),
    )
  })
})

describe('products — validación de forma', () => {
  it('rechaza precio 0', async () => {
    const db = asAdmin()
    await assertFails(
      setDoc(doc(db, `gyms/${GYM}/products/p1`), {
        name: 'Gratis',
        description: 'x',
        photoURL: 'data:image/webp;base64,AAAA',
        price: 0,
        discountPct: 0,
        available: true,
      }),
    )
  })

  it('rechaza descuento > 100', async () => {
    const db = asAdmin()
    await assertFails(
      setDoc(doc(db, `gyms/${GYM}/products/p1`), {
        name: 'Producto',
        description: 'x',
        photoURL: 'data:image/webp;base64,AAAA',
        price: 1000,
        discountPct: 120,
        available: true,
      }),
    )
  })

  it('acepta un producto válido del admin', async () => {
    const db = asAdmin()
    await assertSucceeds(
      setDoc(doc(db, `gyms/${GYM}/products/p1`), {
        name: 'Proteína',
        description: 'Sabor vainilla',
        photoURL: 'data:image/webp;base64,AAAA',
        price: 45000,
        discountPct: 10,
        available: true,
      }),
    )
  })
})

// Sanity: el módulo importó bien (falla temprano si el emulador no está arriba).
it('el entorno de test se inicializó', () => {
  assert.ok(testEnv)
})
