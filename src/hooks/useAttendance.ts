import { useCallback, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { env } from '@/config/env'
import type { Attendance } from '@/types'
import {
  checkInMember,
  getMemberAttendance,
  listMemberAttendanceForMonth,
  listTodayAttendance,
  subscribeTodayAttendance,
} from '@/services/attendanceService'
import { localDayKey } from '@/utils/dates'
import { queryKeys } from './queryKeys'

export function useCheckIn(gymId: string, memberId: string) {
  const qc = useQueryClient()
  const dayKey = localDayKey(new Date())
  return useMutation({
    mutationFn: () => checkInMember(gymId, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.attendanceToday(gymId, dayKey) })
      qc.invalidateQueries({ queryKey: queryKeys.memberAttendance(gymId, memberId, dayKey) })
    },
  })
}

export function useMemberAttendance(gymId: string, memberId: string, dayKey = localDayKey(new Date())) {
  return useQuery({
    queryKey: queryKeys.memberAttendance(gymId, memberId, dayKey),
    queryFn: () => getMemberAttendance(gymId, memberId, dayKey),
    enabled: !!gymId && !!memberId,
  })
}

/** Asistencias del socio en un mes (year + monthIndex 0-based). */
export function useMemberMonthAttendance(
  gymId: string,
  memberId: string,
  year: number,
  monthIndex: number,
) {
  return useQuery({
    queryKey: queryKeys.memberMonthAttendance(gymId, memberId, `${year}-${monthIndex}`),
    queryFn: () => listMemberAttendanceForMonth(gymId, memberId, year, monthIndex),
    enabled: !!gymId && !!memberId,
    staleTime: 60_000,
  })
}

export function useTodayAttendance(gymId: string, dayKey = localDayKey(new Date())) {
  const fallback = useQuery({
    queryKey: queryKeys.attendanceToday(gymId, dayKey),
    queryFn: () => listTodayAttendance(gymId, dayKey),
    enabled: env.demoMode && !!gymId,
  })

  const [data, setData] = useState<Attendance[]>([])
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(!env.demoMode)
  const [isFetching, setIsFetching] = useState(false)

  const refetch = useCallback(async () => {
    if (!gymId) return
    setIsFetching(true)
    try {
      const next = await listTodayAttendance(gymId, dayKey)
      setData(next)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('attendance-refetch-failed'))
    } finally {
      setIsFetching(false)
      setIsLoading(false)
    }
  }, [dayKey, gymId])

  useEffect(() => {
    if (env.demoMode || !gymId) return
    return subscribeTodayAttendance(
      gymId,
      dayKey,
      (next) => {
        setData(next)
        setIsLoading(false)
      },
      (err) => {
        setError(err)
        setIsLoading(false)
      },
    )
  }, [dayKey, gymId])

  if (env.demoMode) return fallback
  return { data, error, isLoading, isFetching, isError: !!error, refetch }
}
