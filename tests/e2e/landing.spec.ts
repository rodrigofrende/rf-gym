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
    await expect(page.getByRole('heading', { name: 'Poné tu gimnasio en forma.' })).toBeVisible()
  })

  test('muestra el hero y el botón de ingreso', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Ingresar' }).first()).toBeVisible()
    await expect(page.getByText('Software de gestión para gimnasios').first()).toBeVisible()
  })

  test('el CTA principal abre el menú de contacto por email, no WhatsApp', async ({ page }) => {
    const cta = page.getByRole('button', { name: /Quiero RF FIT en mi gimnasio/ }).first()
    await expect(cta).toBeVisible()
    await cta.click()
    // El menú da opciones (no fuerza el cliente por defecto del SO) y muestra la dirección.
    await expect(page.getByRole('menuitem', { name: 'Abrir en Gmail' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Abrir en mi app de correo' })).toBeVisible()
    await expect(page.getByText('hola@rf-platform.com').first()).toBeVisible()
    // Ya no debe quedar ningún link a WhatsApp en la landing.
    await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0)
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
