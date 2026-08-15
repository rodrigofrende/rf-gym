import { expect, test } from '@playwright/test'
import { loginAs, pageTitle } from './helpers'

/**
 * Tienda del socio + ranking. Se navega por los links del sidebar (client-side)
 * para no recargar y perder la identidad de socio. Rodrigo está "al día" en el
 * seed (fechas relativas), así que no cae en el gate de pago.
 */
test.describe('Socio · Tienda y carrito', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'socio')
    await page.getByRole('link', { name: 'Tienda' }).click()
    await expect(pageTitle(page, 'Tienda')).toBeVisible()
  })

  test('muestra solo productos disponibles', async ({ page }) => {
    await expect(page.getByText('Proteína Whey 1kg')).toBeVisible()
    // "Toalla de entrenamiento" está seedeada como no disponible → oculta.
    await expect(page.getByText('Toalla de entrenamiento')).toHaveCount(0)
  })

  test('agrega un producto y abre el pedido con total y CTA', async ({ page }) => {
    await page.getByRole('button', { name: 'Agregar' }).first().click()
    const verPedido = page.getByRole('button', { name: /Ver pedido/ })
    await expect(verPedido).toBeVisible()
    await verPedido.click()
    const modal = page.getByRole('dialog', { name: 'Tu pedido' })
    await expect(modal.getByText('Total')).toBeVisible()
    await expect(modal.getByRole('button', { name: 'Pedir por WhatsApp' })).toBeVisible()
  })
})

test.describe('Socio · Ranking', () => {
  test('muestra el ranking con la fila propia y el podio', async ({ page }) => {
    await loginAs(page, 'socio')
    await page.getByRole('link', { name: 'Ranking' }).click()
    await expect(pageTitle(page, 'Ranking')).toBeVisible()
    // El seed pone a Rodrigo F. en el puesto 12 (fila pinneada) y a Juan P. #1.
    await expect(page.getByText('Rodrigo F.').first()).toBeVisible()
    await expect(page.getByText('Juan P.').first()).toBeVisible()
  })
})
