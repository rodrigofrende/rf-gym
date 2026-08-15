import { expect, test } from '@playwright/test'
import { gotoSpa, logout } from './helpers'

/**
 * La landing solo se ve deslogueado. En demo la app arranca como admin y
 * cualquier recarga resetea a admin, así que: se cierra sesión (client-side →
 * /login) y se navega a `/` por History API (sin recargar) para que
 * HomeRedirect, sin usuario, renderice la landing.
 */
test.describe('Landing pública', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await logout(page)
    await gotoSpa(page, '/')
    await expect(page.getByRole('heading', { name: 'Entrená tu gimnasio.' })).toBeVisible()
  })

  test('muestra el hero y el botón de ingreso', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Ingresar' }).first()).toBeVisible()
    await expect(page.getByText('Software de gestión para gimnasios').first()).toBeVisible()
  })

  test('lista los 3 planes con "A medida" y "Recomendado"', async ({ page }) => {
    await expect(page.getByText('Entrada en Calor', { exact: true })).toBeVisible()
    await expect(page.getByText('Ritmo', { exact: true })).toBeVisible()
    await expect(page.getByText('Alto Rendimiento', { exact: true })).toBeVisible()
    await expect(page.getByText('A medida').first()).toBeVisible()
    await expect(page.getByText('Recomendado')).toBeVisible()
  })

  test('muestra la sección de clientes con TigerFit', async ({ page }) => {
    await expect(page.getByText('TigerFit', { exact: false }).first()).toBeVisible()
  })
})
