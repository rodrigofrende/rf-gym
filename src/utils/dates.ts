import { Timestamp } from 'firebase/firestore'
import type { DateValue } from '@/types'

/** Helpers de buckets por mes/semana para las series del dashboard. */

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}`
}

/** Últimos `n` meses (incluido el actual), del más viejo al más nuevo. */
export function lastNMonths(n: number, from = new Date()): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(from.getFullYear(), from.getMonth() - i, 1)
    out.push({ key: monthKey(d), label: MONTHS_SHORT[d.getMonth()] })
  }
  return out
}

/** Lunes (00:00) de la semana de `d`. */
export function startOfWeek(d: Date): Date {
  const x = new Date(d)
  const offset = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - offset)
  x.setHours(0, 0, 0, 0)
  return x
}

export function weekKey(d: Date): string {
  return startOfWeek(d).toISOString().slice(0, 10)
}

/** Últimas `n` semanas (incluida la actual), del más viejo al más nuevo. */
export function lastNWeeks(n: number, from = new Date()): { key: string; label: string }[] {
  const monday = startOfWeek(from)
  const out: { key: string; label: string }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(monday)
    d.setDate(d.getDate() - i * 7)
    out.push({ key: d.toISOString().slice(0, 10), label: `${d.getDate()}/${d.getMonth() + 1}` })
  }
  return out
}

/** Parsea YYYY-MM-DD a Date local a mediodía (evita saltos por timezone). */
export function parseDateInput(value: string): Date {
  return new Date(`${value}T12:00:00`)
}

/** Convierte input YYYY-MM-DD a Timestamp de Firestore. */
export function dateInputToTimestamp(value?: string): Timestamp | null {
  if (!value) return null
  return Timestamp.fromDate(parseDateInput(value))
}

/** Fecha de hoy como YYYY-MM-DD en hora local. */
export function todayDateInput(): string {
  const d = new Date()
  return localDayKey(d)
}

/** Fecha como YYYY-MM-DD en hora local. */
export function localDayKey(date: Date): string {
  const d = date
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Normaliza DateValue a Date local a mediodía para comparaciones. */
export function toLocalDate(value: DateValue | undefined): Date | null {
  if (!value) return null
  const d = value instanceof Timestamp ? value.toDate() : value instanceof Date ? value : null
  if (!d) return null
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0)
}

export function dayKeyFromDateValue(value: DateValue | undefined): string | null {
  const date = toLocalDate(value)
  return date ? localDayKey(date) : null
}
