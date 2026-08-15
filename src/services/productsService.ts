import { orderBy } from 'firebase/firestore'
import type { Product } from '@/types'
import { env } from '@/config/env'
import * as demo from '@/demo/store'
import { addToCollection, getMany, removeOne, updateOne } from './firestore'
import { paths } from './paths'

export function listProducts(gymId: string) {
  if (env.demoMode) return demo.listProducts(gymId)
  return getMany<Product>(paths.products(gymId), orderBy('name'))
}

export function createProduct(gymId: string, data: Omit<Product, 'id'>) {
  if (env.demoMode) return demo.createProduct(gymId, data)
  return addToCollection(paths.products(gymId), data)
}

export function updateProduct(gymId: string, productId: string, data: Partial<Product>) {
  if (env.demoMode) return demo.updateProduct(gymId, productId, data)
  return updateOne(paths.product(gymId, productId), data)
}

export function removeProduct(gymId: string, productId: string) {
  if (env.demoMode) return demo.removeProduct(gymId, productId)
  return removeOne(paths.product(gymId, productId))
}
