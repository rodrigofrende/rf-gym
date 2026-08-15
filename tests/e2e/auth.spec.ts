import { expect, test } from '@playwright/test'
import { loginAs, pageTitle } from './helpers'

test.describe('Login por rol (demo)', () => {
  test('admin entra a Socios', async ({ page }) => {
    await loginAs(page, 'admin')
    await expect(pageTitle(page, 'Socios')).toBeVisible()
  })

  test('super-admin entra a Gimnasios', async ({ page }) => {
    await loginAs(page, 'superadmin')
    await expect(pageTitle(page, 'Gimnasios')).toBeVisible()
  })

  test('socio entra a sus rutinas (al día, sin bloqueo)', async ({ page }) => {
    await loginAs(page, 'socio')
    await expect(pageTitle(page, 'Mis rutinas')).toBeVisible()
  })
})

test.describe('Seguridad de navegación', () => {
  test('el socio no ve las secciones de admin en su menú', async ({ page }) => {
    await loginAs(page, 'socio')
    // El nav del socio (USER_NAV) no incluye rutas de gestión.
    await expect(page.getByRole('link', { name: 'Socios' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Tarifas' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Marca' })).toHaveCount(0)
    // Sí ve las suyas.
    await expect(page.getByRole('link', { name: 'Tienda' })).toBeVisible()
  })
})
