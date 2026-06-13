import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { WorkoutLog } from '@/types'
import { createLog, listLogs, removeLog, updateLog } from '@/services/logsService'
import { queryKeys } from './queryKeys'

export function useLogs(gymId: string, uid: string) {
  return useQuery({
    queryKey: queryKeys.logs(gymId, uid),
    queryFn: () => listLogs(gymId, uid),
    enabled: !!gymId && !!uid,
  })
}

export function useCreateLog(gymId: string, uid: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<WorkoutLog, 'id'>) => createLog(gymId, uid, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.logs(gymId, uid) }),
  })
}

export function useUpdateLog(gymId: string, uid: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ logId, data }: { logId: string; data: Partial<Omit<WorkoutLog, 'id'>> }) =>
      updateLog(gymId, uid, logId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.logs(gymId, uid) }),
  })
}

export function useRemoveLog(gymId: string, uid: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (logId: string) => removeLog(gymId, uid, logId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.logs(gymId, uid) }),
  })
}
