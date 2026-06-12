import { orderBy } from 'firebase/firestore'
import type { Tariff } from '@/types'
import { env } from '@/config/env'
import * as demo from '@/demo/store'
import { addToCollection, getMany, removeOne, updateOne } from './firestore'
import { paths } from './paths'

export function listTariffs(gymId: string) {
  if (env.demoMode) return demo.listTariffs(gymId)
  return getMany<Tariff>(paths.tariffs(gymId), orderBy('name'))
}

export function createTariff(gymId: string, data: Omit<Tariff, 'id'>) {
  if (env.demoMode) return demo.createTariff(gymId, data)
  return addToCollection(paths.tariffs(gymId), data)
}

export function updateTariff(gymId: string, tariffId: string, data: Partial<Tariff>) {
  if (env.demoMode) return demo.updateTariff(gymId, tariffId, data)
  return updateOne(paths.tariff(gymId, tariffId), data)
}

export function removeTariff(gymId: string, tariffId: string) {
  if (env.demoMode) return demo.removeTariff(gymId, tariffId)
  return removeOne(paths.tariff(gymId, tariffId))
}
