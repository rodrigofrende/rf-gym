import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Product } from '@/types'
import {
  createProduct,
  listProducts,
  removeProduct,
  updateProduct,
} from '@/services/productsService'
import { queryKeys } from './queryKeys'

export function useProducts(gymId: string) {
  return useQuery({
    queryKey: queryKeys.products(gymId),
    queryFn: () => listProducts(gymId),
    enabled: !!gymId,
    staleTime: 60_000,
  })
}

export function useCreateProduct(gymId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Product, 'id'>) => createProduct(gymId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.products(gymId) }),
  })
}

export function useUpdateProduct(gymId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: Partial<Product> }) =>
      updateProduct(gymId, productId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.products(gymId) }),
  })
}

export function useRemoveProduct(gymId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (productId: string) => removeProduct(gymId, productId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.products(gymId) }),
  })
}
