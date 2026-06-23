export function normalizeEmailKey(email: string): string {
  return email.trim().toLowerCase()
}

function slug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

export function tenantEmailDomain(gymName: string): string {
  return `${slug(gymName) || 'gimnasio'}.com`
}

export function splitFullName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  return { first: parts[0] ?? '', last: parts.length > 1 ? parts[parts.length - 1] : '' }
}

export function loginEmailCandidates(fullName: string, gymName: string): string[] {
  const { first, last } = splitFullName(fullName)
  const cleanFirst = slug(first)
  const cleanLast = slug(last)
  const domain = tenantEmailDomain(gymName)
  const base =
    cleanFirst && cleanLast
      ? [`${cleanFirst[0]}${cleanLast}`, `${cleanFirst}${cleanLast}`]
      : [cleanFirst || cleanLast || 'socio']
  return Array.from(new Set(base)).map((local) => `${local}@${domain}`)
}

export function suggestLoginEmail(
  fullName: string,
  gymName: string,
  existingEmails: string[],
): string {
  const used = new Set(existingEmails.map(normalizeEmailKey))
  const candidates = loginEmailCandidates(fullName, gymName)
  const available = candidates.find((email) => !used.has(normalizeEmailKey(email)))
  if (available) return available

  const first = candidates[0] ?? `socio@${tenantEmailDomain(gymName)}`
  const [local, domain] = first.split('@')
  for (let i = 1; i < 1000; i++) {
    const next = `${local}${i}@${domain}`
    if (!used.has(normalizeEmailKey(next))) return next
  }
  return first
}

export function emailLocalPart(email: string): string {
  return email.split('@')[0] ?? ''
}
