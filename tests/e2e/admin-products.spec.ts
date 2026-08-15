import { expect, test } from '@playwright/test'
import { loginAs, pageTitle } from './helpers'

/**
 * ABM de productos. El alta requiere subir una imagen real (canvas/WebP), que es
 * frágil headless — se testea abrir el modal + el flujo de edición (los productos
 * del seed ya traen una foto placeholder válida).
 */
test.describe('Admin · Productos', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin')
    await page.getByRole('link', { name: 'Productos' }).click()
    await expect(pageTitle(page, 'Productos')).toBeVisible()
  })

  test('lista los productos del seed', async ({ page }) => {
    await expect(page.getByText('Proteína Whey 1kg')).toBeVisible()
    await expect(page.getByText('Creatina monohidrato 300g')).toBeVisible()
  })

  test('abre el modal de nuevo producto con sus campos', async ({ page }) => {
    await page.getByRole('button', { name: 'Nuevo producto' }).click()
    const modal = page.getByRole('dialog', { name: 'Nuevo producto' })
    await expect(modal).toBeVisible()
    await expect(modal.getByLabel('Nombre')).toBeVisible()
    await expect(modal.getByLabel('Descripción')).toBeVisible()
    await expect(modal.getByLabel('Promoción (% de descuento)')).toBeVisible()
  })

  test('valida que el nombre es obligatorio', async ({ page }) => {
    await page.getByRole('button', { name: 'Nuevo producto' }).click()
    await page.getByRole('button', { name: 'Crear producto' }).click()
    // Sin foto ni nombre, el zod bloquea el submit y el modal sigue abierto.
    await expect(page.getByRole('dialog', { name: 'Nuevo producto' })).toBeVisible()
  })

  test('edita un producto existente', async ({ page }) => {
    await page.getByRole('button', { name: /Editar Proteína Whey/ }).click()
    const modal = page.getByRole('dialog', { name: 'Editar producto' })
    await expect(modal).toBeVisible()
    await modal.getByLabel('Nombre').fill('Proteína Whey 2kg')
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByText('Proteína Whey 2kg')).toBeVisible()
  })
})
